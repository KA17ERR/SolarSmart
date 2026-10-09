# Interactive planner model

The planner has six reviewable steps: choose a general-location/sample home, enter rectangular roof dimensions, choose panels and roof conditions, enter household energy use, optionally choose an illustrative battery, then review and calculate. Energy use may be entered directly in kWh/month, inferred from a monthly bill divided by a user-entered tariff, or approximated from appliance watts × hours/day × quantity × 30 days. Bill and appliance paths are bounded and rejected with an explanation when they cannot produce reasonable consumption values. Values remain in React form state while navigating, and Reset restores the labelled sample data. It separates roof-grid geometry from the shared SolarSmart financial and energy estimator.

## Panel layout

`src/lib/panel-layout.ts` accepts rectangular roof and module dimensions in metres. It subtracts a 0.35 m edge clearance from each side, then lays modules on a grid using a 0.06 m gap. Rows and columns are calculated as:

```text
columns = floor((usable roof width + gap) / (oriented panel width + gap))
rows    = floor((usable roof length + gap) / (oriented panel length + gap))
```

Landscape and portrait swap the panel width and length. Modules can be removed by stable grid index, leaving their roof slot empty. The map drawing is schematic; the rectangle does not represent a surveyed roof boundary, setbacks, hips, valleys, obstructions, or fire-access codes.

The planner calculates a provisional engine capacity from gross rectangle area with a 70% usable-roof assumption and the calculator's 60 sq ft/kW capacity rule. It then limits the displayed placed modules to both the geometric panel grid and that modelled capacity. Module dimensions and 450 W / 550 W ratings are fictional demo configuration values, not a manufacturer specification.

## Solar estimates

The planner passes its annual consumption, tariff, sun-hours, cost, zero incentive, zero export compensation, orientation, and shade factors into `estimateSolar` in `src/lib/solar.ts`. The financial engine remains the single source for capacity, generation, self-consumption, savings, cost range, payback, projections, and emissions. The selected panel count is supplied through the engine's optional `systemCapacityTargetKw` input so the result matches the placed modules, subject to the engine roof limit; the planner does not duplicate energy or financial formulas.

## Optional battery illustration

The chooser supports no battery or nominal 5 kWh / 10 kWh examples. A separate typed planner helper reports an illustrative usable capacity as `nominal kWh × (1 − 0.15 reserve)`. It estimates average continuous household load as `monthly kWh × 12 ÷ 365 ÷ 24`, then divides usable battery energy by that load. For the sample 850 kWh/month and 5 kWh choice, this is `4.25 kWh ÷ 1.164 kW ≈ 3.65 hours`. It is not a backup-duration promise, circuit recommendation, storage design, or bill-savings calculation. It excludes inverter power limits, battery efficiency beyond the reserve, weather/solar recharge, load peaks, selected circuits, installation cost, and changes to self-consumption. The battery selection therefore does not change solar capacity, savings, installation cost, or payback.

Editable demo modifiers are south 0.96, south-east / south-west 0.93, east / west 0.86, north 0.68; shading labels use factors of 0.96, 0.92, and 0.62 for low, moderate, and high. Generic peak sun-hours default to 4.8/day. The calculator applies its documented generic performance ratio and 75% self-consumption assumption. These are illustrative model inputs only, not location-specific solar measurements.

The user-entered installed cost per kW is multiplied by placed kW before the shared calculator applies its displayed cost range. The demo defaults to USD and $2,400/kW as a fictional assumption. Incentives are zero. Battery capacity, battery pricing, backup duration, and battery savings are not calculated by this planner because monthly consumption alone does not support a defensible battery design. Roof tilt is collected for context but this generic calculator does not use it to alter yield.

All displayed results are estimates. Confirm dimensions, roof condition, shading, utility rates, export rules, equipment, permits, and installation costs with appropriate local sources and a qualified installer.
