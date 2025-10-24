import type { z } from "zod";

// JSON value type for tool outputs
export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

// AI SDK v5.0 compatible tool result output type
export type LanguageModelV3ToolResultOutput =
  | { type: "text"; value: string }
  | { type: "json"; value: JSONValue }
  | { type: "error-text"; value: string }
  | { type: "error-json"; value: JSONValue }
  | {
      type: "content";
      value: Array<
        | {
            type: "text";
            /**
             * Text content.
             */
            text: string;
          }
        | {
            type: "media";
            /**
             * Base-64 encoded media data.
             */
            data: string;
            /**
             * IANA media type.
             * @see https://www.iana.org/assignments/media-types/media-types.xhtml
             */
            mediaType: string;
          }
      >;
    };

// Generic Message type (no external dependencies)
export interface CoreMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// AI SDK compatible message types
export type TextPart = {
  type: "text";
  text: string;
};

export type ImagePart = {
  type: "image";
  image: string | URL | Uint8Array | ArrayBuffer | Buffer;
  mediaType?: string;
};

export type FilePart = {
  type: "file";
  data: string | URL | Uint8Array | ArrayBuffer | Buffer;
  mediaType: string;
  filename?: string;
};

export type ToolCallPart = {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  input: unknown;
};

export type ToolResultPart = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: LanguageModelV3ToolResultOutput;
  isError?: boolean;
};

export type ReasoningPart = {
  type: "reasoning";
  text: string;
};

export type UserContent = string | Array<TextPart | ImagePart | FilePart>;
export type AssistantContent =
  | string
  | Array<TextPart | FilePart | ReasoningPart | ToolCallPart | ToolResultPart>;
export type ToolContent = Array<ToolResultPart>;

export interface UserModelMessage {
  role: "user";
  content: UserContent;
}

export interface AssistantModelMessage {
  role: "assistant";
  content: AssistantContent;
}

export interface SystemModelMessage {
  role: "system";
  content: string;
}

export interface ToolModelMessage {
  role: "tool";
  content: ToolContent;
}

export type ModelMessage =
  | UserModelMessage
  | AssistantModelMessage
  | SystemModelMessage
  | ToolModelMessage;

// Union type that accepts both formats
export type Message = CoreMessage | ModelMessage;

// Tool function type with metadata attached (supports both AI SDK v4 and v5)
export interface ToolFunction {
  description: string;
  parameters?: z.ZodType; // AI SDK v4 format
  inputSchema?: z.ZodType; // AI SDK v5 format
  execute?: (...args: unknown[]) => Promise<unknown>;
}
