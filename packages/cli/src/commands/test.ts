/**
 * Test command - Run prompt tests
 */

import { Command } from "commander";
import { TestRunner } from "../runner/TestRunner.js";
import { Reporter } from "../output/Reporter.js";
import { Watcher } from "../watch/Watcher.js";
import type { EvalResult } from "@marrakesh/core";

interface TestOptions {
  watch?: boolean;
  bail?: boolean;
}

export const testCommand = new Command("test")
  .description("Run prompt tests")
  .argument("[pattern]", "File pattern to test", "**/*.{ts,js}")
  .option("-w, --watch", "Watch mode - rerun tests on file changes")
  .option("--bail", "Stop on first failure")
  .action(async (pattern: string, options: TestOptions) => {
    const reporter = new Reporter();

    try {
      if (options.watch) {
        // Watch mode
        const watcher = new Watcher(pattern, {
          bail: options.bail || false,
        });

        reporter.watchMode();
        await watcher.start((results) => {
          reporter.printResults(results);
        });
      } else {
        // Single run
        const runner = new TestRunner({
          bail: options.bail || false,
        });

        // Track results in real-time
        let totalTests = 0;
        let completedTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        const allResults: EvalResult[] = [];

        // Set up progress callback
        runner.setProgressCallback((event) => {
          if (event.type === "test-start") {
            const data = event.data as {
              current: number;
              total: number;
              input: string;
            };
            totalTests = data.total;
            reporter.testStarting(data.current, data.total, data.input);
          } else if (event.type === "test-complete") {
            const result = event.data as EvalResult;
            allResults.push(result);
            completedTests++;
            if (result.passed) {
              passedTests++;
            } else {
              failedTests++;
            }
            reporter.testCompleted(result);

            // Show final summary immediately when all tests are done
            if (completedTests === totalTests) {
              const finalResults = {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                duration: allResults.reduce((sum, r) => sum + r.duration, 0),
                promptResults: [
                  {
                    promptName: "test",
                    results: {
                      total: totalTests,
                      passed: passedTests,
                      failed: failedTests,
                      duration: allResults.reduce(
                        (sum, r) => sum + r.duration,
                        0,
                      ),
                      results: allResults,
                    },
                  },
                ],
              };
              reporter.printResults(finalResults);

              // Exit immediately after showing results
              process.exit(failedTests > 0 ? 1 : 0);
            }
          }
        });

        reporter.startRun();

        const files = await runner.findTestFiles(pattern);
        reporter.fileDiscovered(files.length);

        // Don't wait for the full results, just let the progress callback handle everything
        await runner.findAndRun(pattern);
      }
    } catch (error) {
      reporter.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

