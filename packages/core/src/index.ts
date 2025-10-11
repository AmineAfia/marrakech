// Main exports - minimal API surface
export { prompt, PromptBuilder } from "./PromptBuilder.js";

// Tool utilities
export { tool, isToolFunction, extractToolMetadata } from "./tools/tool.js";

// Compiler utilities
export { toGeneric } from "./compilers/GenericCompiler.js";
export { toOpenAI } from "./compilers/OpenAICompiler.js";
export { toAnthropic } from "./compilers/AnthropicCompiler.js";

// Linter exports (types only; functionality auto-runs when enabled via env)
export type { LintFinding, LintSeverity } from "./linter/index.js";

// Schema utilities
export {
  zodToJsonSchema,
  extractDescription,
} from "./schema/zodToJsonSchema.js";

// Types
export type {
  CoreMessage,
  ToolFunction,
  OutputFormat,
} from "./types.js";