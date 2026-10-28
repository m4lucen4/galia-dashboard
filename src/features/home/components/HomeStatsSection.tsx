import type { ComponentProps } from "react";
import { HomeStatCard } from "./HomeStatCard";

type HomeStatsSectionProps = {
  title: string;
  description: string;
  items: ComponentProps<typeof HomeStatCard>[];
};

export const HomeStatsSection = ({ title, description, items }: HomeStatsSectionProps) => (
  <section className="space-y-5">
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{title}</h2>
      <p className="mt-1 text-sm text-[#010000]/65">{description}</p>
    </div>
    <dl className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:gap-5">
      {items.map((item) => <HomeStatCard key={item.label} {...item} />)}
    </dl>
  </section>
);
