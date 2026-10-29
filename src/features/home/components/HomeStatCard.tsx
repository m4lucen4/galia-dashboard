import type { ComponentType, SVGProps } from "react";

type HomeStatCardProps = {
  label: string;
  value: number | string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: "yellow" | "violet" | "mint";
};

const tones = {
  yellow: "bg-[#fbea71]",
  violet: "bg-[#8c8abc]",
  mint: "bg-[#d8e4d6] border border-[#010000]/20",
};

export const HomeStatCard = ({ label, value, icon: Icon, tone }: HomeStatCardProps) => (
  <div className={`flex min-h-52 min-w-0 flex-col justify-between gap-8 rounded-[28px] p-6 ${tones[tone]}`}>
    <div className="flex items-start justify-between gap-4">
      <dt className="max-w-48 text-base leading-snug font-medium">{label}</dt>
      <Icon className="size-6 shrink-0" aria-hidden="true" />
    </div>
    <dd className="font-['Geist_Mono',monospace] text-4xl leading-none tracking-[-0.05em] sm:text-5xl">{value}</dd>
  </div>
);
