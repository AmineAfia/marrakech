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
  let systemPrompt = promptBuilder.systemPrompt;

  // Add output format instructions for Anthropic (no native structured outputs)
  const outputFormat = promptBuilder.outputFormat;
  if (outputFormat && outputFormat.type === "json" && outputFormat.schema) {
    const jsonSchema = zodToJsonSchema(outputFormat.schema);
    systemPrompt += `\n\n<output_format>
Respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}
</output_format>`;
  }

  // Get tools
  const tools = promptBuilder.tools.map((tool) => {
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