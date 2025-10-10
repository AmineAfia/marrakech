import type { z } from "zod";
import type { ToolFunction } from "../types.js";

/**
 * Creates a tool function with metadata attached (AI SDK pattern)
 * Similar to Vercel AI SDK's tool() function
 */
export function tool<TParameters extends z.ZodType>(config: {
  description: string;
  parameters: TParameters;
  execute?: (params: z.infer<TParameters>) => Promise<any>;
}): ToolFunction {
  const toolFn = config.execute || (async () => {});

  // Attach metadata to function (AI SDK pattern)
  (toolFn as any).description = config.description;
  (toolFn as any).parameters = config.parameters;

  return toolFn as ToolFunction;
}

/**
 * Type guard to check if a function is a tool function
 */
export function isToolFunction(fn: any): fn is ToolFunction {
  return (
    typeof fn === "function" &&
    typeof fn.description === "string" &&
    fn.parameters &&
    typeof fn.parameters.parse === "function"
  );
}

/**
 * Extracts tool metadata from a tool function
 */
export function extractToolMetadata(toolFn: ToolFunction): {
  description: string;
  parameters: z.ZodType;
} {
  if (!isToolFunction(toolFn)) {
    throw new Error("Invalid tool function: missing required metadata");
  }

  return {
    description: toolFn.description,
    parameters: toolFn.parameters,
  };
}
