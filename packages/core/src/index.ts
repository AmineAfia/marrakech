// Main exports - minimal API surface
export { prompt, PromptBuilder } from "./PromptBuilder.js";

// Tool utilities
export { tool, isToolFunction, extractToolMetadata } from "./tools/tool.js";

// Compiler utilities
export { toGeneric } from "./compilers/GenericCompiler.js";
export { toOpenAI } from "./compilers/OpenAICompiler.js";
export { toAnthropic } from "./compilers/AnthropicCompiler.js";

// Schema utilities
export {
  zodToJsonSchema,
  extractDescription,
} from "./schema/zodToJsonSchema.js";

// Analytics utilities (optional, for advanced users)
export * from "./analytics/index.js";

// Types
export type {
  CoreMessage,
  ToolFunction,
  OutputFormat,
} from "./types.js";