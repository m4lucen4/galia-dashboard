import { Pill } from "@/features/newWeb/components/ui/Pill";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";

export const BrandVoiceTitle = () => (
  <SectionTitle
    id="brand-voice-title"
    className="flex min-w-0 flex-col items-start gap-2.5 text-[clamp(2rem,3.4722vw,3.125rem)] leading-[1.02]"
  >
    <Pill className="bg-[#d8e4d6] text-[#010000]">Escribe como</Pill>{" "}
    <Pill className="bg-[#d8e4d6] text-[#010000]">tu estudio</Pill>{" "}
    <Pill tone="yellow">y no como una IA.</Pill>
  </SectionTitle>
);
