import type { PromptBuilder } from "../PromptBuilder.js";
import type { LinterResult, LinterIssue } from "../types.js";
import { estimateTokens, estimateCost } from "./TokenCounter.js";

export class PromptLinter {
  lint(promptBuilder: PromptBuilder): LinterResult {
    const issues: LinterIssue[] = [];

    // Check for missing persona
    if (!promptBuilder.getPersona()) {
      issues.push({
        type: "warning",
        message: "No persona defined. Consider adding a clear role/identity.",
        rule: "missing-persona",
      });
    }

    // Check for empty rules
    const rules = promptBuilder.getRules();
    if (rules.length === 0) {
      issues.push({
        type: "warning",
        message: "No rules defined. Consider adding behavioral constraints.",
        rule: "no-rules",
      });
    }

    // Check tool descriptions
    const tools = promptBuilder.getTools();
    tools.forEach((tool, index) => {
      if (!tool.description || tool.description.length < 10) {
        issues.push({
          type: "warning",
          message: `Tool ${index + 1} has a short or missing description. Provide clear usage instructions.`,
          rule: "tool-description",
        });
      }
    });

    // Calculate token count
    const compiledPrompt = this.compileForLinting(promptBuilder);
      const tokenCount = estimateTokens(compiledPrompt);

    // Check for excessive length
    if (tokenCount > 4000) {
      issues.push({
        type: "warning",
        message: `Prompt is ${tokenCount} tokens (${Math.round(tokenCount / 1000)}K). Consider shortening for better performance.`,
        rule: "excessive-length",
      });
    }

    // Estimate cost
      const estimatedCost = estimateCost(tokenCount);

    return {
      issues,
      tokenCount,
      estimatedCost,
    };
  }

  private compileForLinting(promptBuilder: PromptBuilder): string {
    const parts: string[] = [];

    const persona = promptBuilder.getPersona();
    if (persona) {
      parts.push(persona);
    }

    const rules = promptBuilder.getRules();
    if (rules.length > 0) {
      parts.push("\nRules:");
      for (const rule of rules) {
        parts.push(`- ${rule}`);
      }
    }

    const examples = promptBuilder.getExamples();
    if (examples.length > 0) {
      parts.push("\nExamples:");
      for (const example of examples) {
        parts.push(`User: ${example.user}`);
        parts.push(`Assistant: ${example.assistant}`);
      }
    }

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
