import { describe, it, expect } from "vitest";
import { prompt, toGeneric, toOpenAI, toAnthropic } from "../src/index.js";

describe("Compilers", () => {
  const createTestPrompt = () => {
    return prompt("You are a helpful assistant").system("Always be polite");
  };

  describe("GenericCompiler", () => {
    it("should compile basic prompt", () => {
      const promptBuilder = createTestPrompt();
      const result = toGeneric(promptBuilder);

      expect(result).toContain("You are a helpful assistant");
      expect(result).toContain("Always be polite");
    });
  });

  describe("OpenAICompiler", () => {
    it("should compile with system prompt and tools", () => {
      const promptBuilder = createTestPrompt();
      const result = toOpenAI(promptBuilder);

      expect(result).toHaveProperty("messages");
      expect(result.messages[0].content).toContain(
        "You are a helpful assistant",
      );
      expect(result).toHaveProperty("tools");
    });
  });

  describe("AnthropicCompiler", () => {
    it("should compile with system prompt", () => {
      const promptBuilder = createTestPrompt();
      const result = toAnthropic(promptBuilder);

      expect(result).toHaveProperty("system");
      expect(result.system).toContain("You are a helpful assistant");
      expect(result.system).toContain("Always be polite");
    });
  });
});
