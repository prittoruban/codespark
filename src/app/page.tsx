import { EfficiencyCard } from "@/components/dashboard/EfficiencyCard";
import { FeatureCards } from "@/components/dashboard/FeatureCards";
import { FieldHero } from "@/components/dashboard/FieldHero";
import { Greeting } from "@/components/dashboard/Greeting";
import { GrowthRateCard } from "@/components/dashboard/GrowthRateCard";
import { RecommendationsCard } from "@/components/dashboard/RecommendationsCard";
import { WeatherSummaryCard } from "@/components/dashboard/WeatherSummaryCard";

export default function OverviewPage() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] xl:gap-6">
      <div className="flex min-w-0 flex-col gap-5">
        <Greeting />
        <FieldHero />
        <FeatureCards />
      </div>
      <div className="grid min-w-0 content-start gap-5 md:grid-cols-2 xl:grid-cols-1">
        <div className="md:col-span-2 xl:col-span-1">
          <WeatherSummaryCard />
        </div>
        <GrowthRateCard />
        <RecommendationsCard />
        <div className="md:col-span-2 xl:col-span-1">
          <EfficiencyCard />
        </div>
      </div>
    </div>
  );
}
