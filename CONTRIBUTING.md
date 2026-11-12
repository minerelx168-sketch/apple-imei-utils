# Contributing

Bug reports and pull requests are welcome. Use synthetic identifiers and fabricated part numbers when reporting issues. Do not post real customer IMEIs, serial numbers, email addresses, order identifiers, provider responses, or credentials.

Install development dependencies with `npm ci --ignore-scripts`, build with `npm run build`, and run `npm test`. Changes to prefix or region hints need a source and tests, including generation-dependent ambiguity. Do not add telemetry, provider lookups, install hooks, or definitive device-condition/carrier conclusions to this offline utility package.

Releases are deliberate maintainer actions. CI only builds/tests/packages; it does not publish to npm or deploy iUnlockMobile.
