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
 * import { createVercelAIExecutor } from '@marrakesh/core/executors'
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
      const { messages, tools } = prompt.toVercelAI([
        { role: "user", content: input },
      ]);

      // Get the tool descriptions from the tools object
      const toolDescriptions = tools
        ? Object.values(tools).map(
            (t: { description: string }) => t.description,
          )
        : [];

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
            id?: string;
            name?: string;
            function?: { name?: string };
            arguments?: unknown;
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
            toolCalls: toolCalls?.map((tc, index) => {
              // Use tool description as the display name
              const toolName = toolDescriptions[index] ?? "unnamed";

              return {
                toolName,
                input: tc.arguments ?? tc.args ?? tc.input,
                output:
                  toolResults?.find((tr) => tr.toolCallId === tc.id)?.result ??
                  toolResults?.find((tr) => tr.toolCallId === tc.id)?.output,
              };
            }),
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
      const resultObj = result as Record<string, unknown>;

      // Text output - but check if we have tool results instead
      if (resultObj.text) {
        output = resultObj.text;
      } else if (
        resultObj.toolResults &&
        Array.isArray(resultObj.toolResults) &&
        resultObj.toolResults.length > 0
      ) {
        // If we have tool results, use the last one as output
        const lastToolResult = resultObj.toolResults[
          resultObj.toolResults.length - 1
        ] as Record<string, unknown>;
        output = lastToolResult.result || lastToolResult.output;
      } else if (
        resultObj.toolCalls &&
        Array.isArray(resultObj.toolCalls) &&
        resultObj.toolCalls.length > 0
      ) {
        // If we have tool calls but no results, extract from steps
        const lastStep = steps[steps.length - 1];
        if (lastStep?.toolCalls && lastStep.toolCalls.length > 0) {
          output = lastStep.toolCalls[lastStep.toolCalls.length - 1].output;
        }
      } else {
        output = resultObj.text || "";
      }

      // Extract usage information with better error handling
      let usage: ExecutionResult["usage"] | undefined;

      if (resultObj.usage) {
        const usageObj = resultObj.usage as Record<string, unknown>;

        // Support both AI SDK 5.0 format (inputTokens/outputTokens) and legacy format (promptTokens/completionTokens)
        usage = {
          promptTokens:
            typeof usageObj.inputTokens === "number"
              ? usageObj.inputTokens
              : typeof usageObj.promptTokens === "number"
                ? usageObj.promptTokens
                : 0,
          completionTokens:
            typeof usageObj.outputTokens === "number"
              ? usageObj.outputTokens
              : typeof usageObj.completionTokens === "number"
                ? usageObj.completionTokens
                : 0,
          totalTokens:
            typeof usageObj.totalTokens === "number" ? usageObj.totalTokens : 0,
        };
      }

      return {
        output,
        steps,
        finishReason: (result as { finishReason: string })
          .finishReason as ExecutionResult["finishReason"],
        usage,
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
