import type { PromptBuilder } from "../PromptBuilder.js";
import { zodToJsonSchema } from "../schema/zodToJsonSchema.js";

export class GenericCompiler {
  compile(promptBuilder: PromptBuilder): string {
    const parts: string[] = [];

    // Add persona
    const persona = promptBuilder.getPersona();
    if (persona) {
      parts.push(persona);
    }

    // Add rules
    const rules = promptBuilder.getRules();
    if (rules.length > 0) {
      parts.push("\nRules:");
      for (const rule of rules) {
        parts.push(`- ${rule}`);
      }
    }

    // Add examples
    const examples = promptBuilder.getExamples();
    if (examples.length > 0) {
      parts.push("\nExamples:");
      for (const example of examples) {
        parts.push(`User: ${example.user}`);
        parts.push(`Assistant: ${example.assistant}`);
      }
    }

    // Add tools
    const tools = promptBuilder.getTools();
    if (tools.length > 0) {
      parts.push("\nTools:");
      for (const tool of tools) {
        parts.push(`- ${tool.name}: ${tool.description}`);
      }
    }

    // Add output format
    const outputFormat = promptBuilder.getOutputFormat();
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
}
