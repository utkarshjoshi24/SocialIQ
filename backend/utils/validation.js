/**
 * Shared input-validation helpers for controllers.
 */

export const MAX_POST_ID_LENGTH = 64;
export const MAX_CATEGORY_LENGTH = 50;

/**
 * Query/body value must be a plain string. Express's query parser turns
 * `?platform[$ne]=x` into an object and `?a=1&a=2` into an array; neither
 * may reach a MongoDB filter or string-only logic.
 */
export const isString = (value) => typeof value === 'string';

/**
 * Returns the trimmed string, undefined when absent, or null when the value is
 * present but not a string (caller should respond 400).
 */
export const optionalString = (value) => {
  if (value === undefined || value === '') return undefined;
  return isString(value) ? value.trim() : null;
};

/**
 * Strict calendar date: accepts YYYY-MM-DD (optionally followed by a time part)
 * and rejects impossible dates such as 2026-02-30, which `new Date()` would
 * silently roll over to March 2. Returns a Date or null.
 */
export const parseStrictDate = (value) => {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (!isString(value)) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(value.trim());
  if (isNaN(date.getTime())) return null;
  // Check the calendar components survived parsing (no rollover)
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return date;
};

/**
 * Finite, non-negative number (rejects NaN, Infinity, booleans, objects).
 * Empty string / undefined count as 0 to match the optional-metric semantics.
 */
export const parseNonNegativeNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'boolean' || (typeof value !== 'number' && !isString(value))) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** Integer hour 0–23, or null. Empty values are invalid (the field is required). */
export const parsePostingHour = (value) => {
  if (value === undefined || value === null || value === '' || typeof value === 'boolean') return null;
  if (typeof value !== 'number' && !isString(value)) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : null;
};

export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
