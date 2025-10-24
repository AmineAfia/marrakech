import type { PromptBuilder } from "../PromptBuilder.js";
import { extractToolMetadata } from "../tools/tool.js";
import { zodToJsonSchema } from "../schema/zodToJsonSchema.js";

/**
 * Convert PromptBuilder to Anthropic format
 */
export function toAnthropic(promptBuilder: PromptBuilder): {
  system: string;
  tools?: Array<{ name: string; description: string; parameters: object }>;
} {
  const systemPrompt = promptBuilder.systemPrompt;

  // Get tools
  const tools = promptBuilder.toolsList.map((tool) => {
    const metadata = extractToolMetadata(tool);
    return {
      name: (tool as { name?: string }).name || "unnamed",
      description: metadata.description,
      parameters: zodToJsonSchema(metadata.schema),
    };
  });

  return {
    system: systemPrompt,
    tools: tools.length > 0 ? tools : undefined,
  };
}
