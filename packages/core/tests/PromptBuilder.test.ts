import { describe, it, expect } from "vitest";
import { PromptBuilder } from "../src/PromptBuilder.js";
import { tool } from "../src/tools/tool.js";
import { z } from "zod";

describe("PromptBuilder", () => {
  it("should create a basic prompt", () => {
    const prompt = new PromptBuilder({ name: "test-prompt" })
      .withPersona("You are a helpful assistant")
      .withRule("Always be polite")
      .withRule("Never lie");

    const compiled = prompt.compile();

    expect(compiled).toContain("You are a helpful assistant");
    expect(compiled).toContain("Always be polite");
    expect(compiled).toContain("Never lie");
  });

  it("should add examples", () => {
    const prompt = new PromptBuilder({ name: "test-prompt" })
      .withPersona("You are a helpful assistant")
      .withExample({
        user: "What is the weather?",
        assistant:
          "I cannot check the weather, but I can help you with other questions.",
      });

    const compiled = prompt.compile();

    expect(compiled).toContain("What is the weather?");
    expect(compiled).toContain("I cannot check the weather");
  });

  it("should add tools", () => {
    const getUserDetails = tool({
      description: "Get user details from database",
      parameters: z.object({
        userId: z.string().describe("User ID to lookup"),
      }),
    });

    const prompt = new PromptBuilder({ name: "test-prompt" })
      .withPersona("You are a helpful assistant")
      .withTool(getUserDetails);

    const compiled = prompt.compile();

    expect(compiled).toContain("Get user details from database");
  });

  it("should compile for different providers", () => {
    const prompt = new PromptBuilder({ name: "test-prompt" }).withPersona(
      "You are a helpful assistant",
    );

    const generic = prompt.compile("generic");
    const openai = prompt.compile("openai");
    const anthropic = prompt.compile("anthropic");

    expect(typeof generic).toBe("string");
    expect(typeof openai).toBe("object");
    expect(typeof anthropic).toBe("string");

    if (typeof openai === "object") {
      expect(openai).toHaveProperty("systemPrompt");
    }
  });

  it("should prepare messages", () => {
    const prompt = new PromptBuilder({ name: "test-prompt" }).withPersona(
      "You are a helpful assistant",
    );

    const messages = [{ role: "user" as const, content: "Hello" }];

    const prepared = prompt.prepareMessages(messages);

    expect(prepared).toHaveLength(2);
    expect(prepared[0].role).toBe("system");
    expect(prepared[1].role).toBe("user");
  });

  it("should replace existing system message", () => {
    const prompt = new PromptBuilder({ name: "test-prompt" }).withPersona(
      "You are a helpful assistant",
    );

    const messages = [
      { role: "system" as const, content: "Old system message" },
      { role: "user" as const, content: "Hello" },
    ];

    const prepared = prompt.prepareMessages(messages);

    expect(prepared).toHaveLength(2);
    expect(prepared[0].role).toBe("system");
    expect(prepared[0].content).toContain("You are a helpful assistant");
    expect(prepared[0].content).not.toContain("Old system message");
  });
});
