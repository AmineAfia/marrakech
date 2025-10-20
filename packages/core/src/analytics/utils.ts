/**
 * Analytics utility functions for ID generation and estimation
 */

/**
 * Generate a deterministic prompt ID from system prompt and tool names
 */
export function generatePromptId(systemPrompt: string, toolNames: string[]): string {
  const content = systemPrompt + toolNames.sort().join(',');
  
  // Use Web Crypto API if available (browser/Node.js 16+), otherwise fallback to simple hash
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // For now, use a simple hash function that works in all environments
    return simpleHash(content);
  }
  
  // Fallback for environments without crypto
  return simpleHash(content);
}

/**
 * Simple hash function for environments without crypto
 */
function simpleHash(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Generate a unique execution ID (UUID v4)
 */
export function generateExecutionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateSimpleUUID();
}

/**
 * Generate a unique session ID (UUID v4)
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateSimpleUUID();
}

/**
 * Generate a unique tool call ID (UUID v4)
 */
export function generateToolCallId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateSimpleUUID();
}

/**
 * Simple UUID v4 generator for environments without crypto.randomUUID
 */
function generateSimpleUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Estimate token count from text (rough approximation)
 * Uses the common heuristic of ~4 characters per token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on model and token usage
 * This is a rough approximation - actual costs vary by provider
 */
export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Rough cost estimates per 1K tokens (in USD)
  const costPer1K = {
    'gpt-4': 0.03,
    'gpt-4-turbo': 0.01,
    'gpt-3.5-turbo': 0.001,
    'claude-3-opus': 0.015,
    'claude-3-sonnet': 0.003,
    'claude-3-haiku': 0.00025,
    'unknown': 0.01, // Default fallback
  };

  const modelKey = Object.keys(costPer1K).find(key => 
    model.toLowerCase().includes(key.toLowerCase())
  ) || 'unknown';

  const inputCost = (inputTokens / 1000) * costPer1K[modelKey as keyof typeof costPer1K];
  const outputCost = (outputTokens / 1000) * costPer1K[modelKey as keyof typeof costPer1K];
  
  return Math.round((inputCost + outputCost) * 1000000) / 1000000; // Round to 6 decimal places
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Extract tool names from tool functions
 */
export function extractToolNames(tools: Array<{ name?: string }>): string[] {
  return tools.map(tool => tool.name || 'unnamed');
}
