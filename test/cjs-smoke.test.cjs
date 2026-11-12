const assert = require("node:assert/strict");
const test = require("node:test");
const api = require("..");

test("CommonJS entry point exposes the documented API", () => {
  assert.deepEqual(Object.keys(api).sort(), [
    "decodeApplePartNumber",
    "isValidImei",
    "isValidLuhn",
    "luhnCheckDigit",
    "normalizeImei"
  ]);
  assert.equal(api.luhnCheckDigit("7992739871"), "3");
  assert.equal(api.isValidImei("490154203237518"), true);
  assert.equal(api.normalizeImei("4901-5420 3237-518"), "490154203237518");
  assert.deepEqual(api.decodeApplePartNumber("M1234LL/A").possibleMarkets, ["United States", "Canada"]);
});
