/**
 * Reporter - Beautiful terminal output for test results
 */

import chalk from "chalk";
import ora from "ora";
import type { RunnerResults } from "../runner/TestRunner.js";
import type { EvalResult, ExecutionStep } from "marrakech-sdk";
import { formatDuration, formatDiff } from "./formatters.js";

/**
 * Reporter for formatting and displaying test results
 */
export class Reporter {
  private spinner?: ReturnType<typeof ora>;
  private currentPrompt?: string;
  private currentTest?: string;
  private testProgress = { current: 0, total: 0 };

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
    console.log(chalk.bold.blue("\n👁️  Watch mode enabled\n"));
  }

  /**
   * Print test results to the console
   */
  printResults(results: RunnerResults): void {
    console.log(); // Blank line
    this.printOverallSummary(results);
  }

  /**
   * Print overall summary
   */
  private printOverallSummary(results: RunnerResults): void {
    const passRate =
      results.total > 0
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

    console.log(chalk.gray(`   Time: ${formatDuration(results.duration)}`));
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

  /**
   * Show file discovery
   */
  fileDiscovered(count: number): void {
    console.log(
      chalk.gray(`\n   Found ${count} test file${count === 1 ? "" : "s"}\n`),
    );
  }

  /**
   * Show prompt starting
   */
  promptStarting(name: string): void {
    console.log(chalk.bold.cyan(`📝 ${name}`));
  }

  /**
   * Show test starting with progress
   */
  testStarting(current: number, total: number, input: string): void {
    const truncated = input.length > 60 ? `${input.slice(0, 60)}...` : input;
    console.log(chalk.gray(`   [${current}/${total}] ${truncated}`));
  }

  /**
   * Show execution steps (tool calls)
   */
  showSteps(steps?: ExecutionStep[]): void {
    if (!steps || steps.length === 0) return;

    for (const step of steps) {
      if (step.toolCalls && step.toolCalls.length > 0) {
        for (const tc of step.toolCalls) {
          const inputStr = JSON.stringify(tc.input);
          const truncated =
            inputStr.length > 40 ? `${inputStr.slice(0, 40)}...` : inputStr;
          console.log(chalk.gray(`       🔧 ${tc.toolName}(${truncated})`));
        }
      }
    }
  }

  /**
   * Show test result
   */
  testCompleted(result: EvalResult): void {
    const icon = result.passed ? "✅" : "❌";
    const color = result.passed ? chalk.green : chalk.red;
    const duration = formatDuration(result.duration);

    this.showSteps(result.steps);

    console.log(
      color(
        `       ${icon} ${result.passed ? "Passed" : "Failed"} ${chalk.gray(`(${duration})`)}`,
      ),
    );

    if (!result.passed && result.error) {
      console.log(chalk.red(`          Error: ${result.error}`));
    } else if (!result.passed && result.expected !== undefined) {
      const diff = formatDiff(result.expected, result.output);
      console.log(chalk.gray(`          ${diff}`));
    }
    console.log(); // blank line
  }
}

