/**
 * Tests for eval-driven development features
 */

import { describe, it, expect, vi } from "vitest";
import { prompt } from "../src/PromptBuilder.js";
import { match, matchPartial, formatDiff } from "../src/testing/matchers.js";
import { PromptWithTests } from "../src/testing/PromptWithTests.js";
import type { Executor } from "../src/executors/types.js";

describe("Matchers", () => {
  describe("match", () => {
    it("should match identical primitives", () => {
      expect(match(42, 42)).toBe(true);
      expect(match("hello", "hello")).toBe(true);
      expect(match(true, true)).toBe(true);
      expect(match(null, null)).toBe(true);
    });

    it("should not match different primitives", () => {
      expect(match(42, 43)).toBe(false);
      expect(match("hello", "world")).toBe(false);
      expect(match(true, false)).toBe(false);
    });

    it("should match identical objects", () => {
      expect(match({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(match({ nested: { value: "test" } }, { nested: { value: "test" } })).toBe(true);
    });

    it("should not match different objects", () => {
      expect(match({ a: 1 }, { a: 2 })).toBe(false);
      expect(match({ a: 1 }, { b: 1 })).toBe(false);
      expect(match({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("should match identical arrays", () => {
      expect(match([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(match([{ a: 1 }], [{ a: 1 }])).toBe(true);
    });

    it("should not match different arrays", () => {
      expect(match([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(match([1, 2], [1, 2, 3])).toBe(false);
    });
  });

  describe("matchPartial", () => {
    it("should match when actual contains all expected properties", () => {
      expect(matchPartial({ a: 1, b: 2, c: 3 }, { a: 1, b: 2 })).toBe(true);
    });

    it("should not match when actual is missing expected properties", () => {
      expect(matchPartial({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("should match nested partial objects", () => {
      expect(
        matchPartial(
          { nested: { a: 1, b: 2 }, other: "value" },
          { nested: { a: 1 } },
        ),
      ).toBe(true);
    });

    it("should match partial arrays", () => {
      expect(matchPartial([1, 2, 3, 4], [1, 2])).toBe(true);
    });
  });

  describe("formatDiff", () => {
    it("should show equal message for identical values", () => {
      const diff = formatDiff(42, 42);
      expect(diff).toContain("equal");
    });

    it("should show both values for different values", () => {
      const diff = formatDiff({ a: 1 }, { a: 2 });
      expect(diff).toContain("Expected");
      expect(diff).toContain("Actual");
    });
  });
});

describe("PromptBuilder.test()", () => {
  it("should create PromptWithTests instance", () => {
    const p = prompt("Test prompt").test([{ input: "hello" }]);

    expect(p).toBeInstanceOf(PromptWithTests);
    expect(p.getTestCases()).toHaveLength(1);
    expect(p.getTestCases()[0].input).toBe("hello");
  });

  it("should accept executor in constructor", () => {
    const mockExecutor = vi.fn();
    const p = prompt("Test prompt").test([{ input: "hello" }], mockExecutor as unknown as Executor);

    expect(p).toBeInstanceOf(PromptWithTests);
  });

  it("should store test cases correctly", () => {
    const testCases = [
      { input: "test1", expect: "output1" },
      { input: "test2", expect: "output2", name: "named test" },
    ];

    const p = prompt("Test prompt").test(testCases);

    expect(p.getTestCases()).toEqual(testCases);
  });
});

describe("PromptWithTests.run()", () => {
  it("should run all test cases", async () => {
    const mockExecutor: Executor = async (_prompt, input) => {
      return {
        output: `response to ${input}`,
        steps: [],
        finishReason: "stop",
      };
    };

    const p = prompt("Test prompt").test([
      { input: "hello" },
      { input: "world" },
    ]);

    const results = await p.run({ executor: mockExecutor });

    expect(results.total).toBe(2);
    expect(results.passed).toBe(2);
    expect(results.failed).toBe(0);
    expect(results.results).toHaveLength(2);
  });

  it("should pass tests with matching expectations", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      return {
        output: { city: "Paris" },
        steps: [],
        finishReason: "stop",
      };
    };

    const p = prompt("Test prompt").test([
      { input: "Weather in Paris", expect: { city: "Paris" } },
    ]);

    const results = await p.run({ executor: mockExecutor });

    expect(results.passed).toBe(1);
    expect(results.failed).toBe(0);
  });

  it("should fail tests with mismatched expectations", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      return {
        output: { city: "London" },
        steps: [],
        finishReason: "stop",
      };
    };

    const p = prompt("Test prompt").test([
      { input: "Weather in Paris", expect: { city: "Paris" } },
    ]);

    const results = await p.run({ executor: mockExecutor });

    expect(results.passed).toBe(0);
    expect(results.failed).toBe(1);
  });

  it("should bail on first failure when bail option is true", async () => {
    let callCount = 0;
    const mockExecutor: Executor = async (_prompt, _input) => {
      callCount++;
      return {
        output: "wrong",
        steps: [],
        finishReason: "stop",
      };
    };

    const p = prompt("Test prompt").test([
      { input: "test1", expect: "correct" },
      { input: "test2", expect: "correct" },
      { input: "test3", expect: "correct" },
    ]);

    const results = await p.run({ executor: mockExecutor, bail: true });

    expect(callCount).toBe(1); // Should stop after first failure
    expect(results.total).toBe(1);
    expect(results.failed).toBe(1);
  });

  it("should handle executor errors gracefully", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      return {
        output: null,
        steps: [],
        finishReason: "error",
        error: "Test error",
      };
    };

    const p = prompt("Test prompt").test([{ input: "hello" }]);

    const results = await p.run({ executor: mockExecutor });

    expect(results.passed).toBe(0);
    expect(results.failed).toBe(1);
    expect(results.results[0].error).toBe("Test error");
  });

  it("should track execution time", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return {
        output: "response",
        steps: [],
        finishReason: "stop",
      };
    };

    const p = prompt("Test prompt").test([{ input: "hello" }]);

    const results = await p.run({ executor: mockExecutor });

    expect(results.duration).toBeGreaterThan(40);
    expect(results.results[0].duration).toBeGreaterThan(40);
  });

});

describe("PromptBuilder.eval()", () => {
  it("should run a single evaluation", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      return {
        output: "Bonjour",
        steps: [],
        finishReason: "stop",
      };
    };

    const result = await prompt("Translate to French").eval("Hello", {
      executor: mockExecutor,
      expect: "Bonjour",
    });

    expect(result.passed).toBe(true);
    expect(result.output).toBe("Bonjour");
  });

  it("should handle evaluation with no expectation", async () => {
    const mockExecutor: Executor = async (_prompt, _input) => {
      return {
        output: "response",
        steps: [],
        finishReason: "stop",
      };
    };

    const result = await prompt("Test").eval("input", {
      executor: mockExecutor,
    });

    expect(result.passed).toBe(true); // Passes when no expectation
    expect(result.output).toBe("response");
  });
});

describe("Integration with PromptBuilder", () => {
  it("should work with tools", () => {
    const p = prompt("Test")
      .tool({
        description: "Test tool",
        parameters: undefined,
      })
      .test([{ input: "hello" }]);

    expect(p).toBeInstanceOf(PromptWithTests);
    expect(p.getPrompt().tools).toHaveLength(1);
  });

  it("should work with output format", () => {
    const { z } = require("zod");
    const schema = z.object({ name: z.string() });

    const p = prompt("Test")
      .output(schema)
      .test([{ input: "hello" }]);

    expect(p).toBeInstanceOf(PromptWithTests);
    expect(p.getPrompt().outputFormat).toBeDefined();
  });
});

