/**
 * Unit tests for src/utils/stellarAmounts.ts
 *
 * Covers every exported function:
 *   - stroopsToXlm
 *   - xlmToStroops
 *   - formatXlm
 *   - formatStroops
 *   - parseXlmInput
 *   - isValidXlmAmount
 *   - stroopsGte
 *   - clampStroops
 *   - numberToStroops
 *   - truncatePublicKey
 *
 * Stellar precision guarantee: 1 XLM = 10,000,000 stroops (7 decimal places max).
 *
 * Run with:
 *   pnpm test:hooks
 */

/// <reference types="vitest/globals" />

import { describe, it, expect } from "vitest";
import {
  stroopsToXlm,
  xlmToStroops,
  formatXlm,
  formatStroops,
  parseXlmInput,
  isValidXlmAmount,
  stroopsGte,
  clampStroops,
  numberToStroops,
  truncatePublicKey,
} from "../stellarAmounts";

// ─── stroopsToXlm ─────────────────────────────────────────────────────────────

describe("stroopsToXlm", () => {
  it("converts zero stroops to 0.0000000", () => {
    expect(stroopsToXlm(0n)).toBe("0.0000000");
  });

  it("converts 1 stroop to 0.0000001", () => {
    expect(stroopsToXlm(1n)).toBe("0.0000001");
  });

  it("converts 10_000_000 stroops to 1.0000000", () => {
    expect(stroopsToXlm(10_000_000n)).toBe("1.0000000");
  });

  it("converts 12_500_000 stroops to 1.2500000", () => {
    expect(stroopsToXlm(12_500_000n)).toBe("1.2500000");
  });

  it("handles large values", () => {
    // 1,000,000 XLM = 10,000,000,000,000 stroops
    expect(stroopsToXlm(10_000_000_000_000n)).toBe("1000000.0000000");
  });

  it("pads fractional part to 7 digits", () => {
    expect(stroopsToXlm(100n)).toBe("0.0000100");
  });

  it("throws RangeError for negative stroops", () => {
    expect(() => stroopsToXlm(-1n)).toThrow(RangeError);
  });
});

// ─── xlmToStroops ─────────────────────────────────────────────────────────────

describe("xlmToStroops", () => {
  it("converts '1.25' to 12_500_000n", () => {
    expect(xlmToStroops("1.25")).toBe(12_500_000n);
  });

  it("converts '0.0000001' to 1n", () => {
    expect(xlmToStroops("0.0000001")).toBe(1n);
  });

  it("converts '1.2500000' to 12_500_000n", () => {
    expect(xlmToStroops("1.2500000")).toBe(12_500_000n);
  });

  it("converts '0' to 0n", () => {
    expect(xlmToStroops("0")).toBe(0n);
  });

  it("converts '100' to 1_000_000_000n", () => {
    expect(xlmToStroops("100")).toBe(1_000_000_000n);
  });

  it("converts integer strings with no decimal", () => {
    expect(xlmToStroops("5")).toBe(50_000_000n);
  });

  it("throws RangeError for more than 7 decimal places", () => {
    expect(() => xlmToStroops("1.12345678")).toThrow(RangeError);
  });

  it("throws RangeError for invalid input like 'abc'", () => {
    expect(() => xlmToStroops("abc")).toThrow(RangeError);
  });

  it("throws RangeError for negative amounts", () => {
    expect(() => xlmToStroops("-1")).toThrow(RangeError);
  });

  it("throws RangeError for scientific notation", () => {
    expect(() => xlmToStroops("1e7")).toThrow(RangeError);
  });
});

// ─── formatXlm ───────────────────────────────────────────────────────────────

describe("formatXlm", () => {
  describe("from XlmAmount string", () => {
    it("returns the raw string with default 7 dp", () => {
      expect(formatXlm("1.2500000")).toBe("1.2500000");
    });

    it("rounds to 2 dp", () => {
      expect(formatXlm("1.2500000", { decimals: 2 })).toBe("1.25");
    });

    it("rounds to 0 dp", () => {
      expect(formatXlm("1.9999999", { decimals: 0 })).toBe("2");
    });

    it("appends XLM unit when showUnit is true", () => {
      expect(formatXlm("1.2500000", { showUnit: true })).toBe("1.2500000 XLM");
    });

    it("uses thousands separator when useGrouping is true", () => {
      const result = formatXlm("1000.0000000", { useGrouping: true });
      expect(result).toBe("1,000.0000000");
    });

    it("combines decimals, showUnit, and useGrouping", () => {
      expect(
        formatXlm("1234.5670000", {
          decimals: 2,
          showUnit: true,
          useGrouping: true,
        }),
      ).toBe("1,234.57 XLM");
    });

    it("handles zero XLM", () => {
      expect(formatXlm("0.0000000", { decimals: 2 })).toBe("0.00");
    });
  });

  describe("from bigint stroops", () => {
    it("accepts bigint and converts to XLM before formatting", () => {
      expect(formatXlm(12_500_000n, { decimals: 2 })).toBe("1.25");
    });

    it("formats large stroop value", () => {
      expect(
        formatXlm(10_000_000_000_000n, { decimals: 0, useGrouping: true }),
      ).toBe("1,000,000");
    });
  });

  describe("validation", () => {
    it("throws RangeError when decimals < 0", () => {
      expect(() => formatXlm("1.0000000", { decimals: -1 })).toThrow(RangeError);
    });

    it("throws RangeError when decimals > 7", () => {
      expect(() => formatXlm("1.0000000", { decimals: 8 })).toThrow(RangeError);
    });

    it("throws RangeError for non-integer decimals", () => {
      expect(() => formatXlm("1.0000000", { decimals: 1.5 })).toThrow(RangeError);
    });
  });
});

// ─── formatStroops ────────────────────────────────────────────────────────────

describe("formatStroops", () => {
  it("always appends XLM unit", () => {
    expect(formatStroops(12_500_000n)).toBe("1.2500000 XLM");
  });

  it("respects decimals option", () => {
    expect(formatStroops(12_500_000n, { decimals: 2 })).toBe("1.25 XLM");
  });

  it("handles zero", () => {
    expect(formatStroops(0n)).toBe("0.0000000 XLM");
  });
});

// ─── parseXlmInput ────────────────────────────────────────────────────────────

describe("parseXlmInput", () => {
  it("returns ok:true for valid input '1.25'", () => {
    const result = parseXlmInput("1.25");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stroops).toBe(12_500_000n);
      expect(result.xlm).toBe("1.2500000");
    }
  });

  it("returns ok:true for minimum amount '0.0000001'", () => {
    const result = parseXlmInput("0.0000001");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stroops).toBe(1n);
    }
  });

  it("returns ok:false for empty string", () => {
    const result = parseXlmInput("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("required");
    }
  });

  it("returns ok:false for zero amount", () => {
    const result = parseXlmInput("0");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("greater than zero");
    }
  });

  it("returns ok:false for invalid string 'abc'", () => {
    const result = parseXlmInput("abc");
    expect(result.ok).toBe(false);
  });

  it("returns ok:false for more than 7 decimal places", () => {
    const result = parseXlmInput("1.12345678");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("7 decimal");
    }
  });

  it("returns ok:false for negative amounts", () => {
    const result = parseXlmInput("-1");
    expect(result.ok).toBe(false);
  });

  it("trims whitespace before parsing", () => {
    const result = parseXlmInput("  5.00  ");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stroops).toBe(50_000_000n);
    }
  });
});

// ─── isValidXlmAmount ────────────────────────────────────────────────────────

describe("isValidXlmAmount", () => {
  const valid = [
    "0",
    "1",
    "1.5",
    "1.2500000",
    "100000.0000001",
    "0.0000001",
    "123",
  ];

  const invalid = [
    "-1",
    "abc",
    "1.12345678",  // 8 dp
    "",
    "1e7",         // scientific notation
    "1.2.3",       // two decimal points
  ];

  it.each(valid)("returns true for valid amount: %s", (v) => {
    expect(isValidXlmAmount(v)).toBe(true);
  });

  it.each(invalid)("returns false for invalid amount: %s", (v) => {
    expect(isValidXlmAmount(v)).toBe(false);
  });
});

// ─── stroopsGte ──────────────────────────────────────────────────────────────

describe("stroopsGte", () => {
  it("returns true when a > b", () => {
    expect(stroopsGte(10n, 5n)).toBe(true);
  });

  it("returns true when a === b", () => {
    expect(stroopsGte(5n, 5n)).toBe(true);
  });

  it("returns false when a < b", () => {
    expect(stroopsGte(4n, 5n)).toBe(false);
  });

  it("handles zero", () => {
    expect(stroopsGte(0n, 0n)).toBe(true);
    expect(stroopsGte(0n, 1n)).toBe(false);
  });
});

// ─── clampStroops ────────────────────────────────────────────────────────────

describe("clampStroops", () => {
  it("returns value unchanged when within [min, max]", () => {
    expect(clampStroops(5n, 0n, 10n)).toBe(5n);
  });

  it("clamps to min when value < min", () => {
    expect(clampStroops(0n, 5n, 10n)).toBe(5n);
  });

  it("clamps to max when value > max", () => {
    expect(clampStroops(15n, 0n, 10n)).toBe(10n);
  });

  it("handles min === max", () => {
    expect(clampStroops(0n, 5n, 5n)).toBe(5n);
    expect(clampStroops(10n, 5n, 5n)).toBe(5n);
    expect(clampStroops(5n, 5n, 5n)).toBe(5n);
  });

  it("throws RangeError when min > max", () => {
    expect(() => clampStroops(5n, 10n, 0n)).toThrow(RangeError);
  });
});

// ─── numberToStroops ─────────────────────────────────────────────────────────

describe("numberToStroops", () => {
  it("converts 1.25 to 12_500_000n", () => {
    expect(numberToStroops(1.25)).toBe(12_500_000n);
  });

  it("converts 0 to 0n", () => {
    expect(numberToStroops(0)).toBe(0n);
  });

  it("converts a round number", () => {
    expect(numberToStroops(1)).toBe(10_000_000n);
  });

  it("handles fractional precision (rounds to 7 dp)", () => {
    // 0.1 in floating point is not exact; rounding must not drift
    expect(numberToStroops(0.1)).toBe(1_000_000n);
  });

  it("throws RangeError for negative numbers", () => {
    expect(() => numberToStroops(-1)).toThrow(RangeError);
  });

  it("throws RangeError for Infinity", () => {
    expect(() => numberToStroops(Infinity)).toThrow(RangeError);
  });

  it("throws RangeError for NaN", () => {
    expect(() => numberToStroops(NaN)).toThrow(RangeError);
  });
});

// ─── truncatePublicKey ────────────────────────────────────────────────────────

describe("truncatePublicKey", () => {
  const KEY = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

  it("uses prefix 6 and suffix 4 by default", () => {
    expect(truncatePublicKey(KEY)).toBe("GAAZI4\u2026CCWN");
  });

  it("uses the provided prefix and suffix lengths", () => {
    expect(
      truncatePublicKey(KEY, { prefixLength: 4, suffixLength: 6 }),
    ).toBe("GAAZ\u2026KOCCWN");
  });

  it("uses the provided separator", () => {
    expect(
      truncatePublicKey(KEY, { separator: "..." }),
    ).toBe("GAAZI4...CCWN");
  });

  it("returns the key unchanged when it is short enough", () => {
    const short = "GAAZ4";
    expect(truncatePublicKey(short, { prefixLength: 6, suffixLength: 4 })).toBe(short);
  });

  it("handles a key exactly at the prefix+suffix boundary", () => {
    const key = "A".repeat(10);
    expect(truncatePublicKey(key, { prefixLength: 5, suffixLength: 5 })).toBe(key);
  });
});
