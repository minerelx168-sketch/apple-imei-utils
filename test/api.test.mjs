import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeApplePartNumber,
  isValidImei,
  isValidLuhn,
  luhnCheckDigit,
  normalizeImei
} from "../dist/index.js";

function independentLuhnCheckDigit(body) {
  assert.match(body, /^[0-9]+$/);
  const doubledContributions = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];
  const sum = [...body].reduce((total, char, index) => {
    const digit = Number(char);
    return total + ((body.length - index) % 2 ? doubledContributions[digit] : digit);
  }, 0);
  return String((10 - (sum % 10)) % 10);
}

function makeLuhnNumber(body) {
  return body + independentLuhnCheckDigit(body);
}

test("Luhn check digit agrees with an independent mod-10 implementation", () => {
  assert.equal(luhnCheckDigit("7992739871"), "3");
  assert.equal(luhnCheckDigit("49015420323751"), "8");
  const bodies = ["7", "7992739871", "49015420323751", "1234567890123456789"];
  for (const body of bodies) {
    const number = makeLuhnNumber(body);
    assert.equal(luhnCheckDigit(body), independentLuhnCheckDigit(body));
    assert.equal(isValidLuhn(number), true);
    assert.equal(isValidLuhn(number.slice(0, -1) + ((Number(number.at(-1)) + 1) % 10)), false);
  }

  // Deterministic property-style fuzzing: no external randomness or fixture
  // data is used, and the oracle remains independent from the package code.
  let state = 0x13579bdf;
  for (let sample = 0; sample < 1000; sample += 1) {
    const length = 1 + (sample % 32);
    let body = "";
    for (let digit = 0; digit < length; digit += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      body += String(state % 10);
    }
    const number = makeLuhnNumber(body);
    assert.equal(luhnCheckDigit(body), independentLuhnCheckDigit(body));
    assert.equal(isValidLuhn(number), true);
  }
});

test("Luhn rejects non-ASCII, empty, and non-string values", () => {
  assert.equal(isValidLuhn(""), false);
  assert.equal(isValidLuhn("７７"), false);
  assert.equal(isValidLuhn("77\n"), false);
  assert.equal(isValidLuhn("12a"), false);
  assert.equal(isValidLuhn(null), false);
  assert.throws(() => luhnCheckDigit(123), TypeError);
  assert.throws(() => luhnCheckDigit(""), TypeError);
  assert.throws(() => luhnCheckDigit("12a"), TypeError);
});

test("IMEI validation is strict and rejects the all-zero sentinel", () => {
  assert.equal(isValidImei("490154203237518"), true);
  assert.equal(isValidImei("490154203237519"), false);
  assert.equal(isValidImei("000000000000000"), false);
  assert.equal(isValidImei("49015420323751"), false);
  assert.equal(isValidImei("4901542032375180"), false);
  assert.equal(isValidImei("49015420323751８"), false);
  assert.equal(isValidImei("490154203237518\n"), false);
  assert.equal(isValidImei("4901-5420-3237-518"), false);
  assert.equal(isValidImei(undefined), false);
});

test("IMEI normalization removes only explicit ASCII separators", () => {
  assert.equal(normalizeImei("4901-5420 3237-518"), "490154203237518");
  assert.equal(normalizeImei(" 490154203237518 "), "490154203237518");
  assert.equal(normalizeImei("490154203237519"), "490154203237519");
  assert.equal(normalizeImei("490154203237518\n"), null);
  assert.equal(normalizeImei("490154203237518\t"), null);
  assert.equal(normalizeImei("49015420323751８"), null);
  assert.equal(normalizeImei("4901542032375189"), null);
  assert.equal(normalizeImei("49015420323751A"), null);
  assert.equal(normalizeImei(null), null);
  assert.equal(normalizeImei("000000000000000"), null);
});

test("part-number parser recognizes the conservative exact-five subset", () => {
  const result = decodeApplePartNumber(" mc922ll/a ");
  assert.deepEqual(result, {
    kind: "part-number",
    isPartNumber: true,
    confidence: "heuristic",
    heuristicOnly: true,
    generationDependent: true,
    normalized: "MC922LL/A",
    sku: "MC922",
    prefix: "M",
    prefixHeuristic: "retail-style",
    regionCode: "LL",
    possibleMarkets: ["United States", "Canada"],
    revision: "A",
    caveats: [
      "Heuristic only: the prefix does not prove new/refurbished history, ownership, condition, warranty, or repair history.",
      "The region code is a generation-dependent sales-market hint, not an exact country of origin, current-model identifier, carrier-lock status, or SIM/network capability.",
      "No storage, color, device-model, carrier, or external lookup is performed."
    ]
  });

  const mappingFixtures = [
    ["M1234CH/A", "CH", ["Mainland China"]],
    ["M1234J/A", "J", ["Japan"]],
    ["M1234ZP/A", "ZP", ["Hong Kong", "Macao", "Australia", "Taiwan", "Thailand", "Vietnam"]],
    ["M1234B/A", "B", ["United Kingdom", "Ireland"]],
    ["M1234KH/A", "KH", ["Mainland China", "South Korea"]]
  ];
  for (const [input, regionCode, possibleMarkets] of mappingFixtures) {
    const decoded = decodeApplePartNumber(input);
    assert.equal(decoded.kind, "part-number");
    assert.equal(decoded.regionCode, regionCode);
    assert.deepEqual(decoded.possibleMarkets, possibleMarkets);
    assert.equal(decoded.heuristicOnly, true);
    assert.equal(decoded.generationDependent, true);
  }
});

test("part-number parser preserves unknown prefix and region without fabrication", () => {
  const unknown = decodeApplePartNumber("X1234QX/A");
  assert.equal(unknown.kind, "part-number");
  assert.equal(unknown.confidence, "unknown");
  assert.equal(unknown.sku, "X1234");
  assert.equal(unknown.prefix, "X");
  assert.equal(unknown.prefixHeuristic, "unknown");
  assert.equal(unknown.regionCode, "QX");
  assert.deepEqual(unknown.possibleMarkets, []);
});

test("hardware model shape is distinct from part number", () => {
  const result = decodeApplePartNumber(" a1234 ");
  assert.deepEqual(result, {
    kind: "hardware-model",
    isPartNumber: false,
    confidence: "heuristic",
    modelNumber: "A1234",
    caveats: [
      "A#### is classified as a hardware-model-number shape, not a part number.",
      "No model database lookup is performed."
    ]
  });
});

test("parser rejects greedy-region ambiguity, unsupported revision, and internal formatting", () => {
  assert.equal(decodeApplePartNumber("MC922LLLL/A").kind, "invalid");
  assert.equal(decodeApplePartNumber("MC922LL/B").reason, "unsupported-revision");
  assert.equal(decodeApplePartNumber("MC922 LL/A").reason, "invalid-format");
  assert.equal(decodeApplePartNumber("A12345").reason, "invalid-format");
  assert.equal(decodeApplePartNumber("MC922LL/A\n").kind, "part-number");
  assert.equal(decodeApplePartNumber(12345).reason, "invalid-type");
  assert.equal(decodeApplePartNumber(null).reason, "invalid-type");
});

// Public-package boundary regressions: exact ASCII input and isolated results.
test("trailing newline cannot become a generated checksum or a normalized IMEI", () => {
  for (const suffix of ["\n", "\r", "\r\n", "\u2028", "\u2029"]) {
    assert.throws(() => luhnCheckDigit("12345678901234" + suffix), TypeError);
    assert.equal(normalizeImei("12345678901234" + suffix), null);
    assert.equal(isValidImei("12345678901234" + suffix), false);
  }
});

test("part-number parsing rejects Unicode characters before case folding", () => {
  assert.equal(decodeApplePartNumber("M12ßLL/A").kind, "invalid");
  assert.equal(decodeApplePartNumber("Ｍ1234LL/A").kind, "invalid");
  assert.equal(decodeApplePartNumber("M1234KH/A").kind, "invalid");
});

test("mutating one decoded result cannot corrupt later market hints or caveats", () => {
  const first = decodeApplePartNumber("M1234LL/A");
  first.possibleMarkets.push("fabricated-market");
  first.caveats.length = 0;
  const next = decodeApplePartNumber("M1234LL/A");
  assert.deepEqual(next.possibleMarkets, ["United States", "Canada"]);
  assert.equal(next.caveats.length, 3);
});
