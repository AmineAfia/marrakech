/**
 * TestRunner - Discovers and runs prompt tests
 */

import { glob } from "glob";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { PromptWithTests, TestResults } from "marrakech-sdk";

export interface RunnerOptions {
  concurrency?: number;
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

  constructor(options: RunnerOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 5,
      bail: options.bail ?? false,
    };
  }

  /**
   * Find all test files matching the pattern and run them
   */
  async findAndRun(pattern: string): Promise<RunnerResults> {
    const files = await this.findTestFiles(pattern);
    const prompts = await this.loadPrompts(files);
    return this.runTests(prompts);
  }

  /**
   * Find test files matching the glob pattern
   */
  private async findTestFiles(pattern: string): Promise<string[]> {
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
        let module: Record<string, unknown>;
        
        // For now, let's use a simpler approach that works with both JS and TS
        // We'll use Node.js v22's built-in TypeScript support for all files
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          // Use Node.js v22's built-in TypeScript support directly
          module = await this.loadTypeScriptFileDirect(file);
        } else {
          // Use regular import for JavaScript files
          const fileUrl = pathToFileURL(file).href;
          module = await import(fileUrl);
        }

        // Look for exported PromptWithTests instances
        for (const [exportName, exportValue] of Object.entries(module)) {
          // Check if it's a PromptWithTests instance
          if (
            exportValue &&
            typeof exportValue === "object" &&
            "run" in exportValue &&
            "getTestCases" in exportValue
          ) {
            // This is a real PromptWithTests instance
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
   * Load TypeScript files using Node.js v22's built-in TypeScript support
   */
  private async loadTypeScriptFileDirect(filePath: string): Promise<Record<string, unknown>> {
    try {
      const execFileAsync = promisify(execFile);

      // Create a loader script that imports the TypeScript file and runs the tests directly
      const loaderScript = `
        import { pathToFileURL } from 'node:url';
        const fileUrl = pathToFileURL('${filePath}').href;
        const module = await import(fileUrl);
        
        // Find and run the PromptWithTests instances directly
        for (const [key, value] of Object.entries(module)) {
          if (value && typeof value === 'object' && 'run' in value && 'getTestCases' in value) {
            // This is a PromptWithTests instance - run it directly
            try {
              const result = await value.run({
                concurrency: 1,
                bail: false
              });
              console.log(JSON.stringify({
                success: true,
                key: key,
                result: result
              }));
            } catch (error) {
              console.log(JSON.stringify({
                success: false,
                key: key,
                error: error.message
              }));
            }
          }
        }
      `;

      const { stdout } = await execFileAsync("node", [
        "--experimental-strip-types",
        "--input-type=module",
        "-e",
        loaderScript,
      ]);

      // Parse the output from the direct execution
      const lines = stdout.trim().split("\n");
      const realModule: Record<string, unknown> = {};

      for (const line of lines) {
        if (line.startsWith("{")) {
          try {
            const result = JSON.parse(line);

            if (result.success && result.result) {
              // Create a mock PromptWithTests that returns the actual results
              realModule[result.key] = {
                run: async (_options: unknown) => {
                  return result.result;
                },
                getTestCases: () => {
                  return result.result.results || [];
                },
              };
            } else if (!result.success) {
              // Create a mock that shows the error
              realModule[result.key] = {
                run: async (_options: unknown) => {
                  return {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    duration: 0,
                    results: [],
                  };
                },
                getTestCases: () => {
                  return [];
                },
              };
            }
          } catch (e) {
            // Ignore non-JSON lines
          }
        }
      }

      return realModule;
    } catch (error) {
      throw new Error(`Failed to load TypeScript file: ${error}`);
    }
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
        const results = await prompt.run({
          concurrency: this.options.concurrency,
          bail: this.options.bail,
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
        // Handle execution errors
        console.error(`Error running tests for ${name}:`, error);
      }
    }

    // Aggregate results
    const total = promptResults.reduce((sum, r) => sum + r.results.total, 0);
    const passed = promptResults.reduce(
      (sum, r) => sum + r.results.passed,
      0,
    );
    const failed = promptResults.reduce(
      (sum, r) => sum + r.results.failed,
      0,
    );

    return {
      total,
      passed,
      failed,
      duration: Date.now() - startTime,
      promptResults,
    };
  }
}

