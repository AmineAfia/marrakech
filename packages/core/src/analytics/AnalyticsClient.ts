/**
 * Analytics client for tracking prompt metadata, executions, and tool calls
 * Uses fire-and-forget strategy with batching to ensure zero latency impact
 */

import type { 
  ToolCall, 
  PromptMetadata, 
  PromptExecution, 
  IngestionRequest 
} from './types.js';

export class AnalyticsClient {
  private static instance: AnalyticsClient | null = null;
  private readonly apiKey: string | null;
  private readonly endpoint: string;
  private readonly isDisabled: boolean;
  private queue: IngestionRequest;
  private flushTimeout?: NodeJS.Timeout;

  private constructor() {
    this.apiKey = process.env.MARRAKECH_API_KEY || null;
    this.endpoint = process.env.MARRAKECH_ANALYTICS_ENDPOINT || 'https://marrakesh.dev/api/ingest';
    this.isDisabled = process.env.MARRAKECH_ANALYTICS_DISABLED === 'true';
    this.queue = { tool_calls: [], prompt_metadata: [], prompt_executions: [] };

    // Set up process exit handler for cleanup
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
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
      this.logError('Failed to track prompt metadata', error);
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
      this.logError('Failed to track prompt execution', error);
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
      this.logError('Failed to track tool call', error);
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
      this.logError('Failed to flush analytics', error);
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
    return this.queue.tool_calls.length === 0 && 
           this.queue.prompt_metadata.length === 0 && 
           this.queue.prompt_executions.length === 0;
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
    const totalEvents = this.queue.tool_calls.length + 
                        this.queue.prompt_metadata.length + 
                        this.queue.prompt_executions.length;
    
    if (totalEvents >= 50) {
      this.flush();
    }
  }

  /**
   * Send batch of events to the server (fire-and-forget)
   */
  private async sendBatch(data: IngestionRequest): Promise<void> {
    if (this.isEmpty()) return;

    try {
      // Fire-and-forget: don't await the response
      const fetchPromise = fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey || '',
        },
        body: JSON.stringify(data),
      });

      // Handle the promise without blocking
      if (fetchPromise && typeof fetchPromise.catch === 'function') {
        fetchPromise.catch(() => {
          // Silently ignore network errors - analytics should never break user code
          if (process.env.MARRAKECH_DEBUG === 'true') {
            console.error('[Marrakech Analytics] Network error sending batch');
          }
        });
      }
    } catch (error) {
      // Silently ignore any errors - analytics should never break user code
      if (process.env.MARRAKECH_DEBUG === 'true') {
        console.error('[Marrakech Analytics] Error sending batch:', error);
      }
    }
  }

  /**
   * Clear the queue after successful send
   */
  private clearQueue(): void {
    this.queue = { tool_calls: [], prompt_metadata: [], prompt_executions: [] };
  }

  /**
   * Log errors in debug mode only
   */
  private logError(message: string, error: unknown): void {
    if (process.env.MARRAKECH_DEBUG === 'true') {
      console.error(`[Marrakech Analytics] ${message}:`, error);
    }
  }
}
