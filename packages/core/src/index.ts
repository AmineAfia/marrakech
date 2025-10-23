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

// Message utilities
export * from "./utils/messageUtils.js";

// Testing utilities
export { PromptWithTests } from "./testing/PromptWithTests.js";
export {
  match,
  matchPartial,
  formatDiff,
  MatchError,
} from "./testing/matchers.js";
export type {
  TestCase,
  EvalOptions,
  EvalResult,
  TestResults,
  TestRunOptions,
  TestRunMetadata,
  ExecutorMetadata,
} from "./testing/types.js";

// Executor utilities
export {
  createVercelAIExecutor,
  createExecutor,
} from "./executors/index.js";
export type {
  Executor,
  ExecutorConfig,
  ExecutionResult,
  ExecutionStep,
} from "./executors/types.js";

// Types
export type {
  CoreMessage,
  ToolFunction,
  OutputFormat,
  Message,
  ModelMessage,
  UserModelMessage,
  AssistantModelMessage,
  SystemModelMessage,
  ToolModelMessage,
  UserContent,
  AssistantContent,
  ToolContent,
  TextPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart,
  JSONValue,
  LanguageModelV3ToolResultOutput,
} from "./types.js";