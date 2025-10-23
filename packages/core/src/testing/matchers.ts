/**
 * Matchers for assertion logic in tests
 */

/**
 * Error thrown when a match fails with detailed diff information
 */
export class MatchError extends Error {
  constructor(
    message: string,
    public expected: unknown,
    public actual: unknown,
  ) {
    super(message);
    this.name = "MatchError";
  }
}

/**
 * Deep equality matching for test assertions
 * @param actual - The actual value received
 * @param expected - The expected value
 * @returns true if values match, false otherwise
 */
export function match(actual: unknown, expected: unknown): boolean {
  try {
    return deepEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Partial object matching - checks if actual contains all expected properties
 * @param actual - The actual value received
 * @param expected - The expected value (can be partial)
 * @returns true if actual contains all expected properties
 */
export function matchPartial(actual: unknown, expected: unknown): boolean {
  try {
    return partialEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Deep equality comparison
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Strict equality for primitives and same reference
  if (a === b) return true;

  // null/undefined handling
  if (a == null || b == null) return a === b;

  // Type mismatch
  if (typeof a !== typeof b) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // RegExp comparison
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Object comparison
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);

    if (aKeys.length !== bKeys.length) return false;

    for (const key of aKeys) {
      if (!bKeys.includes(key)) return false;
      if (
        !deepEqual(
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key],
        )
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Partial equality - checks if actual contains all properties from expected
 */
function partialEqual(actual: unknown, expected: unknown): boolean {
  // If expected is primitive, use strict equality
  if (expected == null || typeof expected !== "object") {
    return actual === expected;
  }

  // If actual is not an object but expected is, fail
  if (actual == null || typeof actual !== "object") {
    return false;
  }

  // Array handling - must have at least the expected items
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;

    // Every expected item must match at least one actual item
    for (const expectedItem of expected) {
      const found = actual.some((actualItem) =>
        partialEqual(actualItem, expectedItem),
      );
      if (!found) return false;
    }
    return true;
  }

  // Object handling - actual must have all expected keys with matching values
  for (const key of Object.keys(expected)) {
    if (!(key in (actual as object))) return false;

    if (
      !partialEqual(
        (actual as Record<string, unknown>)[key],
        (expected as Record<string, unknown>)[key],
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Generate a human-readable diff between expected and actual values
 * @param expected - Expected value
 * @param actual - Actual value
 * @returns Formatted diff string
 */
export function formatDiff(expected: unknown, actual: unknown): string {
  const expectedStr = JSON.stringify(expected, null, 2);
  const actualStr = JSON.stringify(actual, null, 2);

  if (expectedStr === actualStr) {
    return "Values are equal";
  }

  return `Expected:\n${expectedStr}\n\nActual:\n${actualStr}`;
}

/**
 * Create a detailed match error with diff
 */
export function createMatchError(
  expected: unknown,
  actual: unknown,
  context?: string,
): MatchError {
  const diff = formatDiff(expected, actual);
  const message = context
    ? `${context}\n\n${diff}`
    : `Assertion failed\n\n${diff}`;
  return new MatchError(message, expected, actual);
}
