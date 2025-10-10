/**
 * Simple token counter using a basic estimation
 * In production, you might want to use tiktoken for more accurate counting
 */

/**
 * Estimate token count for a given text
 * This is a rough estimation - for production use tiktoken
 */
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters for English text
  // This is a simplified approach - use tiktoken for accuracy
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost based on token count
 * Using approximate OpenAI pricing (adjust as needed)
 */
export function estimateCost(tokenCount: number, model = "gpt-4"): number {
  const pricing: Record<string, number> = {
    "gpt-4": 0.00003, // $0.03 per 1K tokens
    "gpt-3.5-turbo": 0.000002, // $0.002 per 1K tokens
    "claude-3": 0.000015, // Approximate Claude pricing
  };

  const pricePerToken = pricing[model] || pricing["gpt-4"];
  return (tokenCount / 1000) * pricePerToken;
}