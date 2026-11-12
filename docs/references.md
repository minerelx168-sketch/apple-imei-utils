# References and interpretation limits

This project implements the Luhn algorithm and a conservative Apple-style part-number parser from scratch. It does not contain a copied production application, customer records, provider responses, or an exhaustive device/SKU database. It is not affiliated with Apple or GSMA.

## IMEI checksums

[GSMA TS.06, IMEI Allocation and Approval Process](https://www.gsma.com/get-involved/working-groups/gsma_resources/ts-06/) describes IMEI allocation. [TS.06 v27.0, sections 5.1 and 5.1.5](https://imeidb.gsma.com/imei/resources/documents/TS.06%20v27.0.pdf) specifies an eight-digit TAC, six-digit serial number, and a check digit calculated using the Luhn formula.

A matching checksum is a transcription check, not proof that an IMEI was allocated, exists on a network, is authentic, is unlocked, is not stolen, or belongs to a particular person. This package performs no TAC database, carrier, Apple, or blacklist lookup. Rejecting the all-zero identifier is an additional package policy, not a property of the Luhn formula itself.

## Apple hardware models versus part numbers

[Apple: Find the model number of your iPhone, iPad, or iPod touch](https://support.apple.com/en-us/106343) explains that Settings → General → About initially displays a part number next to Model Number. Tapping that value reveals the hardware model number. An A-number, such as `A0000` used as a synthetic example here, must not be interpreted as a retail part number.

## Community-observed part-number conventions

[The Apple Wiki: Models](https://theapplewiki.com/wiki/Models) documents commonly observed prefix and SKU conventions. [The Apple Wiki: Model Regions](https://theapplewiki.com/wiki/Model_Regions) documents region assignments and explicitly notes that they differ between product generations. These references are unofficial; Apple does not certify this decoder.

The package uses a small set of factual prefix/market associations as hints, with original implementation and explanatory text. It does not copy the wiki's full tables, device database, or prose. M/F/N/P are common retail/refurbished/replacement/personalized prefix associations, not verified repair or resale histories.

Examples of generation-dependent ambiguity include LL appearing in US and Canadian legacy listings; KH appearing in Chinese and South Korean legacy listings; and ZP appearing in Hong Kong/Macao/Australia/Taiwan legacy listings while current iPhone 17 Pro listings also use it in Taiwan/Thailand/Vietnam. The decoder cannot identify the generation from these suffixes alone. Returned markets are possibilities, not a definitive sales country, manufacturing location, SIM configuration, warranty region, carrier, or lock status.

The supported parser subset is a five-character alphanumeric SKU, one-to-three-letter region suffix, and `/A`. Other revision characters, unusual prototype codes, serial numbers, full device databases, and carrier records are intentionally outside this initial release.

## Practical explanation

[iUnlockMobile: Find the carrier on an iPhone before unlocking](https://iunlockmobile.com/articles/how-to-find-carrier-on-iphone-before-unlock) explains why Settings and identifiers alone cannot prove the carrier controlling a device's lock. That distinction is also why this package does not return a carrier or unlock-eligibility conclusion.

Sources checked on 13 November 2026. Region associations may change; proposed updates should cite concrete listings, preserve unknown/ambiguous results, and add regression tests.
