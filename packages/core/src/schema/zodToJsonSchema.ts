import type { z } from "zod";

/**
 * Converts a Zod schema to JSON Schema format
 * Handles primitives, objects, arrays, unions, optionals, and descriptions
 */
export function zodToJsonSchema(schema: z.ZodType): object {
  return convertZodToJsonSchema(schema, new Set());
}

function convertZodToJsonSchema(
  schema: z.ZodType,
  seen: Set<z.ZodType>,
): object {
  // Prevent infinite recursion
  if (seen.has(schema)) {
    return { type: "object" };
  }
  seen.add(schema);

  try {
    const def = schema._def as {
      typeName: string;
      shape?: () => Record<string, z.ZodType>;
      innerType?: z.ZodType;
      options?: z.ZodType[];
      values?: unknown[];
      value?: unknown;
      type?: z.ZodType;
      [key: string]: unknown;
    };

    // Handle ZodString
    if (def.typeName === "ZodString") {
      const result: Record<string, unknown> = { type: "string" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodNumber
    if (def.typeName === "ZodNumber") {
      const result: Record<string, unknown> = { type: "number" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodBoolean
    if (def.typeName === "ZodBoolean") {
      const result: Record<string, unknown> = { type: "boolean" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodArray
    if (def.typeName === "ZodArray") {
      const result: Record<string, unknown> = {
        type: "array",
        items: convertZodToJsonSchema((def.type ?? {}) as z.ZodType, seen),
      };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodObject
    if (def.typeName === "ZodObject") {
      const shape = def.shape?.() ?? {};
      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convertZodToJsonSchema(value as z.ZodType, seen);

        // Check if field is required (not optional)
        if (!isOptional(value as z.ZodType)) {
          required.push(key);
        }
      }

      const result: Record<string, unknown> = {
        type: "object",
        properties,
      };

      if (required.length > 0) {
        result.required = required;
      }

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Handle ZodOptional
    if (def.typeName === "ZodOptional") {
      return convertZodToJsonSchema(def.innerType as z.ZodType, seen);
    }

    // Handle ZodNullable
    if (def.typeName === "ZodNullable") {
      return convertZodToJsonSchema(def.innerType as z.ZodType, seen);
    }

    // Handle ZodUnion
    if (def.typeName === "ZodUnion") {
      const options = (def.options ?? []).map((option: z.ZodType) =>
        convertZodToJsonSchema(option, seen),
      );

      const result: Record<string, unknown> = {
        anyOf: options,
      };

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Handle ZodEnum
    if (def.typeName === "ZodEnum") {
      const result: Record<string, unknown> = {
        type: "string",
        enum: def.values,
      };

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Handle ZodLiteral
    if (def.typeName === "ZodLiteral") {
      const result: Record<string, unknown> = {
        const: def.value,
      };

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Fallback for unknown types
    const result: Record<string, unknown> = { type: "object" };
    if (schema.description) {
      result.description = schema.description;
    }
    return result;
  } finally {
    seen.delete(schema);
  }
}

/**
 * Check if a Zod type is optional
 */
function isOptional(schema: z.ZodType): boolean {
  const def = schema._def as {
    typeName: string;
    [key: string]: unknown;
  };
  return def.typeName === "ZodOptional" || def.typeName === "ZodNullable";
}

/**
 * Extract description from a Zod schema
 */
export function extractDescription(schema: z.ZodType): string | undefined {
  return schema.description;
}
