import type { Metadata } from "next";
import { SolarStory } from "@/components/solar/solar-story";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "SolarSmart · Your roof, your energy, your plan",
  description: "Explore a local, transparent rooftop solar planning estimate with no account required.",
};

export default function Home() {
  return <div className="app-shell landing-shell">
    <main id="main-content" className="main" tabIndex={-1}>
      <SolarStory/>
    </main>
    <SiteFooter/>
  </div>;
}
