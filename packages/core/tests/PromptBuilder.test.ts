import { describe, it, expect } from "vitest";
import { prompt } from "../src/PromptBuilder.js";
import { tool } from "../src/tools/tool.js";
import { z } from "zod";
import type {
  CoreMessage,
  UserModelMessage,
  AssistantModelMessage,
  Message,
} from "../src/types.js";

describe("PromptBuilder", () => {
  it("should create a basic prompt", () => {
    const p = prompt("You are a helpful assistant")
      .system("Always be polite")
      .system("Never lie");

    const result = p.toVercelAI();

    expect(result.messages[0].content).toContain("You are a helpful assistant");
    expect(result.messages[0].content).toContain("Always be polite");
    expect(result.messages[0].content).toContain("Never lie");
  });

  it("should add tools", () => {
    const getUserDetails = tool({
      description: "Get user details from database",
      parameters: z.object({
        userId: z.string().describe("User ID to lookup"),
      }),
    });

    const p = prompt("You are a helpful assistant").tool(getUserDetails);

    const result = p.toVercelAI();

    expect(result.tools).toBeDefined();
    expect(Object.keys(result.tools || {})).toHaveLength(1);
    expect(result.tools?.unnamed?.description).toBe(
      "Get user details from database",
    );
  });

  it("should convert to different providers", () => {
    const p = prompt("You are a helpful assistant");

    const vercelResult = p.toVercelAI();
    const openaiResult = p.toOpenAI();
    const anthropicResult = p.toAnthropic();

    expect(vercelResult.messages).toBeDefined();
    expect(openaiResult.messages).toBeDefined();
    expect(anthropicResult.system).toBeDefined();
  });

  it("should handle messages in integration methods", () => {
    const p = prompt("You are a helpful assistant");
    const messages = [{ role: "user" as const, content: "Hello" }];

    const result = p.toVercelAI(messages);

    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[1].role).toBe("user");
  });

  it("should work with multiple tools", () => {
    const tool1 = tool({
      description: "Tool 1",
      parameters: z.object({ param: z.string() }),
    });

    const tool2 = tool({
      description: "Tool 2",
      parameters: z.object({ param: z.string() }),
    });

    const p = prompt("You are helpful").tool(tool1, tool2);

    const result = p.toVercelAI();

    expect(Object.keys(result.tools || {})).toHaveLength(2);

    // Check that both tools are present (they should have unique names now)
    const toolKeys = Object.keys(result.tools || {});
    expect(toolKeys).toContain("unnamed");
    expect(toolKeys).toContain("unnamed_1");

    // Verify both tools have the correct descriptions
    const toolValues = Object.values(result.tools || {});
    const descriptions = toolValues.map(
      (tool: { description: string }) => tool.description,
    );
    expect(descriptions).toContain("Tool 1");
    expect(descriptions).toContain("Tool 2");
  });

  it("should add tools from an array using tools() method", () => {
    const tool1 = tool({
      description: "Array Tool 1",
      parameters: z.object({ param: z.string() }),
    });

    const tool2 = tool({
      description: "Array Tool 2",
      parameters: z.object({ param: z.string() }),
    });

    const toolArray = [tool1, tool2];
    const p = prompt("You are helpful").tools(toolArray);

    const result = p.toVercelAI();

    expect(Object.keys(result.tools || {})).toHaveLength(2);

    // Verify both tools have the correct descriptions
    const toolValues = Object.values(result.tools || {});
    const descriptions = toolValues.map(
      (tool: { description: string }) => tool.description,
    );
    expect(descriptions).toContain("Array Tool 1");
    expect(descriptions).toContain("Array Tool 2");
  });

  it("should handle empty array in tools() method", () => {
    const p = prompt("You are helpful").tools([]);

    const result = p.toVercelAI();

    expect(result.tools).toBeUndefined();
  });

  it("should work with chaining tool() and tools() methods", () => {
    const tool1 = tool({
      description: "Individual Tool",
      parameters: z.object({ param: z.string() }),
    });

    const tool2 = tool({
      description: "Array Tool 1",
      parameters: z.object({ param: z.string() }),
    });

    const tool3 = tool({
      description: "Array Tool 2",
      parameters: z.object({ param: z.string() }),
    });

    const p = prompt("You are helpful").tool(tool1).tools([tool2, tool3]);

    const result = p.toVercelAI();

    expect(Object.keys(result.tools || {})).toHaveLength(3);

    // Verify all tools have the correct descriptions
    const toolValues = Object.values(result.tools || {});
    const descriptions = toolValues.map(
      (tool: { description: string }) => tool.description,
    );
    expect(descriptions).toContain("Individual Tool");
    expect(descriptions).toContain("Array Tool 1");
    expect(descriptions).toContain("Array Tool 2");
  });

  it("should format tools correctly in toOpenAI() output", () => {
    const tool1 = tool({
      description: "OpenAI Tool 1",
      parameters: z.object({ param: z.string() }),
    });

    const tool2 = tool({
      description: "OpenAI Tool 2",
      parameters: z.object({ param: z.string() }),
    });

    const p = prompt("You are helpful").tools([tool1, tool2]);

    const result = p.toOpenAI();

    expect(result.tools).toBeDefined();
    expect(result.tools).toHaveLength(2);
    expect(result.tools?.[0].description).toBe("OpenAI Tool 1");
    expect(result.tools?.[1].description).toBe("OpenAI Tool 2");
  });

  it("should format tools correctly in toAnthropic() output", () => {
    const tool1 = tool({
      description: "Anthropic Tool 1",
      parameters: z.object({ param: z.string() }),
    });

    const tool2 = tool({
      description: "Anthropic Tool 2",
      parameters: z.object({ param: z.string() }),
    });

    const p = prompt("You are helpful").tools([tool1, tool2]);

    const result = p.toAnthropic();

    expect(result.tools).toBeDefined();
    expect(result.tools).toHaveLength(2);
    expect(result.tools?.[0].description).toBe("Anthropic Tool 1");
    expect(result.tools?.[1].description).toBe("Anthropic Tool 2");
  });

  describe("ModelMessage Support", () => {
    it("should work with CoreMessage (backwards compatibility)", () => {
      const p = prompt("You are a helpful assistant");
      const coreMessages: CoreMessage[] = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there!" },
      ];

      const result = p.toVercelAI(coreMessages);

      expect(result.messages).toHaveLength(3); // system + 2 messages
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("user");
      expect(result.messages[2].role).toBe("assistant");
    });

    it("should work with UserModelMessage with string content", () => {
      const p = prompt("You are a helpful assistant");
      const modelMessages: UserModelMessage[] = [
        { role: "user", content: "Hello world" },
      ];

      const result = p.toVercelAI(modelMessages);

      expect(result.messages).toHaveLength(2); // system + 1 message
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("user");
      expect(result.messages[1].content).toBe("Hello world");
    });

    it("should work with UserModelMessage with complex content", () => {
      const p = prompt("You are a helpful assistant");
      const modelMessages: UserModelMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "Look at this image:" },
            { type: "image", image: "data:image/png;base64,..." },
          ],
        },
      ];

      const result = p.toVercelAI(modelMessages);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].role).toBe("user");
      expect(Array.isArray(result.messages[1].content)).toBe(true);
    });

    it("should work with AssistantModelMessage with tool calls", () => {
      const p = prompt("You are a helpful assistant");
      const modelMessages: AssistantModelMessage[] = [
        {
          role: "assistant",
          content: [
            { type: "text", text: "I will call a tool:" },
            {
              type: "tool-call",
              toolCallId: "call_123",
              toolName: "getWeather",
              input: { city: "NYC" },
            },
          ],
        },
      ];

      const result = p.toVercelAI(modelMessages);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1].role).toBe("assistant");
      expect(Array.isArray(result.messages[1].content)).toBe(true);
    });

    it("should work with mixed CoreMessage and ModelMessage", () => {
      const p = prompt("You are a helpful assistant");
      const mixedMessages: Message[] = [
        { role: "user", content: "Hello" } as CoreMessage,
        {
          role: "assistant",
          content: [{ type: "text", text: "Hi! I can help you." }],
        } as AssistantModelMessage,
      ];

      const result = p.toVercelAI(mixedMessages);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("user");
      expect(result.messages[2].role).toBe("assistant");
    });

    it("should work with toOpenAI using ModelMessage", () => {
      const p = prompt("You are a helpful assistant");
      const modelMessages: UserModelMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image:" },
            { type: "image", image: "data:image/png;base64,..." },
          ],
        },
      ];

      const result = p.toOpenAI(modelMessages);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("user");
    });

    it("should work with toAnthropic (no messages parameter)", () => {
      const p = prompt("You are a helpful assistant");

      const result = p.toAnthropic();

      expect(result.system).toContain("You are a helpful assistant");
      expect(result.tools).toBeUndefined();
    });

    it("should handle reasoning parts in assistant messages", () => {
      const p = prompt("You are a helpful assistant");
      const assistantMessages: AssistantModelMessage[] = [
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: "Let me think about this..." },
            { type: "text", text: "Here is my answer" },
          ],
        },
      ];

      const result = p.toVercelAI(assistantMessages);

      expect(result.messages).toHaveLength(2); // system + assistant
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("assistant");
      expect(result.messages[1].content).toEqual([
        { type: "reasoning", text: "Let me think about this..." },
        { type: "text", text: "Here is my answer" },
      ]);
    });

    it("should handle file parts in assistant messages", () => {
      const p = prompt("You are a helpful assistant");
      const assistantMessages: AssistantModelMessage[] = [
        {
          role: "assistant",
          content: [
            { type: "text", text: "Here is the file:" },
            {
              type: "file",
              data: "data:text/plain;base64,...",
              mediaType: "text/plain",
            },
          ],
        },
      ];

      const result = p.toVercelAI(assistantMessages);

      expect(result.messages).toHaveLength(2); // system + assistant
      expect(result.messages[0].role).toBe("system");
      expect(result.messages[1].role).toBe("assistant");
      expect(result.messages[1].content).toEqual([
        { type: "text", text: "Here is the file:" },
        {
          type: "file",
          data: "data:text/plain;base64,...",
          mediaType: "text/plain",
        },
      ]);
    });
  });
});
