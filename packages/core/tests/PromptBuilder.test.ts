import { describe, it, expect } from "vitest";
import { prompt } from "../src/PromptBuilder.js";
import { tool } from "../src/tools/tool.js";
import { z } from "zod";

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

  it("should handle structured output", () => {
    const p = prompt("You are a helpful assistant").output(
      z.object({
        answer: z.string(),
        confidence: z.number(),
      }),
    );

    const result = p.toVercelAI();

    expect(result.responseFormat).toBeDefined();
    expect(result.responseFormat?.type).toBe("json_schema");
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
    const descriptions = toolValues.map((tool: any) => tool.description);
    expect(descriptions).toContain("Tool 1");
    expect(descriptions).toContain("Tool 2");
  });
});