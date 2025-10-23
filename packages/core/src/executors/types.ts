/**
 * Executor types for prompt execution with tool calling support
 */

import type { PromptBuilder } from "../PromptBuilder.js";

/**
 * Configuration for prompt execution
 */
export interface ExecutorConfig {
  /** AI SDK model instance (e.g., openai('gpt-4')) */
  model: unknown;
  /** Maximum number of tool calling rounds (default: 5) */
  maxSteps?: number;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
}

/**
 * Result of a prompt execution
 */
export interface ExecutionResult {
  /** Final output (text or parsed JSON) */
  output: unknown;
  /** Execution steps including tool calls */
  steps: ExecutionStep[];
  /** Reason execution finished */
  finishReason: "stop" | "length" | "tool-calls" | "error" | "timeout";
  /** Token usage information */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Error message if execution failed */
  error?: string;
}

/**
 * A single step in the execution (e.g., one round of tool calling)
 */
export interface ExecutionStep {
  /** Step number (1-indexed) */
  stepNumber: number;
  /** Tool calls made in this step */
  toolCalls?: Array<{
    toolName: string;
    input: unknown;
    output: unknown;
    error?: string;
  }>;
  /** Text generated in this step */
  text?: string;
}

/**
 * Executor function type
 * Takes a prompt and input, returns execution result
 * Config is captured when executor is created
 */
export type Executor = (
  prompt: PromptBuilder,
  input: string,
) => Promise<ExecutionResult>;
