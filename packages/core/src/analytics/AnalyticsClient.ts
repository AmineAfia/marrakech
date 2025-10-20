/**
 * Analytics client for tracking prompt metadata, executions, and tool calls
 * Uses fire-and-forget strategy with batching to ensure zero latency impact
 */

import type {
  ToolCall,
  PromptMetadata,
  PromptExecution,
  IngestionRequest,
} from "./types.js";

export class AnalyticsClient {
  private static instance: AnalyticsClient | null = null;
  private readonly apiKey: string | null;
  private readonly endpoint: string;
  private readonly isDisabled: boolean;
  private queue: IngestionRequest;
  private flushTimeout?: NodeJS.Timeout;

  private constructor() {
    this.apiKey = process.env.MARRAKECH_API_KEY || null;
    this.endpoint =
      process.env.MARRAKECH_ANALYTICS_ENDPOINT ||
      "https://www.marrakesh.dev/api/ingest";
    this.isDisabled = process.env.MARRAKECH_ANALYTICS_DISABLED === "true";
    this.queue = { tool_calls: [], prompt_metadata: [], prompt_executions: [] };

    // Set up process exit handler for cleanup
    if (typeof process !== "undefined") {
      process.on("beforeExit", () => {
        this.flush();
      });
    }
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
      this.queue.prompt_metadata.push(data);
      this.scheduleFlush();
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
      this.queue.prompt_executions.push(data);
      this.scheduleFlush();
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
      this.queue.tool_calls.push(data);
      this.scheduleFlush();
    } catch (error) {
      this.logError("Failed to track tool call", error);
    }
  }

  /**
   * Flush all pending events to the server
   */
  public flush(): void {
    if (!this.shouldTrack() || this.isEmpty()) return;

    try {
      this.sendBatch(this.queue);
      this.clearQueue();
    } catch (error) {
      this.logError("Failed to flush analytics", error);
    }
  }

  /**
   * Check if analytics should be tracked
   */
  private shouldTrack(): boolean {
    return !this.isDisabled && this.apiKey !== null;
  }

  /**
   * Check if queue is empty
   */
  private isEmpty(): boolean {
    return (
      this.queue.tool_calls.length === 0 &&
      this.queue.prompt_metadata.length === 0 &&
      this.queue.prompt_executions.length === 0
    );
  }

  /**
   * Schedule automatic flush with debouncing
   */
  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, 100);

    // Also flush if queue gets large
    const totalEvents =
      this.queue.tool_calls.length +
      this.queue.prompt_metadata.length +
      this.queue.prompt_executions.length;

    if (totalEvents >= 50) {
      this.flush();
    }
  }

  /**
   * Log analytics errors with consistent formatting
   */
  private logError(
    context: string,
    error: unknown,
    additionalInfo?: Record<string, unknown>,
  ): void {
    if (process.env.MARRAKECH_DEBUG === "true") {
      const errorInfo = {
        context: `[Marrakech Analytics] ${context}`,
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
   * Send batch of events to the server (fire-and-forget)
   */
  private async sendBatch(data: IngestionRequest): Promise<void> {
    if (this.isEmpty()) return;

    try {
      // Validate and stringify JSON before sending
      const jsonString = this.validateAndStringifyJSON(data);

      if (process.env.MARRAKECH_DEBUG === "true") {
        console.log("[Marrakech Analytics] Sending batch to endpoint:", {
          endpoint: this.endpoint,
          bodyLength: jsonString.length,
          bodyPreview: `${jsonString.substring(0, 200)}...`,
          batchSize:
            (data.prompt_metadata?.length || 0) +
            (data.prompt_executions?.length || 0) +
            (data.tool_calls?.length || 0),
        });
      }

      // Fire-and-forget: don't await the response
      const fetchPromise = fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey || "",
          "User-Agent": "Marrakech-SDK",
        },
        body: jsonString,
      });

      // Handle the promise without blocking
      if (fetchPromise && typeof fetchPromise.catch === "function") {
        fetchPromise
          .then(async (response) => {
            // Only log errors, never log successful requests
            if (!response.ok && process.env.MARRAKECH_DEBUG === "true") {
              // Only consume response body for error cases
              try {
                const responseText = await response.text();
                console.error("[Marrakech Analytics] Server error response:", {
                  status: response.status,
                  statusText: response.statusText,
                  body: responseText,
                  requestBody: `${jsonString.substring(0, 500)}...`,
                });
              } catch (responseError) {
                this.logError("Error reading error response", responseError, {
                  status: response.status,
                  statusText: response.statusText,
                });
              }
            }
            // ✅ No logging for successful requests - completely silent
          })
          .catch((error) => {
            // Only log network errors in debug mode
            if (process.env.MARRAKECH_DEBUG === "true") {
              this.logError("Network error sending batch", error, {
                batchSize:
                  (data.prompt_metadata?.length || 0) +
                  (data.prompt_executions?.length || 0) +
                  (data.tool_calls?.length || 0),
                hasApiKey: !!this.apiKey,
              });
            }
            // ✅ Silent by default - no console output unless debug mode is enabled
          });
      }
    } catch (error) {
      // Silently ignore any errors - analytics should never break user code
      this.logError("Error sending batch", error, {
        batchSize:
          (data.prompt_metadata?.length || 0) +
          (data.prompt_executions?.length || 0) +
          (data.tool_calls?.length || 0),
        hasApiKey: !!this.apiKey,
      });
    }
  }

  /**
   * Validate and stringify JSON data before sending
   */
  private validateAndStringifyJSON(data: IngestionRequest): string {
    try {
      // First, validate that the data can be stringified
      const jsonString = JSON.stringify(data);

      // Validate that the stringified JSON can be parsed back
      const parsed = JSON.parse(jsonString);

      if (process.env.MARRAKECH_DEBUG === "true") {
        console.log("[Marrakech Analytics] JSON validation successful:", {
          originalType: typeof data,
          stringifiedLength: jsonString.length,
          parsedKeys: Object.keys(parsed),
          hasToolCalls: Array.isArray(parsed.tool_calls),
          hasPromptMetadata: Array.isArray(parsed.prompt_metadata),
          hasPromptExecutions: Array.isArray(parsed.prompt_executions),
        });
      }

      return jsonString;
    } catch (error) {
      this.logError("JSON validation failed", error, {
        dataType: typeof data,
        dataKeys: Object.keys(data),
        dataStringified: JSON.stringify(data, null, 2).substring(0, 500),
      });

      // Return a minimal valid JSON structure as fallback
      return JSON.stringify({
        tool_calls: [],
        prompt_metadata: [],
        prompt_executions: [],
      });
    }
  }

  /**
   * Clear the queue after successful send
   */
  private clearQueue(): void {
    this.queue = { tool_calls: [], prompt_metadata: [], prompt_executions: [] };
  }
}
