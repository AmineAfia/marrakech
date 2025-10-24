/**
 * Reporter - Beautiful terminal output for test results
 */

import chalk from "chalk";
import ora from "ora";
import type { RunnerResults } from "../runner/TestRunner.js";
import type { EvalResult, ExecutionStep } from "@marrakesh/core";
import { formatDuration, formatDiff, createBarChart } from "./formatters.js";

/**
 * Extract tool names used from execution steps
 */
function extractToolsUsed(result: EvalResult): string[] {
  if (!result.steps || result.steps.length === 0) {
    return [];
  }

  // Collect all tool names from all steps
  const toolNames = new Set<string>();

  for (const step of result.steps) {
    if (step.toolCalls && step.toolCalls.length > 0) {
      for (const toolCall of step.toolCalls) {
        toolNames.add(toolCall.toolName);
      }
    }
  }

  return Array.from(toolNames);
}

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

    // Check if any prompt has multiple executors
    const hasMultipleExecutors = results.promptResults.some(
      (pr) =>
        pr.results.executorResults &&
        Object.keys(pr.results.executorResults).length > 1,
    );

    if (hasMultipleExecutors) {
      this.printMatrixView(results);
    } else {
      this.printOverallSummary(results);
    }
  }

  /**
   * Print matrix view of test results (for multi-executor tests)
   */
  private printMatrixView(results: RunnerResults): void {
    for (const promptResult of results.promptResults) {
      const { promptName, results: testResults } = promptResult;

      if (!testResults.executorResults) continue;

      console.log(chalk.bold.cyan(`\n📝 ${promptName}`));
      console.log();

      const executorNames = Object.keys(testResults.executorResults);
      const numExecutors = executorNames.length;

      // Group results by test case input
      const testCaseMap = new Map<string, EvalResult[]>();
      for (const result of testResults.results) {
        if (!testCaseMap.has(result.input)) {
          testCaseMap.set(result.input, []);
        }
        const cases = testCaseMap.get(result.input);
        if (cases) {
          cases.push(result);
        }
      }

      // Calculate column widths
      const testCaseWidth = 35;
      const executorWidth = 14;

      // Print header
      const headerColumns = executorNames
        .map((name) =>
          name.substring(0, executorWidth - 2).padEnd(executorWidth),
        )
        .join(" | ");
      const header = `${"Test Case".padEnd(testCaseWidth)} | ${headerColumns}`;
      console.log(chalk.bold(header));
      console.log("-".repeat(header.length));

      // Print each test case row
      for (const [input, resultsForTest] of testCaseMap) {
        const truncatedInput =
          input.length > testCaseWidth - 2
            ? `${input.substring(0, testCaseWidth - 5)}...`
            : input;

        const cells = executorNames.map((executorName) => {
          const result = resultsForTest.find(
            (r) => r.executor?.model === executorName,
          );
          if (!result) return " ".padEnd(executorWidth);

          const icon = result.passed ? "✅" : "❌";
          const duration = formatDuration(result.duration);
          const cell = `${icon} (${duration})`;
          return cell.padEnd(executorWidth);
        });

        console.log(
          `${truncatedInput.padEnd(testCaseWidth)} | ${cells.join(" | ")}`,
        );

        // Show tools used (union of all tools across all executors for this test)
        const allTools = new Set<string>();
        for (const result of resultsForTest) {
          const tools = extractToolsUsed(result);
          for (const tool of tools) {
            allTools.add(tool);
          }
        }

        if (allTools.size > 0) {
          console.log(
            chalk.gray(`  Tools: ${Array.from(allTools).join(", ")}`),
          );
        }
      }

      console.log();

      if (executorNames.length > 1) {
        // Display token usage bar chart for multi-executor comparison
        console.log(chalk.bold("Token Usage Comparison:"));

        // Prepare data for bar chart with input/output token breakdown
        const tokenData = executorNames.map((name) => {
          const executorResult = testResults.executorResults?.[name];
          if (!executorResult) {
            return {
              label: name,
              value: 0,
              color: "gray",
              formatValue: (value: number) =>
                `${value.toLocaleString()} (0 in / 0 out)`,
            };
          }

          const executorUsage = executorResult.results.reduce(
            (
              acc: {
                totalTokens: number;
                promptTokens: number;
                completionTokens: number;
              },
              result: EvalResult,
            ) => {
              if (result.usage) {
                acc.totalTokens += result.usage.totalTokens;
                acc.promptTokens += result.usage.promptTokens;
                acc.completionTokens += result.usage.completionTokens;
              }
              return acc;
            },
            { totalTokens: 0, promptTokens: 0, completionTokens: 0 },
          );

          // Use red color if there are failed tests, gray otherwise
          const hasFailures = executorResult.failed > 0;
          const color = hasFailures ? "red" : "gray";

          return {
            label: name,
            value: executorUsage.totalTokens,
            color,
            formatValue: (value: number) =>
              `${value.toLocaleString()} (${executorUsage.promptTokens} in / ${executorUsage.completionTokens} out)`,
          };
        });

        // Display bar chart
        const chart = createBarChart(tokenData, 40);
        for (const line of chart) {
          console.log(line);
        }

        // Add latency comparison chart
        console.log();
        console.log(chalk.bold("Latency Comparison:"));
        const latencyData = executorNames.map((name) => {
          const executorResult = testResults.executorResults?.[name];
          if (!executorResult) {
            return { label: name, value: 0, color: "gray" };
          }

          // Calculate average latency for this executor
          const totalDuration = executorResult.results.reduce(
            (acc: number, result: EvalResult) => {
              return acc + result.duration;
            },
            0,
          );
          const averageLatency =
            executorResult.results.length > 0
              ? totalDuration / executorResult.results.length
              : 0;

          // Use red color if there are failed tests, white otherwise
          const hasFailures = executorResult.failed > 0;
          const color = hasFailures ? "red" : "white";

          return {
            label: name,
            value: averageLatency,
            color,
            formatValue: (value: number) => formatDuration(value),
          };
        });

        const latencyChart = createBarChart(latencyData, 40);
        for (const line of latencyChart) {
          console.log(line);
        }
        console.log();
      }
    }

    // Print overall summary
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
