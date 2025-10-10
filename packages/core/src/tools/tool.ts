import type { z } from "zod";
import type { ToolFunction } from "../types.js";

/**
 * Creates a tool function with metadata attached (supports both AI SDK v4 and v5)
 * Similar to Vercel AI SDK's tool() function
 */
export function tool<TParameters extends z.ZodType>(config: {
  description: string;
  parameters?: TParameters; // AI SDK v4 format
  inputSchema?: TParameters; // AI SDK v5 format
  execute?: (params: z.infer<TParameters>, context?: any) => Promise<any>;
}): ToolFunction {
  // Validate that exactly one schema is provided
  if (!config.parameters && !config.inputSchema) {
    throw new Error(
      "Either 'parameters' (v4) or 'inputSchema' (v5) must be provided",
    );
  }

  if (config.parameters && config.inputSchema) {
    throw new Error(
      "Cannot provide both 'parameters' and 'inputSchema'. Use only one format.",
    );
  }

  return {
    description: config.description,
    parameters: config.parameters,
    inputSchema: config.inputSchema,
    execute: config.execute || (async () => {}),
  };
}

/**
 * Type guard to check if a function is a tool function
 */
export function isToolFunction(fn: any): fn is ToolFunction {
  return (
    typeof fn === "object" &&
    typeof fn.description === "string" &&
    (fn.parameters || fn.inputSchema) &&
    typeof fn.execute === "function"
  );
}

/**
 * Extracts tool metadata from a tool function (unified for both v4 and v5)
 */
export function extractToolMetadata(toolFn: ToolFunction): {
  description: string;
  schema: z.ZodType;
} {
  if (!isToolFunction(toolFn)) {
    throw new Error("Invalid tool function: missing required metadata");
  }

  // Get the schema from either v4 (parameters) or v5 (inputSchema) format
  const schema = toolFn.parameters || toolFn.inputSchema;
  if (!schema) {
    throw new Error(
      "Tool function must have either 'parameters' (v4) or 'inputSchema' (v5)",
    );
  }

  return {
    description: toolFn.description,
    schema: schema,
  };
}
