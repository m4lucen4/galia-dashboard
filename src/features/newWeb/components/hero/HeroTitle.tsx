import { Pill } from "@/features/newWeb/components/ui/Pill";

const iconClassName = "inline-flex size-[max(2.75rem,1.3em)] shrink-0 items-center justify-center rounded-full text-[#010000] [&_svg]:size-[max(1.705rem,0.62em)]";

export const HeroTitle = () => (
  <h1 className="flex min-w-0 max-w-full flex-col items-start gap-2 text-[clamp(1.75rem,4.03vw,3.625rem)] font-normal tracking-[-0.03em]">
    <Pill>Sube tu proyecto</Pill>{" "}
    <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <Pill className="min-w-0">una vez y publícalo</Pill>
      <span className={`${iconClassName} bg-[#8c8abc]`} aria-hidden="true">
        <svg viewBox="0 -960 960 960" fill="currentColor" focusable="false">
          <path d="M520-640v-160q0-17 11.5-28.5T560-840h240q17 0 28.5 11.5T840-800v160q0 17-11.5 28.5T800-600H560q-17 0-28.5-11.5T520-640ZM120-480v-320q0-17 11.5-28.5T160-840h240q17 0 28.5 11.5T440-800v320q0 17-11.5 28.5T400-440H160q-17 0-28.5-11.5T120-480Zm400 320v-320q0-17 11.5-28.5T560-520h240q17 0 28.5 11.5T840-480v320q0 17-11.5 28.5T800-120H560q-17 0-28.5-11.5T520-160Zm-400 0v-160q0-17 11.5-28.5T160-360h240q17 0 28.5 11.5T440-320v160q0 17-11.5 28.5T400-120H160q-17 0-28.5-11.5T120-160Zm80-360h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Z" />
        </svg>
      </span>
    </span>{" "}
    <Pill tone="yellow">en tu web, Instagram</Pill>{" "}
    <span className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
      <Pill tone="yellow" className="min-w-0">y LinkedIn.</Pill>
      <span className={`${iconClassName} bg-[#ff522a]`} aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="2.4" focusable="false">
          <rect x="5" y="5" width="26" height="26" rx="7.5" />
          <circle cx="18" cy="18" r="6.2" />
          <circle cx="25.6" cy="10.4" r="1.7" fill="currentColor" stroke="none" />
        </svg>
      </span>
    </span>
  </h1>
);
