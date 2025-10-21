/**
 * TestRunner - Discovers and runs prompt tests
 */

import { glob } from "glob";
import { pathToFileURL } from "node:url";
import type { PromptWithTests, TestResults } from "@marrakesh/core";

export interface RunnerOptions {
  bail?: boolean;
}

export interface RunnerResults {
  total: number;
  passed: number;
  failed: number;
  duration: number;
  promptResults: Array<{
    promptName: string;
    results: TestResults;
  }>;
}

/**
 * Test runner that discovers and executes prompt tests
 */
export class TestRunner {
  private options: Required<RunnerOptions>;
  private progressCallback?: (event: { type: string; data: unknown }) => void;
  private static tsxRegistered = false;

  constructor(options: RunnerOptions = {}) {
    this.options = {
      bail: options.bail ?? false,
    };
  }

  setProgressCallback(
    callback: (event: { type: string; data: unknown }) => void,
  ): void {
    this.progressCallback = callback;
  }

  /**
   * Ensure tsx is registered for TypeScript support
   */
  private async ensureTsxRegistered(): Promise<void> {
    if (!TestRunner.tsxRegistered) {
      try {
        // Try to register tsx for TypeScript support
        await import("tsx/esm");
        TestRunner.tsxRegistered = true;
      } catch {
        try {
          // Fallback to main tsx import
          await import("tsx");
          TestRunner.tsxRegistered = true;
        } catch {
          // If tsx is not available, we'll handle it in the import
          console.warn(
            "tsx not available, TypeScript files may not work properly",
          );
          TestRunner.tsxRegistered = true;
        }
      }
    }
  }

  /**
   * Find all test files matching the pattern and run them
   */
  async findAndRun(pattern: string): Promise<RunnerResults> {
    const files = await this.findTestFilesPrivate(pattern);
    const prompts = await this.loadPrompts(files);
    return this.runTests(prompts);
  }

  /**
   * Find test files matching the glob pattern (public method)
   */
  async findTestFiles(pattern: string): Promise<string[]> {
    return this.findTestFilesPrivate(pattern);
  }

  /**
   * Find test files matching the glob pattern
   */
  private async findTestFilesPrivate(pattern: string): Promise<string[]> {
    // Search for files matching pattern
    const files = await glob(pattern, {
      ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      absolute: true,
    });

    return files;
  }

  /**
   * Load PromptWithTests instances from files
   */
  private async loadPrompts(
    files: string[],
  ): Promise<Array<{ name: string; prompt: PromptWithTests }>> {
    const prompts: Array<{ name: string; prompt: PromptWithTests }> = [];

    for (const file of files) {
      try {
        // Ensure tsx is registered for TypeScript files
        if (file.endsWith(".ts") || file.endsWith(".tsx")) {
          await this.ensureTsxRegistered();
        }

        // Use direct import for all files (both JS and TS with tsx registered)
        const fileUrl = pathToFileURL(file).href;
        const module = await import(fileUrl);

        // Look for exported PromptWithTests instances
        for (const [exportName, exportValue] of Object.entries(module)) {
          if (this.isPromptWithTests(exportValue)) {
            prompts.push({
              name: exportName,
              prompt: exportValue as PromptWithTests,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to load ${file}:`, error);
      }
    }

    return prompts;
  }

  /**
   * Check if a value is a PromptWithTests instance
   */
  private isPromptWithTests(value: unknown): boolean {
    return (
      value !== null &&
      value !== undefined &&
      typeof value === "object" &&
      "run" in value &&
      "getTestCases" in value
    );
  }

  /**
   * Run all discovered tests
   */
  async runTests(
    prompts: Array<{ name: string; prompt: PromptWithTests }>,
  ): Promise<RunnerResults> {
    const startTime = Date.now();
    const promptResults: Array<{
      promptName: string;
      results: TestResults;
    }> = [];

    for (const { name, prompt } of prompts) {
      try {
        // Run the tests with progress callback (this will trigger analytics tracking)
        const results = await prompt.run({
          bail: this.options.bail,
          onProgress: this.progressCallback,
        });

        promptResults.push({
          promptName: name,
          results,
        });

        // Bail on first failure if option is set
        if (this.options.bail && results.failed > 0) {
          break;
        }
      } catch (error) {
        console.error(`Error running tests for ${name}:`, error);
      }
    }

    // Aggregate results
    const total = promptResults.reduce((sum, r) => sum + r.results.total, 0);
    const passed = promptResults.reduce((sum, r) => sum + r.results.passed, 0);
    const failed = promptResults.reduce((sum, r) => sum + r.results.failed, 0);

    const finalResults = {
      total,
      passed,
      failed,
      duration: Date.now() - startTime,
      promptResults,
    };

    return finalResults;
  }
}

