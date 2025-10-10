import type { PromptBuilder } from "../PromptBuilder.js";
import { zodToJsonSchema } from "../schema/zodToJsonSchema.js";

export class AnthropicCompiler {
  compile(promptBuilder: PromptBuilder): string {
    const parts: string[] = [];

    // Add persona with XML tags
    if (promptBuilder.getPersona()) {
      parts.push(`<persona>${promptBuilder.getPersona()}</persona>`);
    }

    // Add rules with XML tags
    const rules = promptBuilder.getRules();
    if (rules.length > 0) {
      parts.push("<rules>");
      for (const rule of rules) {
        parts.push(`- ${rule}`);
      }
      parts.push("</rules>");
    }

    // Add examples with XML tags
    const examples = promptBuilder.getExamples();
    if (examples.length > 0) {
      parts.push("<examples>");
      for (const example of examples) {
        parts.push(`User: ${example.user}`);
        parts.push(`Assistant: ${example.assistant}`);
      }
      parts.push("</examples>");
    }

    // Add tools with XML tags
    const tools = promptBuilder.getTools();
    if (tools.length > 0) {
      parts.push("<tools>");
      for (const tool of tools) {
        parts.push(`- ${tool.name}: ${tool.description}`);
      }
      parts.push("</tools>");
    }

    // Add output format with XML tags (Anthropic best practice)
    const outputFormat = promptBuilder.getOutputFormat();
    if (outputFormat) {
      if (outputFormat.type === "json" && outputFormat.schema) {
        parts.push("<output_format>");
        parts.push("Respond with valid JSON matching this schema:");
        const jsonSchema = zodToJsonSchema(outputFormat.schema);
        parts.push(JSON.stringify(jsonSchema, null, 2));
        parts.push("</output_format>");
      } else if (outputFormat.instruction) {
        parts.push(
          `<output_format>${outputFormat.instruction}</output_format>`,
        );
      }
    }

    return parts.join("\n");
  }
}
