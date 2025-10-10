import type { PromptBuilder } from "../PromptBuilder.js";
import type { CompileResult } from "../types.js";

export class OpenAICompiler {
  compile(promptBuilder: PromptBuilder): CompileResult {
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

    const systemPrompt = parts.join("\n");
    const tools = promptBuilder.getTools();

    return {
      systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
    };
  }
}
