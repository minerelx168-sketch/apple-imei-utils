/**
 * Return the Luhn check digit for a non-empty ASCII decimal body.
 *
 * The body must not include its check digit. This implementation performs no
 * truncation or character coercion and throws for a non-string or malformed
 * body.
 */
export function luhnCheckDigit(body: string): string {
  if (typeof body !== "string") {
    throw new TypeError("Luhn body must be a string of ASCII digits");
  }
  if (!isAsciiDigits(body)) {
    throw new TypeError("Luhn body must be a non-empty string of ASCII digits");
  }

  let sum = 0;
  let doubleDigit = true;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    let digit = body.charCodeAt(index) - 48;
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return String((10 - (sum % 10)) % 10);
}

/**
 * Check a complete, non-empty ASCII decimal string using the Luhn algorithm.
 * Values shorter than two digits are rejected because they have no non-check
 * digit body in this package's generic-number API.
 */
export function isValidLuhn(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 2 || !isAsciiDigits(value)) {
    return false;
  }

  const body = value.slice(0, -1);
  return value.charCodeAt(value.length - 1) - 48 === Number(luhnCheckDigit(body));
}

/**
 * Check a strict 15-digit ASCII IMEI and its Luhn checksum.
 * The all-zero sentinel is rejected. Formatting characters are not accepted;
 * use normalizeImei first when a formatted display value must be canonicalized.
 */
export function isValidImei(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === 15 &&
    isAsciiDigits(value) &&
    !/^0{15}$/.test(value) &&
    isValidLuhn(value)
  );
}

/**
 * Canonicalize an IMEI display value to 15 ASCII digits.
 *
 * Only ASCII spaces and hyphens are treated as optional formatting. Other
 * whitespace, Unicode digits, letters, embedded text, and overlong values are
 * rejected rather than truncated. This is a shape/format helper and does not
 * verify the Luhn checksum; call isValidImei for that check.
 *
 * Returns null when the value is not a non-zero 15-digit IMEI-shaped string.
 */
export function normalizeImei(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || /[^0-9 -]/.test(value)) {
    return null;
  }

  const digits = value.replace(/[ -]/g, "");
  if (digits.length !== 15 || !isAsciiDigits(digits) || /^0{15}$/.test(digits)) {
    return null;
  }
  return digits;
}

export type PartNumberConfidence = "heuristic" | "unknown";

export type PartPrefixHeuristic =
  | "retail-style"
  | "refurbished-style"
  | "replacement-style"
  | "personalized-style"
  | "unknown";

export type PartNumberInvalidReason =
  | "invalid-type"
  | "invalid-format"
  | "unsupported-revision";

export interface AppleHardwareModelResult {
  readonly kind: "hardware-model";
  readonly isPartNumber: false;
  readonly confidence: "heuristic";
  readonly modelNumber: string;
  readonly caveats: readonly string[];
}

export interface ApplePartNumberDecodedResult {
  readonly kind: "part-number";
  readonly isPartNumber: true;
  readonly confidence: PartNumberConfidence;
  readonly heuristicOnly: true;
  readonly generationDependent: true;
  readonly normalized: string;
  readonly sku: string;
  readonly prefix: string;
  readonly prefixHeuristic: PartPrefixHeuristic;
  readonly regionCode: string;
  readonly possibleMarkets: readonly string[];
  readonly revision: "A";
  readonly caveats: readonly string[];
}

export interface ApplePartNumberInvalidResult {
  readonly kind: "invalid";
  readonly isPartNumber: false;
  readonly confidence: "unknown";
  readonly reason: PartNumberInvalidReason;
  readonly input: string | null;
  readonly caveats: readonly string[];
}

export type ApplePartNumberResult =
  | AppleHardwareModelResult
  | ApplePartNumberDecodedResult
  | ApplePartNumberInvalidResult;

const PART_NUMBER_PATTERN = /^([A-Z0-9]{5})([A-Z]{1,3})\/A$/;
const PART_NUMBER_REVISION_PATTERN = /^([A-Z0-9]{5})([A-Z]{1,3})\/([A-Z])$/;
const HARDWARE_MODEL_PATTERN = /^A[0-9]{4}$/;

const REGION_MARKETS: Readonly<Record<string, readonly string[]>> = {
  LL: ["United States", "Canada"],
  CH: ["Mainland China"],
  J: ["Japan"],
  ZP: ["Hong Kong", "Macao", "Australia", "Taiwan", "Thailand", "Vietnam"],
  B: ["United Kingdom", "Ireland"],
  KH: ["Mainland China", "South Korea"]
};

const PREFIX_HEURISTICS: Readonly<Record<string, PartPrefixHeuristic>> = {
  M: "retail-style",
  F: "refurbished-style",
  N: "replacement-style",
  P: "personalized-style"
};

const PART_NUMBER_CAVEATS = [
  "Heuristic only: the prefix does not prove new/refurbished history, ownership, condition, warranty, or repair history.",
  "The region code is a generation-dependent sales-market hint, not an exact country of origin, current-model identifier, carrier-lock status, or SIM/network capability.",
  "No storage, color, device-model, carrier, or external lookup is performed."
] as const;

/**
 * Decode the conservative iPhone-style subset of Apple identifiers.
 *
 * Supported part-number shape is exactly five alphanumeric SKU characters,
 * one to three region letters, and the /A revision (for example MC922LL/A).
 * The input may use lower case and outer whitespace; internal whitespace and
 * all other formatting are rejected. A#### is returned separately as a
 * hardware-model result, never as a part number. Other revisions and exotic
 * or prototype formats are intentionally unsupported in 0.1.0.
 */
export function decodeApplePartNumber(value: unknown): ApplePartNumberResult {
  if (typeof value !== "string") {
    return invalidPartNumber("invalid-type", null);
  }

  const trimmed = value.trim();
  if (/[^A-Za-z0-9/]/.test(trimmed)) {
    return invalidPartNumber("invalid-format", trimmed);
  }
  const normalized = trimmed.toUpperCase();
  if (HARDWARE_MODEL_PATTERN.test(normalized)) {
    return {
      kind: "hardware-model",
      isPartNumber: false,
      confidence: "heuristic",
      modelNumber: normalized,
      caveats: [
        "A#### is classified as a hardware-model-number shape, not a part number.",
        "No model database lookup is performed."
      ]
    };
  }

  const partMatch = PART_NUMBER_PATTERN.exec(normalized);
  if (partMatch !== null) {
    const sku = partMatch[1];
    const regionCode = partMatch[2];
    const prefix = sku.slice(0, 1);
    const prefixHeuristic = PREFIX_HEURISTICS[prefix] ?? "unknown";
    const possibleMarkets = REGION_MARKETS[regionCode] ?? [];
    const confidence: PartNumberConfidence =
      prefixHeuristic === "unknown" || possibleMarkets.length === 0 ? "unknown" : "heuristic";

    return {
      kind: "part-number",
      isPartNumber: true,
      confidence,
      heuristicOnly: true,
      generationDependent: true,
      normalized,
      sku,
      prefix,
      prefixHeuristic,
      regionCode,
      possibleMarkets: [...possibleMarkets],
      revision: "A",
      caveats: [...PART_NUMBER_CAVEATS]
    };
  }

  const revisionMatch = PART_NUMBER_REVISION_PATTERN.exec(normalized);
  if (revisionMatch !== null && revisionMatch[3] !== "A") {
    return invalidPartNumber("unsupported-revision", normalized);
  }

  return invalidPartNumber("invalid-format", normalized);
}

function isAsciiDigits(value: string): boolean {
  return value.length > 0 && !/[^0-9]/.test(value);
}

function invalidPartNumber(
  reason: PartNumberInvalidReason,
  input: string | null
): ApplePartNumberInvalidResult {
  return {
    kind: "invalid",
    isPartNumber: false,
    confidence: "unknown",
    reason,
    input,
    caveats: [
      "No part-number interpretation was made; unsupported exotic or prototype formats remain unknown."
    ]
  };
}
