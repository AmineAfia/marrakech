import type {
  CoreMessage,
  CompileResult,
  ToolFunction,
  PromptBuilderOptions,
  Example,
  Provider,
} from "./types.js";
import { extractToolMetadata } from "./tools/tool.js";
import { zodToJsonSchema } from "./schema/zodToJsonSchema.js";
import { getCompiler } from "./compilers/CompilerFactory.ts";
import { PromptLinter } from "./linter/PromptLinter.ts";

export class PromptBuilder {
  private name: string;
  private persona?: string;
  private rules: string[] = [];
  private examples: Example[] = [];
  private tools: ToolFunction[] = [];

  constructor(options: PromptBuilderOptions) {
    this.name = options.name;
  }

  /**
   * Add a persona/instruction block
   */
  withPersona(text: string): this {
    this.persona = text;
    return this;
  }

  /**
   * Add a rule (can be called multiple times)
   */
  withRule(text: string): this {
    this.rules.push(text);
    return this;
  }

  /**
   * Add a few-shot example
   */
  withExample(example: Example): this {
    this.examples.push(example);
    return this;
  }

  /**
   * Add a tool function (AI SDK pattern)
   */
  withTool(toolFunction: ToolFunction): this {
    this.tools.push(toolFunction);
    return this;
  }

  /**
   * Compile the prompt for a specific provider
   */
  compile(provider: Provider = "generic"): string | CompileResult {
    // Run linter
    const linter = new PromptLinter();
    const linterResult = linter.lint(this);

    // Log warnings/errors
    for (const issue of linterResult.issues) {
      if (issue.type === "error") {
        console.error(`[PromptBuilder Error] ${issue.message}`);
      } else {
        console.warn(`[PromptBuilder Warning] ${issue.message}`);
      }
    }

      // Get appropriate compiler
      const compiler = getCompiler(provider);

    // Compile based on provider
    if (provider === "openai") {
      return compiler.compile(this) as CompileResult;
    }
    return compiler.compile(this) as string;
  }

  /**
   * Prepare messages with system prompt (generic)
   */
  prepareMessages(messages: CoreMessage[]): CoreMessage[] {
    return this.prepareMessagesGeneric(messages);
  }

  /**
   * Prepare messages with system prompt (Vercel AI SDK compatible)
   */
  prepareMessagesVercel<T extends CoreMessage>(messages: T[]): T[] {
    return this.prepareMessagesGeneric(messages);
  }

  /**
   * Internal method to prepare messages
   */
  private prepareMessagesGeneric<T extends CoreMessage>(messages: T[]): T[] {
    const systemPrompt = this.compile("generic") as string;

    // Check if system message already exists
    const hasSystemMessage = messages.some((msg) => msg.role === "system");

      if (hasSystemMessage) {
        // Replace existing system message
        return messages.map((msg) =>
          msg.role === "system" ? ({ ...msg, content: systemPrompt } as T) : msg,
        );
      }
      // Prepend system message
      const systemMessage = {
        role: "system" as const,
        content: systemPrompt,
      } as T;
      return [systemMessage, ...messages];
  }

  // Getters for internal use by compilers
  getName(): string {
    return this.name;
  }

  getPersona(): string | undefined {
    return this.persona;
  }

  getRules(): string[] {
    return this.rules;
  }

  getExamples(): Example[] {
    return this.examples;
  }

  getTools(): Array<{ name: string; description: string; parameters: object }> {
    return this.tools.map((tool) => {
      const metadata = extractToolMetadata(tool);
      return {
        name: tool.name || "unnamed",
        description: metadata.description,
        parameters: zodToJsonSchema(metadata.parameters),
      };
    });
  }
}
