/**
 * Internal testing utilities for unit tests
 * These are NOT part of the public API and should only be used in internal tests
 */

import type { PromptWithTests } from "./PromptWithTests.js";
import type { TestResults, TestRunOptions, EvalResult } from "./types.js";
import type { ExecutorConfig, Executor } from "../executors/types.js";

/**
 * Internal testing utility - wraps an Executor function in an ExecutorConfig
 * This is only for internal unit tests, not for public API use
 * 
 * @internal
 */
export function createMockExecutorConfig(executor: Executor): {
  config: ExecutorConfig;
  executor: Executor;
} {
  return {
    config: {
      model: 'mock-executor',
      maxSteps: 5,
      timeout: 30000
    },
    executor
  };
}

/**
 * Internal testing utility - runs tests with a mock executor function
 * bypassing the normal executor creation flow
 * 
 * This is only for internal unit tests and should NOT be used in production code
 * 
 * @internal
 */
export async function runWithMockExecutor(
  promptWithTests: PromptWithTests,
  executor: Executor,
  options?: Omit<TestRunOptions, 'executor' | 'executors'>
): Promise<TestResults> {
  const mockConfig = createMockExecutorConfig(executor);
  
  // Call runSingle directly for each test case with the mock executor
  const startTime = Date.now();
  const results: EvalResult[] = [];
  
  const testCases = promptWithTests.getTestCases();
  
  for (let index = 0; index < testCases.length; index++) {
    const testCase = testCases[index];
    
    // Fire progress events if provided
    options?.onProgress?.({
      type: "test-start",
      data: {
        current: index + 1,
        total: testCases.length,
        input: testCase.input,
      },
    });
    
    options?.onTestStart?.(testCase);
    
    const result = await promptWithTests.runSingle(
      testCase,
      executor,
      mockConfig.config
    );
    results.push(result);
    
    options?.onTestComplete?.(result);
    
    options?.onProgress?.({
      type: "test-complete",
      data: result,
    });
    
    if (options?.bail && !result.passed) {
      break;
    }
  }
  
  return {
    total: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    duration: Date.now() - startTime,
    results,
    executorResults: {
      'mock-executor': {
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        results
      }
    }
  };
}

