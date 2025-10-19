/**
 * Test command - Run prompt tests
 */

import { Command } from "commander";
import { TestRunner } from "../runner/TestRunner.js";
import { Reporter } from "../output/Reporter.js";
import { Watcher } from "../watch/Watcher.js";

interface TestOptions {
  watch?: boolean;
  bail?: boolean;
  concurrency?: string;
}

export const testCommand = new Command("test")
  .description("Run prompt tests")
  .argument("[pattern]", "File pattern to test", "**/*.{ts,js}")
  .option("-w, --watch", "Watch mode - rerun tests on file changes")
  .option("--bail", "Stop on first failure")
  .option("-c, --concurrency <n>", "Number of parallel tests", "5")
  .action(async (pattern: string, options: TestOptions) => {
    const reporter = new Reporter();
    const concurrency = Number.parseInt(options.concurrency || "5", 10);

    try {
      if (options.watch) {
        // Watch mode
        const watcher = new Watcher(pattern, {
          concurrency,
          bail: options.bail || false,
        });

        reporter.watchMode();
        await watcher.start((results) => {
          reporter.printResults(results);
        });
      } else {
        // Single run
        const runner = new TestRunner({
          concurrency,
          bail: options.bail || false,
        });

        reporter.startRun();
        const results = await runner.findAndRun(pattern);
        reporter.printResults(results);

        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
      }
    } catch (error) {
      reporter.error(
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    }
  });

