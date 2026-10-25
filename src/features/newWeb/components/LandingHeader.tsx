import { Brand } from "@/features/newWeb/components/ui/Brand";
import { Container } from "@/features/newWeb/components/ui/Container";
import { LandingNavigation } from "@/features/newWeb/components/LandingNavigation";

export const LandingHeader = () => (
  <header className="sticky top-0 z-40 bg-[#d8e4d6]">
    <Container className="flex min-h-20 items-center justify-between gap-8">
      <Brand />
      <div className="hidden min-[75rem]:block">
        <LandingNavigation />
      </div>
      <details className="block min-[75rem]:hidden [&:not([open])_nav]:hidden">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[999px] border-[1.5px] border-solid border-[#010000] bg-transparent px-4.5 py-2.5 font-[inherit] text-[length:inherit] leading-[1.25] text-center text-[#010000] no-underline hover:bg-[#010000] hover:text-[#d8e4d6] [&::-webkit-details-marker]:hidden">
          Menú
        </summary>
        <LandingNavigation />
      </details>
    </Container>
  </header>
);
