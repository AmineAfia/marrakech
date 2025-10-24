/**
 * Formatters - Utility functions for formatting output
 */

import chalk from "chalk";
import type { TestResults } from "@marrakesh/core";

/**
 * Format duration in a human-readable way
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Format a diff between expected and actual values
 */
export function formatDiff(expected: unknown, actual: unknown): string {
  const expectedStr = JSON.stringify(expected, null, 2);
  const actualStr = JSON.stringify(actual, null, 2);

  if (expectedStr === actualStr) {
    return "Values are equal";
  }

  // Simple diff - show both values
  return `Expected: ${expectedStr}\n     Got: ${actualStr}`;
}

/**
 * Format test results summary
 */
export function formatSummary(results: TestResults): string {
  const { passed, failed, total, duration } = results;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";

  return `${passed}/${total} passed (${passRate}%) in ${formatDuration(duration)}`;
}

/**
 * Format an error with stack trace
 */
export function formatError(error: Error): string {
  let output = error.message;

  if (error.stack) {
    // Show first few lines of stack trace
    const stackLines = error.stack.split("\n").slice(1, 4);
    output += `\n${stackLines.join("\n")}`;
  }

  return output;
}

/**
 * Generate a horizontal bar chart for comparison
 * @param data - Array of { label, value, color, formatValue? } objects
 * @param maxWidth - Maximum width of the bar in characters
 * @returns Formatted bar chart string
 */
export function createBarChart(
  data: Array<{
    label: string;
    value: number;
    color?: string;
    formatValue?: (value: number) => string;
  }>,
  maxWidth = 40,
): string[] {
  const maxValue = Math.max(...data.map((d) => d.value));
  if (maxValue === 0) return [];

  return data.map(({ label, value, color, formatValue }) => {
    const barLength = Math.round((value / maxValue) * maxWidth);
    // Use gradient character (▓) for 3D effect instead of solid block (█)
    const bar = "▓".repeat(barLength);
    const spaces = " ".repeat(maxWidth - barLength);
    const percentage = ((value / maxValue) * 100).toFixed(0);

    const coloredBar = color ? chalk[color](bar) : bar;
    const displayValue = formatValue
      ? formatValue(value)
      : value.toLocaleString();
    return `  ${label.padEnd(15)} ${coloredBar}${spaces} ${displayValue} (${percentage}%)`;
  });
}
