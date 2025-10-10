import type { z } from "zod";

// Generic Message type (no external dependencies)
export interface CoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Compile result for OpenAI (includes tools separately)
export interface CompileResult {
  systemPrompt: string;
  tools?: Array<{ name: string; description: string; parameters: object }>;
}

// Tool function type with metadata attached
export interface ToolFunction {
  description: string;
  parameters: z.ZodType;
  (...args: any[]): any;
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
