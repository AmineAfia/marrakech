import type { PromptBuilder } from "../PromptBuilder.js";

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

    return parts.join("\n");
  }
}
