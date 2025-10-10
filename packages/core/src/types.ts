import type { z } from "zod";

// Generic Message type (no external dependencies)
export interface CoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Tool function type with metadata attached (supports both AI SDK v4 and v5)
export interface ToolFunction {
  description: string;
  parameters?: z.ZodType; // AI SDK v4 format
  inputSchema?: z.ZodType; // AI SDK v5 format
  execute?: (...args: unknown[]) => Promise<unknown>;
}

// Output format for structured responses
export interface OutputFormat {
  type: "text" | "json";
  schema?: z.ZodType; // For structured JSON output
  instruction?: string; // Custom formatting instruction
}