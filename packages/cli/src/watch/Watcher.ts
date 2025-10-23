/**
 * Watcher - Watch files and rerun tests on changes
 */

import chokidar from "chokidar";
import { TestRunner } from "../runner/TestRunner.js";
import type { RunnerResults, RunnerOptions } from "../runner/TestRunner.js";

/**
 * File watcher that reruns tests on changes
 */
export class Watcher {
  private pattern: string;
  private runner: TestRunner;
  private debounceTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(pattern: string, options: RunnerOptions = {}) {
    this.pattern = pattern;
    this.runner = new TestRunner(options);
  }

  /**
   * Start watching files and running tests
   */
  async start(onResults: (results: RunnerResults) => void): Promise<void> {
    // Initial run
    await this.runTests(onResults);

    // Set up file watcher
    const watcher = chokidar.watch(this.pattern, {
      ignored: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.git/**",
        "**/coverage/**",
      ],
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("change", (path) => {
      this.scheduleRun(path, onResults);
    });

    watcher.on("add", (path) => {
      this.scheduleRun(path, onResults);
    });

    // Handle keyboard input
    this.setupKeyboardHandlers(onResults);

    console.log(
      "\n👁️  Watching for changes... (Press Ctrl+C to exit, 'a' to run all tests)\n",
    );

    // Keep process alive
    return new Promise(() => {
      // Never resolves - runs until process is killed
    });
  }

  /**
   * Schedule a test run with debouncing
   */
  private scheduleRun(
    path: string,
    onResults: (results: RunnerResults) => void,
  ): void {
    if (this.isRunning) {
      return;
    }

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce for 300ms
    this.debounceTimer = setTimeout(() => {
      console.clear();
      console.log(`\n🔄 File changed: ${path}\n`);
      this.runTests(onResults);
    }, 300);
  }

  /**
   * Run tests
   */
  private async runTests(
    onResults: (results: RunnerResults) => void,
  ): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const results = await this.runner.findAndRun(this.pattern);
      onResults(results);
    } catch (error) {
      console.error("Error running tests:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Set up keyboard shortcuts
   */
  private setupKeyboardHandlers(
    onResults: (results: RunnerResults) => void,
  ): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.setEncoding("utf8");

      process.stdin.on("data", (key) => {
        // Ctrl+C
        if (key === "\u0003") {
          console.log("\n\n👋 Exiting...\n");
          process.exit(0);
        }

        // 'a' key - run all tests
        if (key === "a") {
          console.clear();
          console.log("\n🔄 Running all tests...\n");
          this.runTests(onResults);
        }
      });
    }
  }
}
