export type DashboardInsight = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  image: string;
  imageAlt: string;
  sections: { title: string; body: string; bullets?: string[] }[];
};

export const DASHBOARD_INSIGHTS: DashboardInsight[] = [
  {
    slug: "system-overview",
    title: "Your solar system",
    eyebrow: "System overview",
    summary: "Understand the modeled system size, the roof capacity estimate, and how those figures relate to your household energy use.",
    image: "/images/gallery/solar-home.webp",
    imageAlt: "A contemporary home fitted with rooftop solar panels at dusk",
    sections: [
      { title: "What system capacity means", body: "Capacity is shown in kilowatts (kW). It describes the modeled peak output of the solar array under standard conditions; it is not the amount of electricity produced in a year." },
      { title: "How roof area is used", body: "The estimate applies a usable-roof share and a generic panel packing assumption to estimate a roof capacity. It does not inspect an actual roof, measure obstructions, or confirm structural suitability.", bullets: ["Setbacks and obstructions reduce the usable area.", "The planner can show a panel layout for flat, gable, or hip roof geometry.", "A qualified installer must verify roof condition, code, and the final layout."] },
      { title: "Read the dashboard together", body: "Compare modeled capacity with annual generation, household consumption, and solar coverage. Each metric describes a different part of the estimate." },
    ],
  },
  {
    slug: "energy-generation",
    title: "Energy generation",
    eyebrow: "Production and household use",
    summary: "See what the modeled annual solar output represents and how the dashboard compares it with household electricity use.",
    image: "/images/gallery/solar-panels-closeup.webp",
    imageAlt: "Close-up of photovoltaic cells in natural sunlight",
    sections: [
      { title: "Generation is an estimate", body: "Annual generation is expressed in kilowatt-hours (kWh). It is calculated from the modeled system size and generic yield assumptions, including sun-hours, orientation, shade, and system performance." },
      { title: "Compare production with consumption", body: "The chart shows annual modeled solar production alongside household use. The two annual totals do not show when electricity is produced or consumed during the day.", bullets: ["A year with enough total generation can still import electricity at night.", "Actual output changes with weather, season, shading, equipment, and installation.", "The projection is not a live meter reading or a site-specific production guarantee."] },
      { title: "What to check next", body: "Replace illustrative inputs with a recent utility bill and ask an installer for a site-specific production estimate using the proposed equipment and roof layout." },
    ],
  },
  {
    slug: "consumption-savings",
    title: "Consumption and savings",
    eyebrow: "Energy use and bill impact",
    summary: "Learn how modeled household use, on-site solar consumption, export credits, and estimated bill savings fit together.",
    image: "/images/gallery/solar-battery-installation.webp",
    imageAlt: "A residential solar installation with battery storage",
    sections: [
      { title: "Savings depend on when energy is used", body: "The model estimates a share of solar energy used in the home and values that energy at the retail-rate assumption. Electricity exported to the grid uses the separate export-credit assumption." },
      { title: "What the estimate leaves out", body: "Annual totals simplify real hourly energy use. Fixed utility charges, financing, maintenance, taxes, changing utility rules, and detailed time-of-use rates are not fully modeled.", bullets: ["Export compensation may be lower than the retail electricity rate.", "Battery storage is not automatically included in this estimate.", "A detailed bill analysis can change the expected value of solar energy."] },
      { title: "Make the result more useful", body: "Enter the rate and usage from a recent bill, then confirm export compensation with your utility. Treat the result as an early planning estimate rather than a quote." },
    ],
  },
  {
    slug: "scenario-comparison",
    title: "Compare solar scenarios",
    eyebrow: "Explore alternatives",
    summary: "Compare how changing a planning assumption can change modeled capacity, generation, and savings.",
    image: "/images/gallery/solar-analytics.webp",
    imageAlt: "Solar planning analytics beside rooftop panels",
    sections: [
      { title: "Change assumptions deliberately", body: "A scenario comparison uses the same calculation model for each option. Change one major input at a time to understand its effect; changing many inputs together makes the cause of a difference harder to identify." },
      { title: "Keep a fair baseline", body: "The base assessment is the reference point. Alternatives are compared against it in the same units, with absolute values and changes shown together.", bullets: ["Roof area and shade can affect feasible system size and output.", "Electricity rates and export credits affect modeled bill savings.", "Scenario results remain estimates based on the supplied inputs."] },
      { title: "Open the comparison tool", body: "Use the comparison workspace to review sample alternatives, edit their assumptions, add another case, or export the selected comparison." },
    ],
  },
  {
    slug: "system-assumptions",
    title: "System assumptions",
    eyebrow: "Inputs, defaults, and limits",
    summary: "Review which values come from your inputs, which are generic model defaults, and what the estimate does not verify.",
    image: "/images/gallery/solar-roof-orientation.webp",
    imageAlt: "Aerial view of roof geometry and aligned photovoltaic panels",
    sections: [
      { title: "Your inputs and generic defaults", body: "The dashboard combines editable assumptions with generic planning factors. Sample values are illustrative. They are not fetched from a utility, weather service, subsidy database, or property record." },
      { title: "Important limitations", body: "The estimate is not an engineering design, installer quote, permit approval, utility interconnection review, or guarantee of savings.", bullets: ["Roof structure and exact dimensions are not assessed.", "Local irradiance, seasonal shade, and hourly usage are not measured.", "Incentive eligibility and export rules must be verified with official local sources."] },
      { title: "Improve the estimate", body: "Use recent bills and a verified roof survey where available. Confirm tariff and export rules with your utility, then ask a qualified local installer to validate the layout, equipment, and production estimate." },
    ],
  },
];

export function getDashboardInsight(slug: string) {
  return DASHBOARD_INSIGHTS.find(item => item.slug === slug);
}
