/**
 * PromptWithTests - A prompt with associated test cases
 */

import type { PromptBuilder } from "../PromptBuilder.js";
import type {
  TestCase,
  EvalResult,
  TestResults,
  TestRunOptions,
} from "./types.js";
import type { Executor, ExecutionResult } from "../executors/types.js";
import { match } from "./matchers.js";
import { generateExecutionId } from "../analytics/utils.js";

/**
 * A prompt with test cases attached
 * Created by calling .test() on a PromptBuilder
 */
export class PromptWithTests {
  constructor(
    private prompt: PromptBuilder,
    private testCases: TestCase[],
    private defaultExecutor?: Executor,
  ) {}

  /**
   * Run all test cases with the provided executor
   *
   * @param options - Test run options including executor
   * @returns Aggregated test results
   *
   * @example
   * ```typescript
   * const results = await weatherAgent.run({
   *   executor: createVercelAIExecutor({ model: openai('gpt-4') })
   * })
   * console.log(`${results.passed}/${results.total} tests passed`)
   * ```
   */
  async run(options?: TestRunOptions): Promise<TestResults> {
    const executorOrUndefined = options?.executor ?? this.defaultExecutor;
    if (!executorOrUndefined) {
      throw new Error(
        "No executor provided. Pass executor in run() options or in .test() constructor.",
      );
    }
    const executor: Executor = executorOrUndefined;

    const startTime = Date.now();
    const results: EvalResult[] = [];

    // Run tests sequentially or with concurrency
    const concurrency = options?.concurrency ?? 1;

    if (concurrency === 1) {
      // Sequential execution
      for (const testCase of this.testCases) {
        const result = await this.runSingle(testCase, executor);
        results.push(result);

        if (options?.bail && !result.passed) {
          break;
        }
      }
    } else {
      // Parallel execution with concurrency limit
      const chunks: TestCase[][] = [];
      for (let i = 0; i < this.testCases.length; i += concurrency) {
        chunks.push(this.testCases.slice(i, i + concurrency));
      }

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((tc) => this.runSingle(tc, executor)),
        );
        results.push(...chunkResults);

        if (options?.bail && chunkResults.some((r) => !r.passed)) {
          break;
        }
      }
    }

    return {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      duration: Date.now() - startTime,
      results,
    };
  }

  /**
   * Run a single test case
   *
   * @param testCase - Test case to run
   * @param executor - Executor to use
   * @returns Evaluation result
   */
  async runSingle(
    testCase: TestCase,
    executor: Executor,
  ): Promise<EvalResult> {
    const startTime = Date.now();
    const executionId = generateExecutionId();

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
}

