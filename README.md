# apple-imei-utils

ยูทิลิตีโอเพนซอร์สขนาดเล็กสำหรับตรวจ checksum ของ IMEI ด้วย Luhn และแยกโครงสร้าง Apple-style Part Number แบบ offline ใช้ได้กับ Node.js และ browser ไม่มี runtime dependencies ไม่มี telemetry และไม่เรียก Apple, carrier หรือ IMEI provider

A small, offline TypeScript/JavaScript utility for strict IMEI checksum validation and conservative Apple-style part-number parsing. Zero runtime dependencies. ESM, CommonJS, and TypeScript declarations included. MIT licensed; not affiliated with or endorsed by Apple or GSMA.

## ติดตั้ง / Installation

เมื่อเผยแพร่ขึ้น npm แล้ว / After the npm release is published:

```sh
npm install apple-imei-utils
```

รองรับ Node.js 18 ขึ้นไป และ browser bundlers ที่รองรับ ESM / Supports Node.js 18+ and ESM-compatible browser bundlers.

## ตัวอย่าง / Quick start

```js
import {
  luhnCheckDigit,
  isValidImei,
  normalizeImei,
  decodeApplePartNumber,
} from 'apple-imei-utils';

// Generated synthetic example: not an allocated-device or customer claim.
const body = '12345678901234';
const syntheticImei = body + luhnCheckDigit(body);
isValidImei(syntheticImei); // true: shape + checksum only
isValidImei(syntheticImei + '9'); // false: no silent truncation

const formatted = normalizeImei(syntheticImei.slice(0, 8) + '-' + syntheticImei.slice(8));
const checksumMatches = formatted !== null && isValidImei(formatted);

// Synthetic part-number example; it is not a device database entry.
const decoded = decodeApplePartNumber('MTESTLL/A');
if (decoded.kind === 'part-number') {
  console.log(decoded.sku);             // MTEST
  console.log(decoded.regionCode);      // LL
  console.log(decoded.possibleMarkets); // ['United States', 'Canada']
  console.log(decoded.heuristicOnly);   // true
}
```

CommonJS:

```js
const { isValidImei, decodeApplePartNumber } = require('apple-imei-utils');
console.log(decodeApplePartNumber('A0000').kind); // hardware-model shape only
```

ไม่ควรส่ง IMEI จริงลง console, issues หรือ analytics ตัวอย่างข้างต้นเป็นข้อมูลสังเคราะห์ / Do not log real IMEIs or publish them in issues or analytics. Examples above are synthetic.

## API

### `luhnCheckDigit(body: string): string`

คำนวณ check digit จากตัวเลข ASCII ที่ยังไม่มี check digit ค่าว่าง ตัวอักษร ตัวเลข Unicode และ newline จะทำให้เกิด `TypeError` ไม่ตัดข้อความหรือแปลงชนิดข้อมูลให้เอง

Returns a Luhn check digit for a non-empty ASCII-digit body, without its existing check digit. Throws `TypeError` for malformed/non-string input. Useful for synthetic fixtures and checksum verification, not device-identity fabrication.

### `isValidLuhn(value: unknown): value is string`

ตรวจ Luhn ของสตริงตัวเลข ASCII แบบครบ check digit ต้องมีอย่างน้อยสองหลัก ไม่รับ separator หรือ whitespace

Checks a complete ASCII-digit string with at least two digits. Formatting characters are rejected. A successful check is not an authentication or ownership check.

### `isValidImei(value: unknown): value is string`

รับเฉพาะตัวเลข ASCII 15 หลักที่ checksum ตรง ปฏิเสธ all-zero sentinel และค่าที่ยาวเกิน โดยไม่ตัดเลขส่วนเกินออก

Strictly checks 15 ASCII digits and the Luhn checksum, rejecting the all-zero sentinel. It does **not** verify TAC allocation, device existence, authenticity, ownership, stolen/blacklist status, warranty, carrier, or unlock eligibility.

### `normalizeImei(value: unknown): string | null`

ลบเฉพาะ ASCII space และ hyphen เมื่อผลลัพธ์เป็น IMEI-shaped string 15 หลักที่ไม่ใช่ศูนย์ทั้งหมด ค่าอื่นคืน `null` ฟังก์ชันนี้ยังไม่ได้ตรวจ checksum ต้องเรียก `isValidImei` ต่อ

An explicit formatting helper: removes only ASCII spaces and hyphens, never letters or excess digits. Returns a non-zero 15-digit shape or `null`. Check the checksum separately.

### `decodeApplePartNumber(value: unknown): ApplePartNumberResult`

แยก SKU 5 อักขระ + region letters 1–3 ตัว + `/A` รับ lowercase และ whitespace รอบนอก แต่ไม่รับ whitespace ภายในหรือ Unicode character folding รหัส `A####` จะคืนผลชนิด `hardware-model` ไม่ใช่ Part Number ผลนี้เพียงตรวจรูปแบบ ไม่ยืนยันว่ารุ่นนั้นมีอยู่จริง

Parses the supported five-character alphanumeric SKU + one-to-three-letter region + `/A` subset. It is not an exhaustive Apple SKU database. Other revisions and unusual prototype formats are unsupported.

ผลลัพธ์มีสามชนิด / The discriminated result has three kinds:

- `part-number`: includes `normalized`, `sku`, `prefix`, `prefixHeuristic`, `regionCode`, `possibleMarkets`, `revision`, `confidence`, `heuristicOnly`, `generationDependent`, and `caveats`.
- `hardware-model`: includes `modelNumber` and caveats. `isPartNumber` is false.
- `invalid`: includes a typed reason and caveats. Unknown-but-well-shaped prefixes/regions remain `part-number` with unknown confidence and empty market hints rather than fabricated data.

## ข้อจำกัดสำคัญ / Interpretation limits

M/F/N/P เป็นเพียง prefix associations ที่พบใช้ทั่วไปสำหรับ retail/refurbished/replacement/personalized ไม่พิสูจน์ประวัติซ่อม สภาพปัจจุบัน หรือความเป็นเจ้าของ ข้อมูลตลาดเป็นเพียง possibilities และเปลี่ยนตามรุ่น: `ZP` ไม่ได้หมายถึงฮ่องกงเสมอ และ `LL` ไม่ได้พิสูจน์ประเทศผลิต

Prefix labels and region hints are **community-observed heuristics**, not Apple certification. Region assignments differ between generations: ZP has appeared in Hong Kong/Macao/Australia/Taiwan legacy listings and Taiwan/Thailand/Vietnam listings for newer models. This package cannot derive a generation from the suffix alone.

แพ็กเกจนี้ไม่แสดงรุ่นเครื่อง สี ความจุ โรงงาน carrier lock, SIM configuration หรือผลตรวจจาก provider หากต้องยืนยันข้อมูลเหล่านี้ต้องใช้หลักฐานและแหล่งข้อมูลอื่น ไม่ควรใช้ checksum เป็น authorization gate

No device model, color, storage, factory, SIM configuration, carrier-lock state, or provider result is inferred. All functions run locally; input is not transmitted or stored by the package.

Apple อธิบายความต่างของ Part Number กับ A-number ใน [คู่มือหา Model Number](https://support.apple.com/en-us/106343) และ GSMA อธิบาย IMEI/Luhn ใน [TS.06](https://www.gsma.com/get-involved/working-groups/gsma_resources/ts-06/) ส่วน prefix/region hints อ้างอิง community documentation รายละเอียดอยู่ใน [References and limits](docs/references.md)

## พัฒนาและทดสอบ / Development

```sh
npm ci --ignore-scripts
npm test
npm run pack:check
```

Tests use synthetic inputs, independent checksum checks, generated cases, strict malformed-input cases, and ESM/CommonJS smoke checks. CI tests Node.js 18, 22, and 24; it does not automatically publish to npm or deploy a website.

## ผู้ดูแล / Maintainer

ดูแลโดย [iUnlockMobile](https://iunlockmobile.com/) อ่านคำอธิบายว่า identifiers ไม่สามารถยืนยัน carrier lock ได้เองใน [How to find the carrier on an iPhone before unlocking](https://iunlockmobile.com/articles/how-to-find-carrier-on-iphone-before-unlock) ลิงก์นี้เป็นข้อมูลประกอบการใช้งาน ไม่ใช่ข้อกำหนดว่าต้องซื้อบริการหรือให้ backlink เมื่อใช้แพ็กเกจ

Maintained by iUnlockMobile. Usage, modification, and redistribution are allowed under the [MIT license](LICENSE); no paid service, account, network connection, or backlink is required. Contributions and corrections are welcome; use synthetic examples and never post customer identifiers.
