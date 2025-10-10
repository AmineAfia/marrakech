import type { z } from "zod";
import type { CoreMessage, ToolFunction, OutputFormat } from "./types.js";
import { extractToolMetadata } from "./tools/tool.js";
import { zodToJsonSchema } from "./schema/zodToJsonSchema.js";

export class PromptBuilder {
  public systemPrompt: string;
  public tools: ToolFunction[] = [];
  public outputFormat?: OutputFormat;

  constructor(systemPrompt?: string) {
    this.systemPrompt = systemPrompt || "";
  }

  /**
   * Set the system prompt
   */
  system(text: string): this {
    if (this.systemPrompt) {
      this.systemPrompt += `\n${text}`;
    } else {
      this.systemPrompt = text;
    }
    return this;
  }

  /**
   * Add tools (variadic)
   */
  tool(...tools: ToolFunction[]): this {
    this.tools.push(...tools);
    return this;
  }

  /**
   * Set structured JSON output with Zod schema
   */
  output(schema: z.ZodType): this {
    this.outputFormat = { type: "json", schema };
    return this;
  }

  /**
   * Get tools in OpenAI format (array)
   */
  private getToolsForAPI(): Array<{
    name: string;
    description: string;
    parameters: object;
  }> {
    return this.tools.map((tool) => {
      const metadata = extractToolMetadata(tool);
      return {
        name: (tool as { name?: string }).name || "unnamed",
        description: metadata.description,
        parameters: zodToJsonSchema(metadata.schema),
      };
    });
  }

  /**
   * Get tools in Vercel AI SDK format (record)
   */
  private getToolsForVercelAI(): Record<string, unknown> {
    const tools: Record<string, unknown> = {};
    const usedNames = new Set<string>();

    for (const tool of this.tools) {
      const metadata = extractToolMetadata(tool);
      let name = (tool as { name?: string }).name || "unnamed";
      
      // Ensure unique names by adding a counter if needed
      if (usedNames.has(name)) {
        let counter = 1;
        let uniqueName = `${name}_${counter}`;
        while (usedNames.has(uniqueName)) {
          counter++;
          uniqueName = `${name}_${counter}`;
        }
        name = uniqueName;
      }
      
      usedNames.add(name);
      tools[name] = {
        description: metadata.description,
        inputSchema: zodToJsonSchema(metadata.schema),
        execute: tool.execute,
      };
    }

    return tools;
  }

  /**
   * Get response format for OpenAI
   */
  private getResponseFormat():
    | {
        type: "json_schema";
        json_schema: { name: string; strict: boolean; schema: object };
      }
    | undefined {
    if (
      !this.outputFormat ||
      this.outputFormat.type !== "json" ||
      !this.outputFormat.schema
    ) {
      return undefined;
    }

    return {
      type: "json_schema" as const,
      json_schema: {
        name: "response",
        strict: true,
        schema: zodToJsonSchema(this.outputFormat.schema),
      },
    };
  }

  /**
   * Convert to Vercel AI SDK format
   */
  toVercelAI(messages: CoreMessage[] = []): {
    messages: CoreMessage[];
    tools?: Record<string, unknown>;
    responseFormat?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    const systemMessage: CoreMessage = {
      role: "system",
      content: this.systemPrompt,
    };

    const allMessages = [systemMessage, ...messages];
    const tools = this.getToolsForVercelAI();
    const responseFormat = this.getResponseFormat();

    return {
      messages: allMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
      responseFormat,
    };
  }

  /**
   * Convert to OpenAI format
   */
  toOpenAI(messages: CoreMessage[] = []): {
    messages: CoreMessage[];
    tools?: Array<{ name: string; description: string; parameters: object }>;
    response_format?: {
      type: "json_schema";
      json_schema: { name: string; strict: boolean; schema: object };
    };
  } {
    const systemMessage: CoreMessage = {
      role: "system",
      content: this.systemPrompt,
    };

    const allMessages = [systemMessage, ...messages];
    const tools = this.getToolsForAPI();
    const response_format = this.getResponseFormat();

    return {
      messages: allMessages,
      tools: tools.length > 0 ? tools : undefined,
      response_format,
    };
  }

  /**
   * Convert to Anthropic format
   */
  toAnthropic(): {
    system: string;
    tools?: Array<{ name: string; description: string; parameters: object }>;
  } {
    let systemPrompt = this.systemPrompt;

    // Add output format instructions for Anthropic (no native structured outputs)
    if (
      this.outputFormat &&
      this.outputFormat.type === "json" &&
      this.outputFormat.schema
    ) {
      const jsonSchema = zodToJsonSchema(this.outputFormat.schema);
      systemPrompt += `\n\n<output_format>
Respond with valid JSON matching this schema:
${JSON.stringify(jsonSchema, null, 2)}
</output_format>`;
    }

    const tools = this.getToolsForAPI();

    return {
      system: systemPrompt,
      tools: tools.length > 0 ? tools : undefined,
    };
  }
}

/**
 * Create a new prompt builder
 */
export function prompt(systemPrompt?: string): PromptBuilder {
  return new PromptBuilder(systemPrompt);
}