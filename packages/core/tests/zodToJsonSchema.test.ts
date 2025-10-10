import { describe, it, expect } from "vitest";
import { zodToJsonSchema } from "../src/schema/zodToJsonSchema.js";
import { z } from "zod";

describe("Zod to JSON Schema converter", () => {
  it("should convert simple string schema", () => {
    const schema = z.string().describe("A simple string");
    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      type: "string",
      description: "A simple string",
    });
  });

  it("should convert object schema", () => {
    const schema = z.object({
      name: z.string().describe("User name"),
      age: z.number().describe("User age"),
      email: z.string().email().describe("User email"),
    });

    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string", description: "User name" },
        age: { type: "number", description: "User age" },
        email: { type: "string", description: "User email" },
      },
      required: ["name", "age", "email"],
    });
  });

  it("should handle optional fields", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });

    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
      required: ["name"],
    });
  });

  it("should handle array schema", () => {
    const schema = z.array(z.string()).describe("List of strings");
    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      type: "array",
      items: { type: "string" },
      description: "List of strings",
    });
  });

  it("should handle union schema", () => {
    const schema = z.union([z.string(), z.number()]);
    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      anyOf: [{ type: "string" }, { type: "number" }],
    });
  });

  it("should handle enum schema", () => {
    const schema = z.enum(["red", "green", "blue"]);
    const jsonSchema = zodToJsonSchema(schema);

    expect(jsonSchema).toEqual({
      type: "string",
      enum: ["red", "green", "blue"],
    });
  });
});
