import type { z } from "zod";

// Generic Message type (no external dependencies)
export interface CoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Output format for structured responses
export interface OutputFormat {
  type: "text" | "json";
  schema?: z.ZodType; // For structured JSON output
  instruction?: string; // Custom formatting instruction
}

// Compile result for OpenAI (includes tools separately)
export interface CompileResult {
  systemPrompt: string;
  tools?: Array<{ name: string; description: string; parameters: object }>;
  responseFormat?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  };
}

// Tool function type with metadata attached (supports both AI SDK v4 and v5)
export interface ToolFunction {
  description: string;
  parameters?: z.ZodType; // AI SDK v4 format
  inputSchema?: z.ZodType; // AI SDK v5 format
  execute?: (params: any, context?: any) => Promise<any>;
}

// PromptBuilder configuration
export interface PromptBuilderOptions {
  name: string;
}

// Example for few-shot learning
export interface Example {
  user: string;
  assistant: string;
}

// Tool definition for PromptBuilder
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodType;
}

// Provider types
export type Provider = "generic" | "openai" | "anthropic";

// Linter warning/error
export interface LinterIssue {
  type: "warning" | "error";
  message: string;
  rule: string;
}

// Linter result
export interface LinterResult {
  issues: LinterIssue[];
  tokenCount: number;
  estimatedCost?: number;
}
