import { describe, it, expect } from "vitest";
import { PromptBuilder } from "../src/PromptBuilder.js";
import { GenericCompiler } from "../src/compilers/GenericCompiler.js";
import { OpenAICompiler } from "../src/compilers/OpenAICompiler.js";
import { AnthropicCompiler } from "../src/compilers/AnthropicCompiler.js";

describe("Compilers", () => {
  const createTestPrompt = () => {
    return new PromptBuilder({ name: "test-prompt" })
      .withPersona("You are a helpful assistant")
      .withRule("Always be polite")
      .withExample({
        user: "Hello",
        assistant: "Hi there! How can I help you?",
      });
  };

  describe("GenericCompiler", () => {
    it("should compile basic prompt", () => {
      const prompt = createTestPrompt();
      const compiler = new GenericCompiler();
      const result = compiler.compile(prompt);

      expect(result).toContain("You are a helpful assistant");
      expect(result).toContain("Always be polite");
      expect(result).toContain("Hello");
      expect(result).toContain("Hi there!");
    });
  });

  describe("OpenAICompiler", () => {
    it("should compile with system prompt and tools", () => {
      const prompt = createTestPrompt();
      const compiler = new OpenAICompiler();
      const result = compiler.compile(prompt);

      expect(result).toHaveProperty("systemPrompt");
      expect(result.systemPrompt).toContain("You are a helpful assistant");
      expect(result).toHaveProperty("tools");
    });
  });

  describe("AnthropicCompiler", () => {
    it("should compile with XML tags", () => {
      const prompt = createTestPrompt();
      const compiler = new AnthropicCompiler();
      const result = compiler.compile(prompt);

      expect(result).toContain("<persona>");
      expect(result).toContain("</persona>");
      expect(result).toContain("<rules>");
      expect(result).toContain("</rules>");
      expect(result).toContain("<examples>");
      expect(result).toContain("</examples>");
    });
  });
});
