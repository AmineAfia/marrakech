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
    const def = schema._def as any;

    // Handle ZodString
    if (def.typeName === "ZodString") {
      const result: any = { type: "string" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodNumber
    if (def.typeName === "ZodNumber") {
      const result: any = { type: "number" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodBoolean
    if (def.typeName === "ZodBoolean") {
      const result: any = { type: "boolean" };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodArray
    if (def.typeName === "ZodArray") {
      const result: any = {
        type: "array",
        items: convertZodToJsonSchema(def.type, seen),
      };
      if (schema.description) {
        result.description = schema.description;
      }
      return result;
    }

    // Handle ZodObject
    if (def.typeName === "ZodObject") {
      const shape = def.shape();
      const properties: Record<string, any> = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = convertZodToJsonSchema(value as z.ZodType, seen);

        // Check if field is required (not optional)
        if (!isOptional(value as z.ZodType)) {
          required.push(key);
        }
      }

      const result: any = {
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
      return convertZodToJsonSchema(def.innerType, seen);
    }

    // Handle ZodNullable
    if (def.typeName === "ZodNullable") {
      return convertZodToJsonSchema(def.innerType, seen);
    }

    // Handle ZodUnion
    if (def.typeName === "ZodUnion") {
      const options = def.options.map((option: z.ZodType) =>
        convertZodToJsonSchema(option, seen),
      );

      const result: any = {
        anyOf: options,
      };

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Handle ZodEnum
    if (def.typeName === "ZodEnum") {
      const result: any = {
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
      const result: any = {
        const: def.value,
      };

      if (schema.description) {
        result.description = schema.description;
      }

      return result;
    }

    // Fallback for unknown types
    const result: any = { type: "object" };
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
  const def = schema._def as any;
  return def.typeName === "ZodOptional" || def.typeName === "ZodNullable";
}

/**
 * Extract description from a Zod schema
 */
export function extractDescription(schema: z.ZodType): string | undefined {
  return schema.description;
}
