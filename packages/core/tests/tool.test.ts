import { describe, it, expect } from "vitest";
import {
  tool,
  isToolFunction,
  extractToolMetadata,
} from "../src/tools/tool.js";
import { z } from "zod";

describe("Tool utilities", () => {
  it("should create a tool function with metadata", () => {
    const getUserDetails = tool({
      description: "Get user details from database",
      parameters: z.object({
        userId: z.string().describe("User ID to lookup"),
      }),
      execute: async ({ userId }) => {
        return { id: userId, name: "John Doe" };
      },
    });

    expect(isToolFunction(getUserDetails)).toBe(true);
    expect(getUserDetails.description).toBe("Get user details from database");
    expect(getUserDetails.parameters).toBeDefined();
  });

  it("should extract tool metadata", () => {
    const getUserDetails = tool({
      description: "Get user details from database",
      parameters: z.object({
        userId: z.string().describe("User ID to lookup"),
      }),
    });

    const metadata = extractToolMetadata(getUserDetails);

    expect(metadata.description).toBe("Get user details from database");
    expect(metadata.schema).toBeDefined();
  });

  it("should identify non-tool functions", () => {
    const regularFunction = () => "hello";

    expect(isToolFunction(regularFunction)).toBe(false);
  });

  it("should handle tool without execute function", () => {
    const toolWithoutExecute = tool({
      description: "A tool without execute",
      parameters: z.object({
        param: z.string(),
      }),
    });

    expect(isToolFunction(toolWithoutExecute)).toBe(true);
    expect(toolWithoutExecute.description).toBe("A tool without execute");
  });
});
