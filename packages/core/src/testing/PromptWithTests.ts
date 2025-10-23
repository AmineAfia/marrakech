/**
 * PromptWithTests - A prompt with associated test cases
 */

import type { PromptBuilder } from "../PromptBuilder.js";
import type {
  TestCase,
  EvalResult,
  TestResults,
  TestRunOptions,
  ExecutorMetadata,
} from "./types.js";
import type {
  Executor,
  ExecutionResult,
  ExecutorConfig,
} from "../executors/types.js";
import type { Message } from "../types.js";
import { match } from "./matchers.js";
import { generateExecutionId } from "../analytics/utils.js";
import { AnalyticsClient } from "../analytics/AnalyticsClient.js";
import {
  generatePromptId,
  generateTestRunId,
  generateTestCaseId,
  getCurrentTimestamp,
} from "../analytics/utils.js";
import { createVercelAIExecutor } from "../executors/index.js";

/**
 * Extract model name from executor config for display
 */
function extractModelName(model: unknown): string {
  if (!model) return "unknown";

  // Check for modelId property (common in AI SDK models)
  if (typeof model === "object" && model !== null && "modelId" in model) {
    return String((model as { modelId: unknown }).modelId);
  }

  // Check for model property
  if (typeof model === "object" && model !== null && "model" in model) {
    return String((model as { model: unknown }).model);
  }

  // Fallback to string representation
  const str = String(model);
  return str.includes("[object") ? "unknown" : str;
}

/**
 * A prompt with test cases attached
 * Created by calling .test() on a PromptBuilder
 */
export class PromptWithTests {
  constructor(
    private prompt: PromptBuilder,
    private testCases: TestCase[],
    private executorConfigs: ExecutorConfig[],
  ) {}

  /**
   * Run all test cases with all executors
   *
   * @param options - Test run options
   * @returns Aggregated test results
   *
   * @example
   * ```typescript
   * const results = await weatherAgent.run()
   * console.log(`${results.passed}/${results.total} tests passed`)
   * ```
   */
  async run(options?: TestRunOptions): Promise<TestResults> {
    // Use provided executors or fall back to constructor executors
    const executorConfigsToUse = options?.executors ?? this.executorConfigs;

    if (!executorConfigsToUse || executorConfigsToUse.length === 0) {
      throw new Error(
        "No executors provided. Pass executors in .test() or run() options.",
      );
    }

    const startTime = Date.now();
    const allResults: EvalResult[] = [];
    const executorResults: Record<
      string,
      {
        passed: number;
        failed: number;
        results: EvalResult[];
      }
    > = {};

    // Generate IDs for analytics
    const testRunId = generateTestRunId();
    const toolNames = this.prompt.toolsList.map(
      (t) => (t as { name?: string }).name || "unnamed",
    );
    const promptId = generatePromptId(this.prompt.systemPrompt, toolNames);

    // Create executor instances with metadata
    const executors = executorConfigsToUse.map((config) => ({
      config,
      executor: createVercelAIExecutor(config),
      name: extractModelName(config.model),
      metadata: {
        model: extractModelName(config.model),
        config,
      } as ExecutorMetadata,
    }));

    // Initialize executor results
    for (const { name } of executors) {
      executorResults[name] = { passed: 0, failed: 0, results: [] };
    }

    // Run tests sequentially, but run all executors in parallel for each test
    for (let index = 0; index < this.testCases.length; index++) {
      const testCase = this.testCases[index];

      // Fire test-start progress event
      options?.onProgress?.({
        type: "test-start",
        data: {
          current: index + 1,
          total: this.testCases.length,
          input: testCase.input,
        },
      });

      options?.onTestStart?.(testCase);

      // Run all executors in parallel for this test case
      const executorResultsForTest = await Promise.all(
        executors.map(({ executor, config, metadata }) =>
          this.runSingle(testCase, executor, config, metadata),
        ),
      );

      // Process results from all executors
      for (let i = 0; i < executorResultsForTest.length; i++) {
        const result = executorResultsForTest[i];
        const executorName = executors[i].name;

        allResults.push(result);
        executorResults[executorName].results.push(result);

        if (result.passed) {
          executorResults[executorName].passed++;
        } else {
          executorResults[executorName].failed++;
        }

        options?.onTestComplete?.(result);

        // Fire test-complete progress event
        options?.onProgress?.({
          type: "test-complete",
          data: result,
        });

        // Track individual test case (fire-and-forget, non-blocking)
        this.trackTestCaseResult(result, testRunId, promptId);
      }

      if (options?.bail && executorResultsForTest.some((r) => !r.passed)) {
        break;
      }
    }

    const finalResults: TestResults = {
      total: allResults.length,
      passed: allResults.filter((r) => r.passed).length,
      failed: allResults.filter((r) => !r.passed).length,
      duration: Date.now() - startTime,
      results: allResults,
      executorResults,
    };

    // Track test run (fire-and-forget, non-blocking)
    this.trackTestRunResult(finalResults, testRunId, promptId);

    return finalResults;
  }

  /**
   * Run a single test case with a specific executor
   *
   * @param testCase - Test case to run
   * @param executor - Executor to use
   * @param config - Executor configuration
   * @param metadata - Optional executor metadata
   * @returns Evaluation result
   */
  async runSingle(
    testCase: TestCase,
    executor: Executor,
    config: ExecutorConfig,
    metadata?: ExecutorMetadata,
  ): Promise<EvalResult> {
    const startTime = Date.now();
    const executionId = generateExecutionId();

    // Build metadata if not provided
    const executorMetadata = metadata ?? {
      model: extractModelName(config.model),
      config,
    };

    try {
      // Execute with timeout
      const timeout = testCase.timeout ?? 30000;
      const executionResult = (await Promise.race([
        executor(this.prompt, testCase.input),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Test timeout")), timeout),
        ),
      ])) as ExecutionResult;

      // Check if execution succeeded
      if (executionResult.finishReason === "error") {
        return {
          input: testCase.input,
          output: null,
          duration: Date.now() - startTime,
          passed: false,
          execution_id: executionId,
          error: executionResult.error,
          expected: testCase.expect,
          steps: executionResult.steps,
          executor: executorMetadata,
        };
      }

      // Run assertions if expected value provided
      let passed = true;
      if (testCase.expect !== undefined) {
        passed = match(executionResult.output, testCase.expect);
      }

      return {
        input: testCase.input,
        output: executionResult.output,
        duration: Date.now() - startTime,
        passed,
        execution_id: executionId,
        expected: testCase.expect,
        steps: executionResult.steps,
        executor: executorMetadata,
      };
    } catch (error) {
      return {
        input: testCase.input,
        output: null,
        duration: Date.now() - startTime,
        passed: false,
        execution_id: executionId,
        error: error instanceof Error ? error.message : String(error),
        expected: testCase.expect,
        executor: executorMetadata,
      };
    }
  }

  /**
   * Get the test cases
   */
  getTestCases(): TestCase[] {
    return this.testCases;
  }

  /**
   * Get the underlying prompt
   */
  getPrompt(): PromptBuilder {
    return this.prompt;
  }

  /**
   * Convert to Vercel AI SDK format
   * Delegates to the underlying PromptBuilder
   *
   * @param messages - Array of conversation messages
   * @returns Vercel AI SDK compatible format with messages, tools, and responseFormat
   *
   * @example
   * ```typescript
   * const myPrompt = prompt('Assistant')
   *   .tool(searchTool)
   *   .test([...], executor);
   *
   * const { messages, tools } = myPrompt.toVercelAI([
   *   { role: 'user', content: 'Hello' }
   * ]);
   * ```
   */
  toVercelAI(messages: Message[] = []): {
    messages: Message[];
    tools?: Record<
      string,
      {
        description: string;
        parameters: import("zod").ZodType;
        inputSchema: import("zod").ZodType;
        execute?: (input: unknown, context?: unknown) => Promise<unknown>;
      }
    >;
    responseFormat?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    return this.prompt.toVercelAI(messages);
  }

  /**
   * Convert to OpenAI format
   * Delegates to the underlying PromptBuilder
   *
   * @param messages - Array of conversation messages
   * @returns OpenAI API compatible format with messages, tools, and response_format
   *
   * @example
   * ```typescript
   * const myPrompt = prompt('Assistant')
   *   .tool(searchTool)
   *   .test([...], executor);
   *
   * const { messages, tools } = myPrompt.toOpenAI([
   *   { role: 'user', content: 'Hello' }
   * ]);
   * ```
   */
  toOpenAI(messages: Message[] = []): {
    messages: Message[];
    tools?: Array<{ name: string; description: string; parameters: object }>;
    response_format?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    return this.prompt.toOpenAI(messages);
  }

  /**
   * Convert to Anthropic format
   * Delegates to the underlying PromptBuilder
   *
   * @returns Anthropic API compatible format with system prompt and tools
   *
   * @example
   * ```typescript
   * const myPrompt = prompt('Assistant')
   *   .tool(searchTool)
   *   .test([...], executor);
   *
   * const { system, tools } = myPrompt.toAnthropic();
   * ```
   */
  toAnthropic(): {
    system: string;
    tools?: Array<{ name: string; description: string; parameters: object }>;
  } {
    return this.prompt.toAnthropic();
  }

  /**
   * Track test run analytics (fire-and-forget, non-blocking)
   */
  private trackTestRunResult(
    results: TestResults,
    testRunId: string,
    promptId: string,
  ): void {
    try {
      const analyticsClient = AnalyticsClient.getInstance();

      // Detect environment
      const environment = process.env.CI
        ? "ci"
        : process.env.NODE_ENV === "production"
          ? "production"
          : "local";

      analyticsClient.trackTestRun({
        test_run_id: testRunId,
        prompt_id: promptId,
        prompt_name: `prompt_${promptId.substring(0, 8)}`,
        total_tests: results.total,
        passed_tests: results.passed,
        failed_tests: results.failed,
        duration_ms: results.duration,
        timestamp: getCurrentTimestamp(),
        environment,
        git_commit: process.env.GIT_COMMIT || process.env.GITHUB_SHA,
        account_id: "", // Filled by backend
        organization_id: "", // Filled by backend
      });
    } catch (error) {
      // Silently ignore analytics errors - never break test execution
    }
  }

  /**
   * Track individual test case analytics (fire-and-forget, non-blocking)
   */
  private trackTestCaseResult(
    result: EvalResult,
    testRunId: string,
    promptId: string,
  ): void {
    try {
      const analyticsClient = AnalyticsClient.getInstance();

      analyticsClient.trackTestCase({
        test_case_id: generateTestCaseId(),
        test_run_id: testRunId,
        prompt_id: promptId,
        input: result.input,
        expected_output:
          result.expected !== undefined ? JSON.stringify(result.expected) : "",
        actual_output:
          result.output !== null ? JSON.stringify(result.output) : "",
        passed: result.passed,
        duration_ms: result.duration,
        execution_id: result.execution_id,
        error_message: result.error,
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      // Silently ignore analytics errors - never break test execution
    }
  }
}

