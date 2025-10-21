import type { z } from "zod";
import type { ToolFunction, OutputFormat, Message } from "./types.js";
import { extractToolMetadata } from "./tools/tool.js";
import { zodToJsonSchema } from "./schema/zodToJsonSchema.js";
import { AnalyticsClient } from "./analytics/AnalyticsClient.js";
import {
  generatePromptId,
  generateExecutionId,
  generateSessionId,
  generateToolCallId,
  estimateTokens,
  estimateCost,
  getCurrentTimestamp,
} from "./analytics/utils.js";
import { normalizeMessage } from "./utils/messageUtils.js";
import type { TestCase, EvalOptions, EvalResult } from "./testing/types.js";
import type { Executor } from "./executors/types.js";
import { PromptWithTests } from "./testing/PromptWithTests.js";

export class PromptBuilder {
  public systemPrompt: string;
  public tools: ToolFunction[] = [];
  public outputFormat?: OutputFormat;
  private sessionId: string;
  private analyticsClient: AnalyticsClient;
  private static trackedPrompts = new Set<string>();

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || "";
    this.sessionId = generateSessionId();
    this.analyticsClient = AnalyticsClient.getInstance();
  }

  /**
   * Set the system prompt
   */
  system(text: string): this {
    if (this.systemPrompt) {
      this.systemPrompt += `\n${text}`;
    } else {
      this.systemPrompt = text;
    }
    return this;
  }

  /**
   * Add tools (variadic)
   */
  tool(...tools: ToolFunction[]): this {
    this.tools.push(...tools);
    return this;
  }

  /**
   * Set structured JSON output with Zod schema
   */
  output(schema: z.ZodType): this {
    this.outputFormat = { type: "json", schema };
    return this;
  }

  /**
   * Track prompt metadata (called once per unique prompt)
   */
  private trackPromptMetadata(promptId: string): void {
    if (PromptBuilder.trackedPrompts.has(promptId)) return;
    PromptBuilder.trackedPrompts.add(promptId);

    this.analyticsClient.trackPromptMetadata({
      prompt_id: promptId,
      name: `prompt_${promptId.substring(0, 8)}`,
      description: this.systemPrompt.substring(0, 100),
      prompt_text: this.systemPrompt,
      version: "1.0",
      is_active: 1,
      account_id: "", // Filled by backend
      organization_id: "", // Filled by backend
      updated_at: getCurrentTimestamp(),
    });
  }

  /**
   * Track prompt execution
   */
  private trackPromptExecution(
    executionId: string,
    promptId: string,
    messages: Message[],
    model = "unknown",
  ): void {
    // Normalize messages to strings for token estimation
    const messageStrings = messages
      .map((msg) => normalizeMessage(msg))
      .join(" ");
    const requestTokens = estimateTokens(messageStrings);

    this.analyticsClient.trackPromptExecution({
      execution_id: executionId,
      prompt_id: promptId,
      session_id: this.sessionId,
      prompt_name: `prompt_${promptId.substring(0, 8)}`,
      prompt_version: "1.0",
      execution_time_ms: 0, // Will be updated by the calling method
      model: model,
      region: "unknown",
      request_tokens: requestTokens,
      response_tokens: 0, // Unknown at SDK level
      cost_usd: 0, // Unknown at SDK level
      status: "success",
      account_id: "", // Filled by backend
      organization_id: "", // Filled by backend
    });
  }

  /**
   * Get tools in OpenAI format (array)
   */
  private getToolsForAPI(): Array<{
    name: string;
    description: string;
    parameters: object;
  }> {
    return this.tools.map((tool) => {
      const metadata = extractToolMetadata(tool);
      return {
        name: (tool as { name?: string }).name || "unnamed",
        description: metadata.description,
        parameters: zodToJsonSchema(metadata.schema),
      };
    });
  }

  /**
   * Get tools in Vercel AI SDK format (record)
   * Supports both v4 (parameters) and v5 (inputSchema) for compatibility
   */
  private getToolsForVercelAI(
    executionId: string,
    promptId: string,
  ): Record<
    string,
    {
      description: string;
      parameters: z.ZodType; // v4 compatibility
      inputSchema: z.ZodType; // v5 compatibility
      execute?: (input: unknown, context?: unknown) => Promise<unknown>;
    }
  > {
    const tools: Record<
      string,
      {
        description: string;
        parameters: z.ZodType;
        inputSchema: z.ZodType;
        execute?: (input: unknown, context?: unknown) => Promise<unknown>;
      }
    > = {};
    const usedNames = new Set<string>();

    for (const tool of this.tools) {
      const metadata = extractToolMetadata(tool);
      let name = (tool as { name?: string }).name || "unnamed";

      // Ensure unique names by adding a counter if needed
      if (usedNames.has(name)) {
        let counter = 1;
        let uniqueName = `${name}_${counter}`;
        while (usedNames.has(uniqueName)) {
          counter++;
          uniqueName = `${name}_${counter}`;
        }
        name = uniqueName;
      }

      usedNames.add(name);
      tools[name] = {
        description: metadata.description,
        parameters: metadata.schema, // ✅ v4: Return raw Zod schema
        inputSchema: metadata.schema, // ✅ v5: Return raw Zod schema
        execute: this.wrapToolExecution(
          tool.execute,
          name,
          executionId,
          promptId,
        ),
      };
    }

    return tools;
  }

  /**
   * Wrap tool execution with analytics tracking
   */
  private wrapToolExecution(
    originalExecute: ((...args: unknown[]) => Promise<unknown>) | undefined,
    toolName: string,
    executionId: string,
    promptId: string,
  ): ((...args: unknown[]) => Promise<unknown>) | undefined {
    if (!originalExecute) return undefined;

    return async (...args: unknown[]) => {
      const context = args[1] as { toolCallId?: string } | undefined;
      const startTime = Date.now();
      const toolCallId = context?.toolCallId || generateToolCallId();

      try {
        const result = await originalExecute(...args);

        // Track successful execution
        this.analyticsClient.trackToolCall({
          tool_call_id: toolCallId,
          execution_id: executionId,
          prompt_id: promptId,
          tool_name: toolName,
          execution_time_ms: Date.now() - startTime,
          input_tokens: estimateTokens(JSON.stringify(args)),
          output_tokens: estimateTokens(JSON.stringify(result)),
          cost_usd: estimateCost(
            "unknown",
            estimateTokens(JSON.stringify(args)),
            estimateTokens(JSON.stringify(result)),
          ),
          status: "success",
          tool_call_timestamp: getCurrentTimestamp(),
        });

        return result;
      } catch (error) {
        // Track failed execution
        this.analyticsClient.trackToolCall({
          tool_call_id: toolCallId,
          execution_id: executionId,
          prompt_id: promptId,
          tool_name: toolName,
          execution_time_ms: Date.now() - startTime,
          input_tokens: estimateTokens(JSON.stringify(args)),
          output_tokens: 0,
          cost_usd: 0,
          status: "error",
          error_message: error instanceof Error ? error.message : String(error),
          tool_call_timestamp: getCurrentTimestamp(),
        });

        throw error; // Preserve original behavior
      }
    };
  }

  /**
   * Get response format for OpenAI
   */
  private getResponseFormat():
    | {
        type: "json_schema";
        json_schema: { name: string; strict: boolean; schema: object };
      }
    | undefined {
    if (
      !this.outputFormat ||
      this.outputFormat.type !== "json" ||
      !this.outputFormat.schema
    ) {
      return undefined;
    }

    return {
      type: "json_schema" as const,
      json_schema: {
        name: "response",
        strict: true,
        schema: zodToJsonSchema(this.outputFormat.schema),
      },
    };
  }

  /**
   * Convert to Vercel AI SDK format
   */
  toVercelAI(messages: Message[] = []): {
    messages: Message[];
    tools?: Record<
      string,
      {
        description: string;
        parameters: z.ZodType; // v4 compatibility
        inputSchema: z.ZodType; // v5 compatibility
        execute?: (input: unknown, context?: unknown) => Promise<unknown>;
      }
    >;
    responseFormat?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    const executionId = generateExecutionId();
    const toolNames = this.tools.map(
      (tool) => (tool as { name?: string }).name || "unnamed",
    );
    const promptId = generatePromptId(this.systemPrompt, toolNames);

    // Track prompt metadata (once per unique prompt)
    this.trackPromptMetadata(promptId);

    // Track prompt execution
    this.trackPromptExecution(executionId, promptId, messages);

    const systemMessage: Message = {
      role: "system",
      content: this.systemPrompt,
    };

    // Add output format instructions if schema is defined
    if (this.outputFormat?.type === "json" && this.outputFormat.schema) {
      const jsonSchema = zodToJsonSchema(this.outputFormat.schema);
      systemMessage.content += `\n\n<output_format>
Respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}
</output_format>`;
    }

    const allMessages = [systemMessage, ...messages];
    const tools = this.getToolsForVercelAI(executionId, promptId);

    return {
      messages: allMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined
    };
  }

  /**
   * Convert to OpenAI format
   */
  toOpenAI(messages: Message[] = []): {
    messages: Message[];
    tools?: Array<{ name: string; description: string; parameters: object }>;
    response_format?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    const executionId = generateExecutionId();
    const toolNames = this.tools.map(
      (tool) => (tool as { name?: string }).name || "unnamed",
    );
    const promptId = generatePromptId(this.systemPrompt, toolNames);

    // Track prompt metadata (once per unique prompt)
    this.trackPromptMetadata(promptId);

    // Track prompt execution
    this.trackPromptExecution(executionId, promptId, messages);

    const systemMessage: Message = {
      role: "system",
      content: this.systemPrompt,
    };

    const allMessages = [systemMessage, ...messages];
    const tools = this.getToolsForAPI();
    const response_format = this.getResponseFormat();

    return {
      messages: allMessages,
      tools: tools.length > 0 ? tools : undefined,
      response_format,
    };
  }

  /**
   * Convert to Anthropic format
   */
  toAnthropic(): {
    system: string;
    tools?: Array<{ name: string; description: string; parameters: object }>;
  } {
    const executionId = generateExecutionId();
    const toolNames = this.tools.map(
      (tool) => (tool as { name?: string }).name || "unnamed",
    );
    const promptId = generatePromptId(this.systemPrompt, toolNames);

    // Track prompt metadata (once per unique prompt)
    this.trackPromptMetadata(promptId);

    // Track prompt execution (no messages for Anthropic)
    this.trackPromptExecution(executionId, promptId, []);

    let systemPrompt = this.systemPrompt;

    // Add output format instructions for Anthropic (no native structured outputs)
    if (
      this.outputFormat &&
      this.outputFormat.type === "json" &&
      this.outputFormat.schema
    ) {
      const jsonSchema = zodToJsonSchema(this.outputFormat.schema);
      systemPrompt += `\n\n<output_format>
Respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}
</output_format>`;
    }

    const tools = this.getToolsForAPI();

    return {
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
    };
  }

  /**
   * Define test cases for this prompt
   * @param cases - Array of test cases
   * @param executor - Optional default executor for running tests
   * @returns PromptWithTests instance
   *
   * @example
   * ```typescript
   * const weatherAgent = prompt('You are a weather assistant')
   *   .tool(getWeather)
   *   .test([
   *     { input: 'Weather in Paris?', expect: { city: 'Paris' } },
   *     { input: 'Is it raining in Tokyo?', expect: { city: 'Tokyo' } }
   *   ])
   * ```
   */
  test(cases: TestCase[], executor?: Executor): PromptWithTests {
    return new PromptWithTests(this, cases, executor);
  }

  /**
   * Run a single evaluation with this prompt
   * @param input - Input to test
   * @param options - Evaluation options including executor and expected output
   * @returns Evaluation result
   *
   * @example
   * ```typescript
   * const result = await prompt('Translate to French')
   *   .eval('Hello', {
   *     executor: createVercelAIExecutor({ model: openai('gpt-4') }),
   *     expect: 'Bonjour'
   *   })
   * ```
   */
  async eval(
    input: string,
    options: EvalOptions & { executor: Executor },
  ): Promise<EvalResult> {
    const testCase: TestCase = {
      input,
      expect: options.expect,
      timeout: options.timeout,
    };

    const promptWithTests = new PromptWithTests(
      this,
      [testCase],
      options.executor,
    );
    return promptWithTests.runSingle(testCase, options.executor);
  }
}

/**
 * Create a new prompt builder
 */
export function prompt(systemPrompt?: string): PromptBuilder {
  return new PromptBuilder(systemPrompt);
}