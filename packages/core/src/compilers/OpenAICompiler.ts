import type { PromptBuilder } from "../PromptBuilder.js";
import type { CoreMessage } from "../types.js";
import { lintPrompt } from "../linter/index.js";
import { extractToolMetadata } from "../tools/tool.js";
import { zodToJsonSchema } from "../schema/zodToJsonSchema.js";

/**
 * Convert PromptBuilder to OpenAI format
 */
export function toOpenAI(
  promptBuilder: PromptBuilder,
  messages: CoreMessage[] = [],
): {
  messages: CoreMessage[];
  tools?: Array<{ name: string; description: string; parameters: object }>;
  response_format?: {
    type: "json_schema";
    json_schema: { name: string; strict: boolean; schema: object };
  };
} {
  const systemMessage: CoreMessage = {
    role: "system",
    content: promptBuilder.systemPrompt,
  };

  const allMessages = [systemMessage, ...messages];

  // Get tools
  const tools = promptBuilder.toolsList.map((tool) => {
    const metadata = extractToolMetadata(tool);
    return {
      name: (tool as { name?: string }).name || "unnamed",
      description: metadata.description,
      parameters: zodToJsonSchema(metadata.schema),
    };
  });

  // Get response format
  const outputFormat = promptBuilder.outputFormat;
  let response_format = undefined;

  if (outputFormat?.type === "json" && outputFormat.schema) {
    response_format = {
      type: "json_schema" as const,
      json_schema: {
        name: "response",
        strict: true,
        schema: zodToJsonSchema(outputFormat.schema),
      },
    };
  }

  // Lint (default-off, env-controlled). Non-blocking: only logs.
  try {
    lintPrompt(
      {
        provider: "openai",
        system: systemMessage.content,
        messages: allMessages,
      },
      console,
    );
  } catch {
    // Never throw from linter
  }

  return {
    messages: allMessages,
    tools: tools.length > 0 ? tools : undefined,
    response_format,
  };
}