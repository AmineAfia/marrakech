/**
 * Message utilities tests
 */

import { describe, it, expect } from 'vitest';
import { 
  normalizeContent, 
  isModelMessage, 
  normalizeMessage, 
  hasComplexContent 
} from '../src/utils/messageUtils.js';
import type { 
  CoreMessage, 
  UserModelMessage, 
  AssistantModelMessage,
  ToolModelMessage,
  TextPart,
  ImagePart,
  FilePart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart
} from '../src/types.js';

describe('Message Utils', () => {
  describe('normalizeContent', () => {
    it('should handle string content', () => {
      expect(normalizeContent('Hello world')).toBe('Hello world');
    });

    it('should handle text parts', () => {
      const content: TextPart[] = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'world' }
      ];
      expect(normalizeContent(content)).toBe('Hello world');
    });

    it('should handle image parts', () => {
      const content: (TextPart | ImagePart)[] = [
        { type: 'text', text: 'Look at this' },
        { type: 'image', image: 'data:image/png;base64,...' }
      ];
      expect(normalizeContent(content)).toBe('Look at this [Image]');
    });

    it('should handle file parts', () => {
      const content: (TextPart | FilePart)[] = [
        { type: 'text', text: 'Here is a file' },
        { type: 'file', data: 'data:text/plain;base64,...', mediaType: 'text/plain' }
      ];
      expect(normalizeContent(content)).toBe('Here is a file [File]');
    });

    it('should handle tool call parts', () => {
      const content: (TextPart | ToolCallPart)[] = [
        { type: 'text', text: 'I will call a tool' },
        { 
          type: 'tool-call', 
          toolCallId: 'call_123', 
          toolName: 'getWeather', 
          input: { city: 'NYC' } 
        }
      ];
      expect(normalizeContent(content)).toBe('I will call a tool [Tool: getWeather]');
    });

    it('should handle tool result parts', () => {
      const content: ToolResultPart[] = [
        { 
          type: 'tool-result', 
          toolCallId: 'call_123', 
          toolName: 'getWeather', 
          output: { type: 'text', value: 'Sunny, 72°F' }
        }
      ];
      expect(normalizeContent(content)).toBe('[Result: getWeather]');
    });

    it('should handle reasoning parts', () => {
      const content: (ReasoningPart | TextPart)[] = [
        { type: 'reasoning', text: 'Let me think about this...' },
        { type: 'text', text: 'Here is my answer' }
      ];
      expect(normalizeContent(content)).toBe('[Reasoning: Let me think about this...] Here is my answer');
    });

    it('should handle file parts in assistant messages', () => {
      const content: (TextPart | FilePart)[] = [
        { type: 'text', text: 'Here is the file:' },
        { 
          type: 'file', 
          data: 'data:text/plain;base64,...', 
          mediaType: 'text/plain' 
        }
      ];
      expect(normalizeContent(content)).toBe('Here is the file: [File]');
    });

    it('should handle mixed content', () => {
      const content: (TextPart | ImagePart)[] = [
        { type: 'text', text: 'Here is an image:' },
        { type: 'image', image: 'data:image/png;base64,...' }
      ];
      expect(normalizeContent(content)).toBe('Here is an image: [Image]');
    });
  });

  describe('isModelMessage', () => {
    it('should identify ModelMessage with complex content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'image', image: 'data:image/png;base64,...' }
        ]
      };
      expect(isModelMessage(message)).toBe(true);
    });

    it('should identify ModelMessage with string content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: 'Hello world'
      };
      // ModelMessage with string content is structurally compatible with CoreMessage
      expect(isModelMessage(message)).toBe(true);
    });

    it('should identify tool messages as ModelMessage', () => {
      const message: ToolModelMessage = {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_123',
            toolName: 'getWeather',
            output: { type: 'text', value: 'Sunny' }
          }
        ]
      };
      expect(isModelMessage(message)).toBe(true);
    });

    it('should identify CoreMessage as ModelMessage (structurally compatible)', () => {
      const message: CoreMessage = {
        role: 'user',
        content: 'Hello world'
      };
      // CoreMessage with string content is structurally compatible with ModelMessage
      expect(isModelMessage(message)).toBe(true);
    });

    it('should return false for invalid objects', () => {
      expect(isModelMessage(null)).toBe(false);
      expect(isModelMessage(undefined)).toBe(false);
      expect(isModelMessage('string')).toBe(false);
      expect(isModelMessage({})).toBe(false);
    });
  });

  describe('normalizeMessage', () => {
    it('should normalize CoreMessage', () => {
      const message: CoreMessage = {
        role: 'user',
        content: 'Hello world'
      };
      expect(normalizeMessage(message)).toBe('Hello world');
    });

    it('should normalize UserModelMessage with string content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: 'Hello world'
      };
      expect(normalizeMessage(message)).toBe('Hello world');
    });

    it('should normalize UserModelMessage with complex content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this image:' },
          { type: 'image', image: 'data:image/png;base64,...' }
        ]
      };
      expect(normalizeMessage(message)).toBe('Look at this image: [Image]');
    });

    it('should normalize AssistantModelMessage with tool calls', () => {
      const message: AssistantModelMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will call a tool:' },
          { 
            type: 'tool-call', 
            toolCallId: 'call_123', 
            toolName: 'getWeather', 
            input: { city: 'NYC' } 
          }
        ]
      };
      expect(normalizeMessage(message)).toBe('I will call a tool: [Tool: getWeather]');
    });
  });

  describe('hasComplexContent', () => {
    it('should return false for string content', () => {
      const message: CoreMessage = {
        role: 'user',
        content: 'Hello world'
      };
      expect(hasComplexContent(message)).toBe(false);
    });

    it('should return false for ModelMessage with string content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: 'Hello world'
      };
      expect(hasComplexContent(message)).toBe(false);
    });

    it('should return true for ModelMessage with image content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at this:' },
          { type: 'image', image: 'data:image/png;base64,...' }
        ]
      };
      expect(hasComplexContent(message)).toBe(true);
    });

    it('should return true for ModelMessage with file content', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Here is a file:' },
          { type: 'file', data: 'data:text/plain;base64,...', mediaType: 'text/plain' }
        ]
      };
      expect(hasComplexContent(message)).toBe(true);
    });

    it('should return true for ModelMessage with tool calls', () => {
      const message: AssistantModelMessage = {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Calling tool:' },
          { type: 'tool-call', toolCallId: 'call_123', toolName: 'getWeather', input: {} }
        ]
      };
      expect(hasComplexContent(message)).toBe(true);
    });

    it('should return true for ModelMessage with tool results', () => {
      const message: ToolModelMessage = {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_123',
            toolName: 'getWeather',
            output: { type: 'text', value: 'Sunny' }
          }
        ]
      };
      expect(hasComplexContent(message)).toBe(true);
    });

    it('should return true for ModelMessage with reasoning content', () => {
      const message: AssistantModelMessage = {
        role: 'assistant',
        content: [
          { type: 'reasoning', text: 'Let me think about this...' },
          { type: 'text', text: 'Here is my answer' }
        ]
      };
      expect(hasComplexContent(message)).toBe(true);
    });

    it('should return false for ModelMessage with only text parts', () => {
      const message: UserModelMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'text', text: 'world' }
        ]
      };
      expect(hasComplexContent(message)).toBe(false);
    });
  });
});
