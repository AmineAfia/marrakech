/**
 * Vercel AI SDK executor - handles agentic loop with tool calling
 */

import type {
  Executor,
  ExecutorConfig,
  ExecutionResult,
  ExecutionStep,
} from "./types.js";
import type { PromptBuilder } from "../PromptBuilder.js";

/**
 * Create a Vercel AI SDK executor
 * This is the primary executor that most users will use
 *
 * @param config - Executor configuration including model and options
 * @returns Executor function
 *
 * @example
 * ```typescript
 * import { createVercelAIExecutor } from 'marrakech-sdk/executors'
 * import { openai } from '@ai-sdk/openai'
 *
 * const executor = createVercelAIExecutor({
 *   model: openai('gpt-4'),
 *   maxSteps: 5
 * })
 * ```
 */
export function createVercelAIExecutor(config: ExecutorConfig): Executor {
  // Capture config in closure
  const maxSteps = config.maxSteps ?? 5;
  const timeout = config.timeout ?? 30000;

  return async (
    prompt: PromptBuilder,
    input: string,
  ): Promise<ExecutionResult> => {
    const steps: ExecutionStep[] = [];

    try {
      // Dynamically import generateText from AI SDK v5
      const { generateText } = await import("ai");

      // Convert prompt to Vercel AI format
      const { messages, tools, responseFormat } = prompt.toVercelAI([
        { role: "user", content: input },
      ]);

      // Execute with tool calling loop using Promise.race for timeout
      // Type assertions are needed because:
      // 1. config.model is 'unknown' to support any AI SDK model
      // 2. Tool call structure varies between AI SDK v5
      const generateTextOptions = {
        model: config.model as never,
        messages,
        tools,
        maxSteps,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        onStepFinish: (step: {
          toolCalls?: unknown;
          toolResults?: unknown;
          text?: string;
        }) => {
          // Track each tool calling round
          const toolCalls = step.toolCalls as unknown as Array<{
            toolName: string;
            args?: unknown;
            input?: unknown;
          }>;
          const toolResults = step.toolResults as unknown as Array<{
            toolCallId: string;
            result?: unknown;
            output?: unknown;
          }>;

          steps.push({
            stepNumber: steps.length + 1,
            toolCalls: toolCalls?.map((tc) => ({
              toolName: tc.toolName,
              input: tc.args ?? tc.input,
              output: toolResults?.find(
                (tr) => tr.toolCallId === tc.toolName,
              )?.result ?? toolResults?.find(
                (tr) => tr.toolCallId === tc.toolName,
              )?.output,
            })),
            text: step.text,
          });
        },
      } as Parameters<typeof generateText>[0];

      const result = await Promise.race([
        generateText(generateTextOptions),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Execution timeout")), timeout),
        ),
      ]);

      // Extract final output
      let output: unknown;
      if (responseFormat?.type === "json_schema") {
        // Structured output - parse JSON
        try {
          output = JSON.parse((result as { text: string }).text);
        } catch (parseError) {
          // If JSON parsing fails, return raw text
          output = (result as { text: string }).text;
        }
      } else {
        // Text output
        output = (result as { text: string }).text;
      }

      return {
        output,
        steps,
        finishReason: (result as { finishReason: string })
          .finishReason as ExecutionResult["finishReason"],
        usage: (result as { usage?: unknown }).usage as
          | ExecutionResult["usage"]
          | undefined,
      };
    } catch (error) {
      // Handle timeout or other errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        output: null,
        steps,
        finishReason:
          errorMessage === "Execution timeout" ? "timeout" : "error",
        error: errorMessage,
      };
    }
  };
}

