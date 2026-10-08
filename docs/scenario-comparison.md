# Scenario comparison

`/assessment/compare` is an optional local decision-support route. The dashboard transfers the current validated assessment through tab-scoped `sessionStorage`; a direct visit starts from the built-in medium-roof demo. The handoff is consumed once and is never sent to a server. The comparison route can create, rename, duplicate, remove, select, and reset alternatives.

## Model flow

`src/lib/comparison.ts` owns typed scenario operations, comparisons, deltas, formatting, and deterministic recommendations. It calls the shared `calculateSolar` engine for the baseline and every valid alternative; it does not reproduce solar or financial formulas. Scenario inputs can vary usable roof area, shade, annual electricity use, retail/export rates, system cost, sizing target, generic yield, orientation, bill escalation, and the per-scenario physical self-consumption override.

Annual electricity use is held constant for tariff-only comparisons. If the assessment contains only a bill, the comparison pins the engine's inferred `bill × 12 ÷ tariff` value; a tariff or annual-usage edit updates the alternative's implied monthly bill while preserving the other value. This makes the tariff sensitivity visible instead of changing both inferred consumption and tariff at once.

The comparison table reports the alternative minus base as its absolute delta. Relative change is `delta ÷ abs(base) × 100` and is omitted when the base is zero or either metric is unavailable. Payback remains unavailable when the calculation engine cannot reach cost recovery within its configured horizon. Invalid alternative assumptions show validation details, null metrics, and no previous result values.

Sample alternatives are illustrative. The “more usable roof” preset changes two inputs and is explicitly flagged as a multi-variable comparison. A combined scenario outcome does not establish which changed input caused a specific effect. Default engine values such as self-consumption remain labelled as assumptions unless an alternative explicitly overrides them. The assessment baseline is fixed; reset restores comparison alternatives to presets for that baseline.

## Verification

`src/lib/comparison.test.ts` covers shared-engine parity, tariff isolation, absolute and percentage deltas, zero denominators, unavailable payback, invalid inputs, scenario CRUD helpers, default alternatives, and multi-variable recommendation warnings. Run it with `npm test`.
