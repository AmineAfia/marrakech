/**
 * Message utility functions for handling both CoreMessage and ModelMessage types
 */

import type { 
  UserContent, 
  AssistantContent, 
  ToolContent, 
  ModelMessage,
  Message
} from '../types.js';

/**
 * Normalize message content to string for analytics tracking
 */
export function normalizeContent(
  content: string | UserContent | AssistantContent | ToolContent
): string {
  if (typeof content === 'string') {
    return content;
  }

  // Handle array content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if ('text' in part && part.type === 'text') return part.text;
        if ('text' in part && part.type === 'reasoning') return `[Reasoning: ${part.text}]`;
        if ('type' in part && part.type === 'image') return '[Image]';
        if ('type' in part && part.type === 'file') return '[File]';
        if ('type' in part && part.type === 'tool-call') return `[Tool: ${part.toolName}]`;
        if ('type' in part && part.type === 'tool-result') return `[Result: ${part.toolName}]`;
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}

/**
 * Check if message is a ModelMessage (complex content)
 */
export function isModelMessage(message: unknown): message is ModelMessage {
  if (!message || typeof message !== 'object') return false;
  const msg = message as Record<string, unknown>;
  
  // Must have role and content
  if (!('role' in msg) || !('content' in msg)) return false;
  
  // Check if it's a valid ModelMessage role
  const validRoles = ['user', 'assistant', 'system', 'tool'];
  if (!validRoles.includes(msg.role as string)) return false;
  
  // For tool messages, content must be an array
  if (msg.role === 'tool') {
    return Array.isArray(msg.content);
  }
  
  // For other roles, content can be string or array
  // Since CoreMessage and ModelMessage with string content are structurally identical,
  // we return true for both to maintain compatibility
  return typeof msg.content === 'string' || Array.isArray(msg.content);
}

/**
 * Normalize a message to string content for analytics
 */
export function normalizeMessage(message: Message): string {
  return normalizeContent(message.content);
}

/**
 * Check if message has complex content (not just string)
 */
export function hasComplexContent(message: Message): boolean {
  if (typeof message.content === 'string') {
    return false;
  }
  
  if (Array.isArray(message.content)) {
    return message.content.some(part => 
      part.type === 'image' || 
      part.type === 'file' || 
      part.type === 'reasoning' ||
      part.type === 'tool-call' || 
      part.type === 'tool-result'
    );
  }
  
  return false;
}
