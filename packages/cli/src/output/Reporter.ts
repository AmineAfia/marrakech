/**
 * Reporter - Beautiful terminal output for test results
 */

import chalk from "chalk";
import ora from "ora";
import type { RunnerResults } from "../runner/TestRunner.js";
import {
  formatDuration,
  formatDiff,
  formatSummary,
} from "./formatters.js";

/**
 * Reporter for formatting and displaying test results
 */
export class Reporter {
  private spinner?: ReturnType<typeof ora>;

  /**
   * Indicate that tests are starting
   */
  startRun(): void {
    console.log(chalk.bold("\n🧪 Running tests...\n"));
  }

  /**
   * Show watch mode indicator
   */
  watchMode(): void {
    console.log(
      chalk.bold.blue("\n👁️  Watch mode enabled\n"),
    );
  }

  /**
   * Print test results to the console
   */
  printResults(results: RunnerResults): void {
    console.log(); // Blank line

    // Print results for each prompt
    for (const promptResult of results.promptResults) {
      console.log(
        chalk.bold.cyan(`\n📝 ${promptResult.promptName}`),
      );

      for (const testResult of promptResult.results.results) {
        if (testResult.passed) {
          // Passed test
          console.log(
            chalk.green(
              `  ✅ ${testResult.input} ${chalk.gray(`(${formatDuration(testResult.duration)})`)}`,
            ),
          );
        } else {
          // Failed test
          console.log(
            chalk.red(
              `  ❌ ${testResult.input} ${chalk.gray(`(${formatDuration(testResult.duration)})`)}`,
            ),
          );

          // Show error or diff
          if (testResult.error) {
            console.log(chalk.red(`     Error: ${testResult.error}`));
          } else if (testResult.expected !== undefined) {
            const diff = formatDiff(
              testResult.expected,
              testResult.output,
            );
            console.log(chalk.gray(`     ${diff}`));
          }
        }
      }

      // Print prompt summary
      const promptSummary = formatSummary(promptResult.results);
      console.log(chalk.gray(`  ${promptSummary}`));
    }

    // Print overall summary
    console.log();
    this.printOverallSummary(results);
  }

  /**
   * Print overall summary
   */
  private printOverallSummary(results: RunnerResults): void {
    const passRate = results.total > 0
      ? ((results.passed / results.total) * 100).toFixed(1)
      : "0.0";

    if (results.failed === 0) {
      console.log(
        chalk.bold.green(
          `✨ All tests passed! ${results.passed}/${results.total} (${passRate}%)`,
        ),
      );
    } else {
      console.log(
        chalk.bold.red(
          `❌ ${results.failed} test${results.failed === 1 ? "" : "s"} failed`,
        ),
      );
      console.log(
        chalk.gray(
          `   ${results.passed} passed, ${results.failed} failed, ${results.total} total`,
        ),
      );
    }

    console.log(
      chalk.gray(
        `   Time: ${formatDuration(results.duration)}`,
      ),
    );
    console.log(); // Blank line
  }

  /**
   * Display an error message
   */
  error(message: string): void {
    console.error(chalk.bold.red("\n❌ Error:"), message);
    console.log(); // Blank line
  }

  /**
   * Show a spinner
   */
  showSpinner(text: string): void {
    this.spinner = ora(text).start();
  }

  /**
   * Stop the spinner
   */
  stopSpinner(success = true, text?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(text);
      } else {
        this.spinner.fail(text);
      }
      this.spinner = undefined;
    }
  }
}

