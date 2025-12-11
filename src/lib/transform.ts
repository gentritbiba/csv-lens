// Client-side JavaScript transform execution
// Runs in the browser with data from localStorage/memory

const STORAGE_KEY = "analysis_query_results";

/**
 * Save query results to localStorage
 */
export function saveQueryResult(stepIndex: number, data: unknown[]): void {
  try {
    const existing = getStoredResults();
    existing[`step_${stepIndex}`] = data;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn("Failed to save query result to localStorage:", e);
  }
}

/**
 * Get all stored query results
 */
export function getStoredResults(): Record<string, unknown[]> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Clear stored results (call when starting new analysis)
 */
export function clearStoredResults(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * SECURITY: List of blocked patterns that could be used to escape the sandbox
 * These patterns can access the Function constructor or other dangerous APIs
 */
const BLOCKED_PATTERNS = [
  /constructor\s*\[/i,           // obj.constructor['constructor'] escape
  /constructor\s*\./i,           // obj.constructor.constructor escape
  /\[\s*['"`]constructor/i,      // ['constructor'] access
  /\.\s*__proto__/i,             // __proto__ access
  /\[\s*['"`]__proto__/i,        // ['__proto__'] access
  /prototype\s*\[/i,             // prototype manipulation
  /\.\s*prototype/i,             // prototype access
  /import\s*\(/i,                // dynamic import
  /require\s*\(/i,               // require (shouldn't work but block anyway)
  /eval\s*\(/i,                  // eval
  /Function\s*\(/i,              // new Function
  /setTimeout\s*\(/i,            // setTimeout with string
  /setInterval\s*\(/i,           // setInterval with string
  /with\s*\(/i,                  // with statement (deprecated but dangerous)
  /Reflect\s*\./i,               // Reflect API
  /Proxy\s*\(/i,                 // Proxy constructor
  /Symbol\s*\./i,                // Symbol (can be used for exploits)
  /Object\s*\.\s*definePropert/i,// Object.defineProperty/defineProperties
  /Object\s*\.\s*setPrototypeOf/i, // Object.setPrototypeOf
  /Object\s*\.\s*getOwnPropertyDescriptor/i, // Descriptor access
];

/**
 * Validate that code doesn't contain dangerous patterns
 */
function validateCodeSafety(code: string): void {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      throw new Error(
        `Transform code contains blocked pattern for security reasons. ` +
        `Please use only safe array operations like map, filter, reduce, sort.`
      );
    }
  }

  // Block attempts to access constructor through computed properties
  // Match patterns like: [expr] where expr could resolve to 'constructor'
  if (/\[\s*[^'"`\]]+\s*\]/.test(code)) {
    // Allow simple string/number indices but warn about dynamic access
    const dynamicAccess = code.match(/\[\s*([^'"`\]\d][^'"`\]]*)\s*\]/g);
    if (dynamicAccess) {
      for (const access of dynamicAccess) {
        // Allow simple variable names for array indexing
        if (!/^\[\s*\w+\s*\]$/.test(access) && !/^\[\s*\d+\s*\]$/.test(access)) {
          // Complex expression - could be dangerous
          if (access.includes('+') || access.includes('(')) {
            throw new Error(
              `Transform code contains complex computed property access which is not allowed for security reasons.`
            );
          }
        }
      }
    }
  }
}

/**
 * Safely execute JavaScript code to transform data
 * Runs in browser with limited scope - no access to DOM or dangerous APIs
 *
 * SECURITY NOTE: This function executes user-provided code. While we implement
 * multiple layers of protection, it runs in the browser context. The sandboxing
 * blocks common escape techniques but is not a complete security boundary.
 */
export function executeTransform(
  code: string,
  data: unknown[],
  allSteps: Record<string, unknown[] | null>
): unknown[] {
  // SECURITY: Validate code doesn't contain dangerous patterns
  validateCodeSafety(code);

  // Capture safe globals BEFORE creating the sandboxed function
  // Use frozen objects to prevent modification
  const safeGlobals = Object.freeze({
    JSON: Object.freeze({ parse: JSON.parse, stringify: JSON.stringify }),
    // Math is already immutable, just pass it through
    Math,
    Object: Object.freeze({
      keys: Object.keys,
      values: Object.values,
      entries: Object.entries,
      assign: Object.assign,
      fromEntries: Object.fromEntries,
    }),
    Array: Object.freeze({
      isArray: Array.isArray,
      from: Array.from,
    }),
    String: Object.freeze({
      fromCharCode: String.fromCharCode,
    }),
    Number: Object.freeze({
      isNaN: Number.isNaN,
      isFinite: Number.isFinite,
      parseInt: Number.parseInt,
      parseFloat: Number.parseFloat,
    }),
    // Pass Date constructor so `new Date()` works
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    console: Object.freeze({ log: () => {}, warn: () => {}, error: () => {} }),
  });

  // Filter allSteps to only include non-null arrays FIRST (for error message)
  const safeAllSteps: Record<string, unknown[]> = {};
  for (const [key, value] of Object.entries(allSteps)) {
    if (Array.isArray(value)) {
      safeAllSteps[key] = value;
    }
  }

  // Provide helpful context on error
  const availableSteps = Object.keys(safeAllSteps);
  const dataInfo = `data has ${data.length} rows with columns: ${data.length > 0 ? Object.keys(data[0] as object).join(', ') : 'none'}`;
  const stepsInfo = `allSteps has: ${availableSteps.length > 0 ? availableSteps.join(', ') : 'no steps yet'}`;

  // Check for common code issues
  if (!code.includes('return')) {
    throw new Error(
      `Transform code must include a 'return' statement. Your code:\n${code}\n\nExample: return data.map(row => ({ ...row, newCol: row.x * 2 }))`
    );
  }

  // Limit code length to prevent DoS
  if (code.length > 10000) {
    throw new Error("Transform code is too long (max 10000 characters)");
  }

  // Create a function with 'data', 'allSteps', and safe globals in scope
  // The code should be a function body that returns the transformed data
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  let fn: Function;
  try {
    // Note: We can't shadow 'eval' or 'arguments' in strict mode as they are reserved.
    // Instead, we rely on the BLOCKED_PATTERNS regex to catch any usage of eval().
    fn = new Function('data', 'allSteps', '$globals', `
      "use strict";
      // Destructure safe globals
      const { JSON, Math, Object, Array, String, Number, Date, parseInt, parseFloat, isNaN, isFinite, console } = $globals;

      // Block dangerous APIs by shadowing them with undefined
      const fetch = undefined;
      const XMLHttpRequest = undefined;
      const localStorage = undefined;
      const sessionStorage = undefined;
      const document = undefined;
      const window = undefined;
      const globalThis = undefined;
      const self = undefined;
      const Function = undefined;
      const constructor = undefined;
      const Reflect = undefined;
      const Proxy = undefined;

      ${code}
    `);
  } catch (syntaxError) {
    throw new Error(
      `JavaScript syntax error in transform code: ${syntaxError instanceof Error ? syntaxError.message : 'Unknown error'}\n\nYour code:\n${code}`
    );
  }

  // Limit input data size
  if (data.length > 10000) {
    throw new Error("Data too large for transformation (max 10000 rows)");
  }

  let result: unknown;
  try {
    result = fn(data, safeAllSteps, safeGlobals);
  } catch (runtimeError) {
    throw new Error(
      `JavaScript runtime error: ${runtimeError instanceof Error ? runtimeError.message : 'Unknown error'}\n\nContext: ${dataInfo}. ${stepsInfo}\n\nYour code:\n${code}`
    );
  }

  // Check for undefined result (missing return or return without value)
  if (result === undefined) {
    throw new Error(
      `Transform returned undefined. Make sure your code has a 'return' statement that returns an array.\n\nContext: ${dataInfo}. ${stepsInfo}\n\nYour code:\n${code}`
    );
  }

  // Validate result
  try {
    validateTransformResult(result);
  } catch (validationError) {
    throw new Error(
      `${validationError instanceof Error ? validationError.message : 'Validation failed'}\n\nContext: ${dataInfo}. ${stepsInfo}`
    );
  }

  // Limit result size
  if ((result as unknown[]).length > 1000) {
    return (result as unknown[]).slice(0, 1000);
  }

  return result as unknown[];
}

/**
 * Validate that transform result is chart/table-ready
 */
function validateTransformResult(result: unknown): asserts result is Record<string, unknown>[] {
  // Must be an array
  if (!Array.isArray(result)) {
    throw new Error("Transform must return an array of objects, got: " + typeof result);
  }

  // Must not be empty
  if (result.length === 0) {
    throw new Error("Transform returned empty array - must return at least one row");
  }

  // Each item must be an object (not primitive)
  const firstItem = result[0];
  if (typeof firstItem !== 'object' || firstItem === null || Array.isArray(firstItem)) {
    throw new Error(
      "Transform must return array of objects like [{col1: val1, col2: val2}, ...], got array of: " +
      typeof firstItem
    );
  }

  // Check for nested objects/arrays in values (these show as [object Object] in tables)
  const checkForNestedValues = (obj: Record<string, unknown>, rowIndex: number) => {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && typeof value === 'object') {
        throw new Error(
          `Row ${rowIndex} has nested ${Array.isArray(value) ? 'array' : 'object'} in column "${key}". ` +
          `Values must be flat (string, number, boolean, null). ` +
          `Flatten your data: return one row per data point instead of nesting.`
        );
      }
    }
  };

  // Validate first item has no nested values
  checkForNestedValues(firstItem as Record<string, unknown>, 0);

  // Get keys from first object for consistency check
  const expectedKeys = Object.keys(firstItem).sort().join(',');

  // Validate all objects have consistent keys and no nested values (check first 10)
  for (let i = 1; i < Math.min(result.length, 10); i++) {
    const item = result[i];
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Row ${i} is not an object`);
    }
    checkForNestedValues(item as Record<string, unknown>, i);
    const itemKeys = Object.keys(item).sort().join(',');
    if (itemKeys !== expectedKeys) {
      throw new Error(
        `Inconsistent keys: row 0 has [${expectedKeys}], row ${i} has [${itemKeys}]. ` +
        `All rows must have the same columns.`
      );
    }
  }
}
