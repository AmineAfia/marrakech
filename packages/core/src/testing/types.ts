/**
 * Testing types for eval-driven development
 */

import type { Executor } from "../executors/types.js";

/**
 * A single test case for prompt evaluation
 */
export interface TestCase {
  /** The input to test with */
  input: string;
  /** Optional expected output for assertions */
  expect?: unknown;
  /** Optional name/description for this test case */
  name?: string;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Options for running a single eval
 */
export interface EvalOptions {
  /** Expected output for assertions */
  expect?: unknown;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Model to use for execution */
  model?: string;
}

/**
 * Result of a single evaluation
 */
export interface EvalResult {
  /** The input that was tested */
  input: string;
  /** The actual output from the prompt */
  output: unknown;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether the test passed (true if no expect, or matches expect) */
  passed: boolean;
  /** Unique execution ID for analytics tracking */
  execution_id: string;
  /** Error message if test failed or threw */
  error?: string;
  /** Expected output if assertion was made */
  expected?: unknown;
}

/**
 * Aggregated results from running multiple tests
 */
export interface TestResults {
  /** Total number of tests run */
  total: number;
  /** Number of tests that passed */
  passed: number;
  /** Number of tests that failed */
  failed: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Individual test results */
  results: EvalResult[];
}

/**
 * Options for running a test suite
 */
export interface TestRunOptions {
  /** Stop on first failure */
  bail?: boolean;
  /** Maximum number of concurrent tests */
  concurrency?: number;
  /** Executor to use for running tests */
  executor?: Executor;
}

/**
 * Metadata about a test run for analytics
 */
export interface TestRunMetadata {
  /** Unique test run ID */
  test_run_id: string;
  /** Prompt ID being tested */
  prompt_id: string;
  /** Prompt name */
  prompt_name: string;
  /** Total number of tests */
  total_tests: number;
  /** Number of passed tests */
  passed_tests: number;
  /** Number of failed tests */
  failed_tests: number;
  /** Total duration in ms */
  duration_ms: number;
  /** Timestamp of test run */
  timestamp: string;
  /** Environment (local, ci, production) */
  environment: "local" | "ci" | "production";
  /** Git commit hash if available */
  git_commit?: string;
}

