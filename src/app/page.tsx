import type { Metadata } from "next";
import { SolarStory } from "@/components/solar/solar-story";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "SolarSmart · Your roof, your energy, your plan",
  description: "Learn how a rooftop solar plan comes together, with clear assumptions and account-aware planning tools.",
};

export default function Home() {
  return <div className="app-shell landing-shell">
    <main id="main-content" className="main" tabIndex={-1}>
      <SolarStory/>
    </main>
    <SiteFooter/>
  </div>;
}
