/**
 * Analytics client for tracking prompt metadata, executions, and tool calls
 * Uses fire-and-forget strategy with batching to ensure zero latency impact
 */

import type {
  ToolCall,
  PromptMetadata,
  PromptExecution,
  IngestionRequest,
  TestRun,
  TestCaseResult,
} from "./types.js";

export class AnalyticsClient {
  private static instance: AnalyticsClient | null = null;
  private readonly apiKey: string | null;
  private readonly endpoint: string;
  private readonly isDisabled: boolean;
  private inFlightRequests: Set<Promise<void>> = new Set();

  private constructor() {
    this.apiKey = process.env.MARRAKESH_API_KEY || null;
    this.endpoint =
      process.env.MARRAKESH_ANALYTICS_ENDPOINT ||
      "https://www.marrakesh.dev/api/ingest";
    this.isDisabled = process.env.MARRAKESH_ANALYTICS_DISABLED === "true";
  }

  /**
   * Get singleton instance of AnalyticsClient
   */
  public static getInstance(): AnalyticsClient {
    if (!AnalyticsClient.instance) {
      AnalyticsClient.instance = new AnalyticsClient();
    }
    return AnalyticsClient.instance;
  }

  /**
   * Track prompt metadata (called once per unique prompt)
   */
  public trackPromptMetadata(data: PromptMetadata): void {
    if (!this.shouldTrack()) return;

    try {
      this.sendEvent({
        prompt_metadata: [data],
        prompt_executions: [],
        tool_calls: [],
        test_runs: [],
        test_cases: [],
      });
    } catch (error) {
      this.logError("Failed to track prompt metadata", error);
    }
  }

  /**
   * Track prompt execution
   */
  public trackPromptExecution(data: PromptExecution): void {
    if (!this.shouldTrack()) return;

    try {
      this.sendEvent({
        prompt_metadata: [],
        prompt_executions: [data],
        tool_calls: [],
        test_runs: [],
        test_cases: [],
      });
    } catch (error) {
      this.logError("Failed to track prompt execution", error);
    }
  }

  /**
   * Track tool call execution
   */
  public trackToolCall(data: ToolCall): void {
    if (!this.shouldTrack()) return;

    try {
      this.sendEvent({
        prompt_metadata: [],
        prompt_executions: [],
        tool_calls: [data],
        test_runs: [],
        test_cases: [],
      });
    } catch (error) {
      this.logError("Failed to track tool call", error);
    }
  }

  /**
   * Track test run
   */
  public trackTestRun(data: TestRun): void {
    if (!this.shouldTrack()) return;

    try {
      if (process.env.MARRAKESH_DEBUG === "true") {
        console.log(
          "[Marrakesh Analytics] Tracking test run:",
          JSON.stringify(data, null, 2),
        );
      }
      this.sendEvent({
        prompt_metadata: [],
        prompt_executions: [],
        tool_calls: [],
        test_runs: [data],
        test_cases: [],
      });
    } catch (error) {
      this.logError("Failed to track test run", error);
    }
  }

  /**
   * Track test case result
   */
  public trackTestCase(data: TestCaseResult): void {
    if (!this.shouldTrack()) return;

    try {
      if (process.env.MARRAKESH_DEBUG === "true") {
        console.log(
          "[Marrakesh Analytics] Tracking test case:",
          JSON.stringify(data, null, 2),
        );
      }
      this.sendEvent({
        prompt_metadata: [],
        prompt_executions: [],
        tool_calls: [],
        test_runs: [],
        test_cases: [data],
      });
    } catch (error) {
      this.logError("Failed to track test case", error);
    }
  }

  /**
   * Check if analytics should be tracked
   */
  private shouldTrack(): boolean {
    return !this.isDisabled && this.apiKey !== null;
  }

  /**
   * Log analytics errors with consistent formatting
   */
  private logError(
    context: string,
    error: unknown,
    additionalInfo?: Record<string, unknown>,
  ): void {
    if (process.env.MARRAKESH_DEBUG === "true") {
      const errorInfo = {
        context: `[Marrakesh Analytics] ${context}`,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        endpoint: this.endpoint,
        timestamp: new Date().toISOString(),
        ...additionalInfo,
      };

      console.error(errorInfo.context, errorInfo);
    }
  }

  /**
   * Send event to the server (fire-and-forget)
   */
  private sendEvent(data: IngestionRequest): void {
    try {
      const jsonString = JSON.stringify(data);

      if (process.env.MARRAKESH_DEBUG === "true") {
        const totalEvents =
          (data.tool_calls?.length || 0) +
          (data.prompt_metadata?.length || 0) +
          (data.prompt_executions?.length || 0) +
          (data.test_runs?.length || 0) +
          (data.test_cases?.length || 0);

        console.log("[Marrakesh Analytics] Sending event:", {
          endpoint: this.endpoint,
          bodyLength: jsonString.length,
          totalEvents,
          toolCalls: data.tool_calls?.length || 0,
          promptMetadata: data.prompt_metadata?.length || 0,
          promptExecutions: data.prompt_executions?.length || 0,
          testRuns: data.test_runs?.length || 0,
          testCases: data.test_cases?.length || 0,
        });

        console.log("[Marrakesh Analytics] Full request payload:", jsonString);
      }

      // Create promise for tracking
      const requestPromise = (async () => {
        try {
          const response = await fetch(this.endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": this.apiKey || "",
              "User-Agent": "Marrakesh-SDK",
            },
            body: jsonString,
          });

          if (!response.ok) {
            const responseText = await response.text();
            console.error(
              `[Marrakesh Analytics] Error response (${response.status}):`,
              responseText,
            );
          }
        } catch (error) {
          this.logError("Analytics request failed", error);
        }
      })();

      // Track this request and clean up when done
      this.inFlightRequests.add(requestPromise);
      requestPromise.finally(() => {
        this.inFlightRequests.delete(requestPromise);
      });

      // Fire-and-forget: don't await
      void requestPromise;
    } catch (error) {
      this.logError("Failed to send analytics event", error);
    }
  }

  /**
   * Wait for all pending HTTP requests to complete (useful for CLI/testing)
   */
  public async waitForPendingRequests(): Promise<void> {
    if (this.inFlightRequests.size === 0) return;

    if (process.env.MARRAKESH_DEBUG === "true") {
      console.log(
        `[Marrakesh Analytics] Waiting for ${this.inFlightRequests.size} pending requests...`,
      );
    }

    await Promise.all(Array.from(this.inFlightRequests));
  }
}
