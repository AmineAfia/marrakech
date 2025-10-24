import type { PromptBuilder } from "../PromptBuilder.js";
import { extractToolMetadata } from "../tools/tool.js";

/**
 * Convert PromptBuilder to generic string format
 */
export function toGeneric(promptBuilder: PromptBuilder): string {
  const parts: string[] = [];

  // Add system prompt
  if (promptBuilder.systemPrompt) {
    parts.push(promptBuilder.systemPrompt);
  }

  // Add tools
  const tools = promptBuilder.toolsList;
  if (tools.length > 0) {
    parts.push("\nTools:");
    for (const tool of tools) {
      const metadata = extractToolMetadata(tool);
      parts.push(
        `- ${(tool as { name?: string }).name || "unnamed"}: ${metadata.description}`,
      );
    }
  }

  return parts.join("\n");
}
