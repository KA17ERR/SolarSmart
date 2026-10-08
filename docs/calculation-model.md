# SolarSmart calculation model

**Schema version:** `1.0` (`SolarInputs`, `CalculationAssumptions`, `SolarEstimate` in `src/lib/solar.ts`)

The calculation module is pure TypeScript. It imports no UI, React, network, AI, or cloud code. `calculateSolar` accepts complete validated inputs and returns a stable result contract; `estimateSolar` supports incomplete intake data and keeps unsupported outputs `null`. Both are deterministic. `validateInputs` is the shared input validation entry point.

## Inputs and units

| Input | Unit | Meaning |
| --- | --- | --- |
| `monthlyBill` | USD/month | User-entered bill used to infer annual consumption. |
| `annualConsumptionKwh` | kWh/year (optional) | Explicit consumption overrides bill÷tariff inference. Scenario comparison pins inferred baseline use here so tariff changes do not also change assumed usage. |
| `utilityRate` | USD/kWh | User rate or explicitly disclosed demo assumption. Must be positive. |
| `sunHours` | equivalent peak-sun-hours/day | Generic planning input, never a live irradiance reading. |
| `roofAreaSqFt` | sq ft | Approximate usable roof measurement after the wizard's explicit unit conversion. |
| `usableRoofPercent` | percent | Remaining roof area after setbacks and obstructions. |
| `orientationFactor`, `shadingFactor` | fraction 0–1 | User/demo production multipliers. |
| `targetAnnualOffsetRate` | fraction 0–1 | Sizing goal; **not** the fraction of generated energy consumed on site. |
| `exportCompensationRate` | USD/kWh | User supplied export credit; zero by default unless known. |
| `systemCost` | USD | User or demo expected installed price, not a quote. |
| `incentiveRate` | fraction 0–0.9 | Optional explicit user assumption, default 0; never verified or guaranteed. |
| `electricityEscalation` | fraction/year | Illustrative retail-rate growth for projections, not a tariff forecast. |

The wizard's consumption input is converted into a monthly bill using the entered or disclosed default tariff. Switching the roof-area unit converts the displayed value while preserving its approximate physical size. City/postcode is context only; it does not trigger geocoding or local-data lookup.

## Default assumptions

`DEFAULT_CALCULATION_ASSUMPTIONS` is the single versioned set of model constants:

| Constant | Default | Purpose / source note |
| --- | ---: | --- |
| Roof layout density | 60 sq ft/kW | Generic layout planning assumption; installer design supersedes it. |
| System performance ratio | 0.80 | Generic conversion/loss factor, not a measurement. |
| Physical self-consumption | 0.75 | Illustrative share used directly on site; actual load timing/storage is unknown. |
| Installed-cost range multipliers | 0.85–1.15 | Illustrative range around `systemCost`; not a market quote. |
| Annual degradation | 0.005 | Illustrative production reduction per year. |
| Grid emissions factor | 0.385 kg CO₂/kWh | Generic, non-local avoided-emissions factor. |
| Projection horizon | 25 years | Modeled duration; not an equipment warranty or guarantee. |
| Maximum simple-payback display | 25 years | Longer or unsupported payback is returned as `null`. |

Every constant has a plain-language source note in the assumptions snapshot. Callers may override assumptions for tests or an explicitly sourced configuration; invalid assumption overrides must not be presented as verified facts.

## Formulas

1. **Consumption:** use explicit `annualConsumptionKwh` when supplied; otherwise infer `monthlyBill × 12 ÷ utilityRate`. Scenario comparison copies that inferred base usage into the optional field, so changing a tariff does not silently alter the assumed kWh load. The comparison editor recomputes the implied monthly bill as annual use × retail rate ÷ 12 when either of those scenario values changes.
2. **Annual yield per kW:** `sunHours × 365 × performanceRatio × orientationFactor × shadingFactor`.
3. **Roof capacity:** `roofAreaSqFt × usableRoofPercent ÷ 100 ÷ roofAreaSqFtPerKw`.
4. **Requested capacity:** `annualConsumptionKwh × targetAnnualOffsetRate ÷ annualYieldPerKw`.
5. **Installed capacity:** lesser of requested capacity and roof capacity. Roof area is a planning constraint, not a structural suitability assessment.
6. **Annual generation:** `installed kW × annual yield per kW`.
7. **On-site energy:** lesser of `generation × physicalSelfConsumptionRate` and annual consumption. **Exports:** generation minus on-site energy.
8. **First-year savings:** `on-site kWh × retail tariff + exported kWh × export compensation`. Exported power is never credited at retail rate by default.
9. **Cost range:** `systemCost × [0.85, 1, 1.15]`; net range multiplies each by `1 − incentiveRate`. Incentive defaults to zero; nonzero user assumptions receive an unverified-incentive warning.
10. **Payback:** first year where cumulative modeled savings equal net expected cost, linearly interpolated within that year. If savings do not recover cost within 25 years, payback is `null` with a warning. This simple payback excludes financing, O&M, taxes, insurance, and fixed utility charges.
11. **Annual projection:** generation degrades by `(1 − degradationRate)^(year − 1)`, retail price changes by `(1 + electricityEscalation)^(year − 1)`, physical consumption remains constant, and export credit remains fixed. The result includes annual and cumulative gross/net values.
12. **Avoided emissions:** annual generation multiplied by the disclosed generic emissions factor. This is an estimate, not a lifecycle assessment.

## Validation, warnings, and interpretation

The typed result carries a `status`, field errors, structured warnings, limitations, data-completeness percentage, and confidence indicator. Invalid input makes `calculateSolar` throw a readable validation error; `estimateSolar` returns `status: "invalid"` and errors. Missing data produces a partial result with `null` numerical estimates instead of a fabricated default result. Zero monthly bill is valid and leads to zero system size/savings and unavailable payback. Zero tariff is invalid because consumption cannot be inferred from a bill. Heavy shade, zero usable capacity, uncompensated export, unverified incentives, and retail tariffs above $5/kWh receive warnings. The high-tariff threshold is a review heuristic only; the model still accepts and calculates valid unusual values.

Values retain full calculation precision in the module. UI/report consumers format or round for display. No government subsidy, approval, tariff, irradiance, installer partnership, or guaranteed feasibility/savings is asserted. Actual generation/cost depend on site conditions, weather, modules/inverter, layout, installation quality, local utility rules, and a professional site survey.

## Tests

`src/lib/solar.test.ts` includes a hand-checkable example (14,400 kWh annual use, 11,808 kWh modeled generation, 8,856 kWh self-consumed, zero export payment), tariff/export behavior, invalid and boundary inputs, zero bill/roof, partial data, unit conversion, shade, roof caps, extreme finite values, reports, and deterministic fallback text. Run with `npm test`.
