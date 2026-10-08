import type { Metadata } from "next";
import { ComparisonEntry } from "@/components/solar/comparison-entry";

export const metadata: Metadata = {
  title: "Scenario comparison · SolarSmart",
  description: "Compare editable rooftop solar planning scenarios using the same transparent calculation model.",
};

export default function ScenarioComparisonPage() { return <ComparisonEntry/>; }
