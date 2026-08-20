/**
 * Safely extract a string value from req.params or req.query
 * Handles all Express query parameter types including ParsedQs
 */
export const getString = (value: any): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'string') {
      return value[0];
    }
    return undefined;
  }
  // Skip ParsedQs objects and other non-string types
  if (typeof value === 'object' && value !== null) {
    return undefined;
  }
  return undefined;
};

/**
 * Safely extract a string value from req.params or req.query (required)
 * Throws if value is undefined or invalid
 */
export const getRequiredString = (value: any): string => {
  const str = getString(value);
  if (!str) {
    throw new Error('Required parameter is missing or invalid');
  }
  return str;
};

/**
 * Safely extract an integer from req.query
 */
export const getInteger = (value: any): number | undefined => {
  const str = getString(value);
  if (!str) return undefined;
  const num = parseInt(str, 10);
  return isNaN(num) ? undefined : num;
};
