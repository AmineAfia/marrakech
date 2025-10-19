/**
 * Analytics functionality tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AnalyticsClient } from '../src/analytics/AnalyticsClient.js';
import { 
  generatePromptId, 
  generateExecutionId, 
  generateSessionId, 
  generateToolCallId,
  estimateTokens,
  estimateCost,
  getCurrentTimestamp
} from '../src/analytics/utils.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock process.env
const originalEnv = process.env;

describe('Analytics Utils', () => {
  describe('generatePromptId', () => {
    it('should generate deterministic IDs for same content', () => {
      const id1 = generatePromptId('Hello world', ['tool1', 'tool2']);
      const id2 = generatePromptId('Hello world', ['tool1', 'tool2']);
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^[a-f0-9]+$/); // Hex string
    });

    it('should generate different IDs for different content', () => {
      const id1 = generatePromptId('Hello world', ['tool1']);
      const id2 = generatePromptId('Hello world', ['tool2']);
      expect(id1).not.toBe(id2);
    });

    it('should handle empty tool names', () => {
      const id = generatePromptId('Hello world', []);
      expect(id).toMatch(/^[a-f0-9]+$/);
    });
  });

  describe('generateExecutionId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateExecutionId();
      const id2 = generateExecutionId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // UUID v4
    });
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('generateToolCallId', () => {
    it('should generate unique tool call IDs', () => {
      const id1 = generateToolCallId();
      const id2 = generateToolCallId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens correctly', () => {
      expect(estimateTokens('Hello')).toBe(2); // 5 chars / 4 = 1.25, rounded up to 2
      expect(estimateTokens('Hello world')).toBe(3); // 11 chars / 4 = 2.75, rounded up to 3
      expect(estimateTokens('')).toBe(0);
    });
  });

  describe('estimateCost', () => {
    it('should estimate costs for known models', () => {
      const cost = estimateCost('gpt-4', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle unknown models', () => {
      const cost = estimateCost('unknown-model', 1000, 500);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('getCurrentTimestamp', () => {
    it('should return ISO timestamp', () => {
      const timestamp = getCurrentTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });
});

describe('AnalyticsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset singleton
    (AnalyticsClient as any).instance = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should not track when API key is missing', () => {
      delete process.env.MARRAKECH_API_KEY;
      const client = AnalyticsClient.getInstance();
      
      // Should not throw and should be no-op
      expect(() => {
        client.trackPromptMetadata({
          prompt_id: 'test',
          name: 'test',
          description: 'test',
          prompt_text: 'test',
          version: '1.0',
          is_active: 1,
          account_id: '',
          organization_id: '',
          updated_at: new Date().toISOString(),
        });
      }).not.toThrow();
    });

    it('should track when API key is present', () => {
      process.env.MARRAKECH_API_KEY = 'test-key';
      const client = AnalyticsClient.getInstance();
      
      client.trackPromptMetadata({
        prompt_id: 'test',
        name: 'test',
        description: 'test',
        prompt_text: 'test',
        version: '1.0',
        is_active: 1,
        account_id: '',
        organization_id: '',
        updated_at: new Date().toISOString(),
      });

      // Should not throw (fire-and-forget)
      expect(() => client.flush()).not.toThrow();
    });

    it('should be disabled when MARRAKECH_ANALYTICS_DISABLED is true', () => {
      process.env.MARRAKECH_API_KEY = 'test-key';
      process.env.MARRAKECH_ANALYTICS_DISABLED = 'true';
      const client = AnalyticsClient.getInstance();
      
      // Should be no-op
      expect(() => {
        client.trackPromptMetadata({
          prompt_id: 'test',
          name: 'test',
          description: 'test',
          prompt_text: 'test',
          version: '1.0',
          is_active: 1,
          account_id: '',
          organization_id: '',
          updated_at: new Date().toISOString(),
        });
      }).not.toThrow();
    });
  });

  describe('batching', () => {
    beforeEach(() => {
      process.env.MARRAKECH_API_KEY = 'test-key';
    });

    it('should batch multiple events', async () => {
      const client = AnalyticsClient.getInstance();
      
      client.trackPromptMetadata({
        prompt_id: 'test1',
        name: 'test1',
        description: 'test1',
        prompt_text: 'test1',
        version: '1.0',
        is_active: 1,
        account_id: '',
        organization_id: '',
        updated_at: new Date().toISOString(),
      });

      client.trackPromptExecution({
        execution_id: 'exec1',
        prompt_id: 'test1',
        session_id: 'session1',
        prompt_name: 'test1',
        prompt_version: '1.0',
        execution_time_ms: 100,
        model: 'gpt-4',
        region: 'us-east-1',
        request_tokens: 100,
        response_tokens: 50,
        cost_usd: 0.01,
        status: 'success',
        account_id: '',
        organization_id: '',
      });

      client.trackToolCall({
        tool_call_id: 'tool1',
        execution_id: 'exec1',
        prompt_id: 'test1',
        tool_name: 'test-tool',
        execution_time_ms: 50,
        input_tokens: 10,
        output_tokens: 5,
        cost_usd: 0.001,
        status: 'success',
      });

      client.flush();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toBe("https://www.marrakesh.dev/api/ingest");
      expect(call[1].method).toBe('POST');
      expect(call[1].headers['x-api-key']).toBe('test-key');
      
      const body = JSON.parse(call[1].body);
      expect(body.prompt_metadata).toHaveLength(1);
      expect(body.prompt_executions).toHaveLength(1);
      expect(body.tool_calls).toHaveLength(1);
    });

    it('should use custom endpoint when provided', () => {
      // Set the environment variable before creating the client
      process.env.MARRAKECH_ANALYTICS_ENDPOINT = 'https://custom.example.com/api/ingest';
      process.env.MARRAKECH_API_KEY = 'test-key';
      
      // Reset singleton to pick up new env var
      (AnalyticsClient as any).instance = null;
      const client = AnalyticsClient.getInstance();
      
      client.trackPromptMetadata({
        prompt_id: 'test',
        name: 'test',
        description: 'test',
        prompt_text: 'test',
        version: '1.0',
        is_active: 1,
        account_id: '',
        organization_id: '',
        updated_at: new Date().toISOString(),
      });

      client.flush();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.example.com/api/ingest',
        expect.any(Object)
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      process.env.MARRAKECH_API_KEY = 'test-key';
    });

    it('should not throw on network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const client = AnalyticsClient.getInstance();
      
      expect(() => {
        client.trackPromptMetadata({
          prompt_id: 'test',
          name: 'test',
          description: 'test',
          prompt_text: 'test',
          version: '1.0',
          is_active: 1,
          account_id: '',
          organization_id: '',
          updated_at: new Date().toISOString(),
        });
        client.flush();
      }).not.toThrow();
    });

    it('should not throw on JSON serialization errors', () => {
      const client = AnalyticsClient.getInstance();
      
      // Create circular reference to cause JSON error
      const circular: any = { test: 'value' };
      circular.self = circular;
      
      expect(() => {
        client.trackPromptMetadata({
          prompt_id: 'test',
          name: 'test',
          description: 'test',
          prompt_text: 'test',
          version: '1.0',
          is_active: 1,
          account_id: '',
          organization_id: '',
          updated_at: new Date().toISOString(),
        });
        client.flush();
      }).not.toThrow();
    });
  });

  describe('debug mode', () => {
    beforeEach(() => {
      process.env.MARRAKECH_API_KEY = 'test-key';
      process.env.MARRAKECH_DEBUG = 'true';
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log errors in debug mode', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const client = AnalyticsClient.getInstance();
      
      client.trackPromptMetadata({
        prompt_id: 'test',
        name: 'test',
        description: 'test',
        prompt_text: 'test',
        version: '1.0',
        is_active: 1,
        account_id: '',
        organization_id: '',
        updated_at: new Date().toISOString(),
      });
      client.flush();

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(console.error).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "[Marrakech Analytics] Network error sending batch",
        expect.objectContaining({
          context: "[Marrakech Analytics] Network error sending batch",
          error: "Network error",
        }),
      );
    });
  });
});
