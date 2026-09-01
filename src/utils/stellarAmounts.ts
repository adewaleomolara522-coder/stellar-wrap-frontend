/**
 * Stellar amount utilities
 *
 * All on-chain amounts in Stellar are stored as integer stroops.
 * 1 XLM = 10,000,000 stroops (10^7).
 *
 * This module provides:
 *   - `stroopsToXlm`    – bigint stroops → 7-dp XLM string
 *   - `xlmToStroops`    – XLM string → bigint stroops
 *   - `formatXlm`       – human-readable display with configurable decimals
 *   - `formatStroops`   – display a stroop value as XLM with unit label
 *   - `parseXlmInput`   – safe parse of user-typed XLM strings
 *   - `isValidXlmAmount`– validates a user-provided XLM input string
 *   - `truncatePublicKey`– shortens a Stellar public key for display
 *
 * Precision guarantee
 * ───────────────────
 * Stellar enforces a 7 decimal place maximum (1 stroop = 0.0000001 XLM).
 * Any input with more than 7 dp throws a `RangeError` so the caller always
 * knows the value cannot be faithfully represented on-chain.
 *
 * No `any` is used in this module.
 */

/** A value expressed in integer stroops (1 XLM = 10_000_000 stroops). */
export type Stroops = bigint;

/** A value expressed as a 7-decimal-place XLM string, e.g. "1.2500000". */
export type XlmAmount = string;

/** Number of stroops per XLM. */
const STROOPS_PER_XLM = 10_000_000n;
const STROOPS_PER_XLM_NUMBER = 10_000_000;

// ─── Core conversion ─────────────────────────────────────────────────────────

/**
 * Converts a raw stroop integer to a fixed 7-dp XLM string.
 *
 * @example
 * stroopsToXlm(12_500_000n)  // → "1.2500000"
 * stroopsToXlm(0n)           // → "0.0000000"
 */
export function stroopsToXlm(stroops: Stroops): XlmAmount {
  if (stroops < 0n) {
    throw new RangeError(`Stroops value must be non-negative, received ${stroops}`);
  }
  const whole = stroops / STROOPS_PER_XLM;
  const frac = (stroops % STROOPS_PER_XLM).toString().padStart(7, "0");
  return `${whole}.${frac}`;
}

/**
 * Converts an XLM string to an integer stroops bigint.
 * Throws `RangeError` if the input has more than 7 decimal places.
 *
 * @example
 * xlmToStroops("1.25")       // → 12_500_000n
 * xlmToStroops("0.0000001")  // → 1n
 */
export function xlmToStroops(xlm: XlmAmount): Stroops {
  const trimmed = xlm.trim();
  if (!isValidXlmAmount(trimmed)) {
    throw new RangeError(`Invalid XLM amount: "${xlm}"`);
  }

  const parts = trimmed.split(".");
  const wholePart = parts[0] ?? "0";
  const fracRaw = parts[1] ?? "";

  if (fracRaw.length > 7) {
    throw new RangeError(
      `Amount "${xlm}" has more than 7 decimal places. Stellar supports a maximum of 7-dp precision.`,
    );
  }

  const fracPadded = fracRaw.padEnd(7, "0");
  const wholeStroops = BigInt(wholePart) * STROOPS_PER_XLM;
  const fracStroops = BigInt(fracPadded);

  return wholeStroops + fracStroops;
}

// ─── Display formatting ──────────────────────────────────────────────────────

/** Options for `formatXlm`. */
export interface FormatXlmOptions {
  /**
   * Number of decimal places to display.
   * Must be between 0 and 7 inclusive.
   * @default 7
   */
  decimals?: number;
  /**
   * Whether to append the " XLM" unit label.
   * @default false
   */
  showUnit?: boolean;
  /**
   * Whether to use locale-specific thousands separators.
   * @default false
   */
  useGrouping?: boolean;
}

/**
 * Formats an XLM string or bigint stroop value for human display.
 *
 * @example
 * formatXlm("1.2500000")                          // → "1.2500000"
 * formatXlm("1.2500000", { decimals: 2 })         // → "1.25"
 * formatXlm("1.2500000", { showUnit: true })       // → "1.2500000 XLM"
 * formatXlm(12_500_000n,  { decimals: 2 })         // → "1.25"
 * formatXlm("1000.0000000", { useGrouping: true }) // → "1,000.0000000"
 */
export function formatXlm(
  amount: XlmAmount | Stroops,
  options: FormatXlmOptions = {},
): string {
  const { decimals = 7, showUnit = false, useGrouping = false } = options;

  if (decimals < 0 || decimals > 7 || !Number.isInteger(decimals)) {
    throw new RangeError(`decimals must be an integer between 0 and 7, received ${decimals}`);
  }

  const xlmString: XlmAmount =
    typeof amount === "bigint" ? stroopsToXlm(amount) : amount;

  const numeric = parseFloat(xlmString);
  if (!Number.isFinite(numeric)) {
    throw new RangeError(`Cannot format non-finite XLM value: "${xlmString}"`);
  }

  const formatted = useGrouping
    ? numeric.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : numeric.toFixed(decimals);

  return showUnit ? `${formatted} XLM` : formatted;
}

/**
 * Formats a stroop value as a human-readable XLM amount, always appending
 * the unit label.
 *
 * @example
 * formatStroops(12_500_000n)               // → "1.2500000 XLM"
 * formatStroops(12_500_000n, { decimals: 2 }) // → "1.25 XLM"
 */
export function formatStroops(
  stroops: Stroops,
  options: Omit<FormatXlmOptions, "showUnit"> = {},
): string {
  return formatXlm(stroops, { ...options, showUnit: true });
}

// ─── Input parsing ───────────────────────────────────────────────────────────

/** Result of a safe XLM parse operation. */
export type ParseXlmResult =
  | { ok: true; stroops: Stroops; xlm: XlmAmount }
  | { ok: false; error: string };

/**
 * Safely parses a user-typed XLM string into stroops without throwing.
 * Returns a discriminated union so callers can handle errors without try/catch.
 *
 * @example
 * parseXlmInput("1.25")   // → { ok: true, stroops: 12_500_000n, xlm: "1.2500000" }
 * parseXlmInput("abc")    // → { ok: false, error: "..." }
 * parseXlmInput("1.12345678") // → { ok: false, error: "..." }
 */
export function parseXlmInput(input: string): ParseXlmResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: "Amount is required." };
  }

  if (!isValidXlmAmount(trimmed)) {
    return {
      ok: false,
      error:
        "Invalid amount. Enter a positive number with up to 7 decimal places (e.g. 1.5 or 0.0000001).",
    };
  }

  const parts = trimmed.split(".");
  const fracPart = parts[1] ?? "";
  if (fracPart.length > 7) {
    return {
      ok: false,
      error: "Stellar supports a maximum of 7 decimal places.",
    };
  }

  try {
    const stroops = xlmToStroops(trimmed);
    if (stroops === 0n) {
      return { ok: false, error: "Amount must be greater than zero." };
    }
    return { ok: true, stroops, xlm: stroopsToXlm(stroops) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Returns true if the string is a valid non-negative XLM amount with at most
 * 7 decimal places. Does NOT check that the amount is > 0.
 *
 * Accepts: "0", "1", "1.5", "1.2500000", "100000.0000001"
 * Rejects: "-1", "abc", "1.12345678", "", "1e7"
 */
export function isValidXlmAmount(value: string): boolean {
  // Must be a plain decimal number (no scientific notation, no sign)
  return /^\d+(\.\d{1,7})?$/.test(value.trim());
}

// ─── Comparison helpers ──────────────────────────────────────────────────────

/**
 * Returns true if `a` is greater than or equal to `b`.
 *
 * @example
 * stroopsGte(10n, 5n)  // → true
 * stroopsGte(5n, 10n)  // → false
 */
export function stroopsGte(a: Stroops, b: Stroops): boolean {
  return a >= b;
}

/**
 * Clamps a stroop value to [min, max].
 */
export function clampStroops(value: Stroops, min: Stroops, max: Stroops): Stroops {
  if (min > max) {
    throw new RangeError(`clampStroops: min (${min}) must be ≤ max (${max})`);
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// ─── Number → stroop helpers ─────────────────────────────────────────────────

/**
 * Converts a JS `number` expressed in XLM to stroops.
 * Only safe for values that fit within Number precision (< 9e15 XLM).
 * For large amounts use `xlmToStroops` with a string input.
 *
 * @example
 * numberToStroops(1.25)  // → 12_500_000n
 */
export function numberToStroops(xlm: number): Stroops {
  if (!Number.isFinite(xlm) || xlm < 0) {
    throw new RangeError(`numberToStroops: expected a non-negative finite number, received ${xlm}`);
  }
  // Round to 7 dp to avoid floating-point drift before converting
  const rounded = Math.round(xlm * STROOPS_PER_XLM_NUMBER);
  return BigInt(rounded);
}

// ─── Public key display ──────────────────────────────────────────────────────

/** Options for `truncatePublicKey`. */
export interface TruncateKeyOptions {
  /**
   * Number of characters to keep from the start.
   * @default 6
   */
  prefixLength?: number;
  /**
   * Number of characters to keep from the end.
   * @default 4
   */
  suffixLength?: number;
  /**
   * Separator placed between prefix and suffix.
   * @default "…"
   */
  separator?: string;
}

/**
 * Shortens a Stellar public key for display, e.g.:
 *   "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN"
 *   → "GAAZI4…CCWN"
 */
export function truncatePublicKey(
  publicKey: string,
  options: TruncateKeyOptions = {},
): string {
  const {
    prefixLength = 6,
    suffixLength = 4,
    separator = "\u2026", // …
  } = options;

  if (publicKey.length <= prefixLength + suffixLength) {
    return publicKey;
  }

  const prefix = publicKey.slice(0, prefixLength);
  const suffix = publicKey.slice(-suffixLength);
  return `${prefix}${separator}${suffix}`;
}
