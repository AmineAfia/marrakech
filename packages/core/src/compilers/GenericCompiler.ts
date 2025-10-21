import type { PromptBuilder } from "../PromptBuilder.js";
import { extractToolMetadata } from "../tools/tool.js";
import { zodToJsonSchema } from "../schema/zodToJsonSchema.js";

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

  // Add output format
  const outputFormat = promptBuilder.outputFormat;
  if (outputFormat) {
    if (outputFormat.type === "json" && outputFormat.schema) {
      parts.push("\nOutput Format:");
      parts.push("Respond with valid JSON matching this schema:");
      const jsonSchema = zodToJsonSchema(outputFormat.schema);
      parts.push(JSON.stringify(jsonSchema, null, 2));
    } else if (outputFormat.instruction) {
      parts.push("\nOutput Format:");
      parts.push(outputFormat.instruction);
    }
  }

  return parts.join("\n");
}