import type { ReactNode } from "react";
import { LandingHeader } from "@/features/newWeb/components/LandingHeader";
import { LandingFooter } from "@/features/newWeb/components/LandingFooter";
import { Container } from "@/features/newWeb/components/ui/Container";
import "@/features/newWeb/fonts.css";

export const DocumentationLayout = ({ children }: { children: ReactNode }) => (
  <div className="flex min-h-svh flex-col bg-[#d8e4d6] font-['Hanken_Grotesk',system-ui,sans-serif] text-base leading-normal text-[#010000] [--new-web-gutter:clamp(1.25rem,5.5556vw,5rem)] [&_:where(a,button,summary,input):focus-visible]:outline-[3px] [&_:where(a,button,summary,input):focus-visible]:outline-solid [&_:where(a,button,summary,input):focus-visible]:outline-[#010000] [&_:where(a,button,summary,input):focus-visible]:outline-offset-4">
    <a href="#wiki-content" className="absolute top-2 left-(--new-web-gutter) z-50 -translate-y-[200%] rounded-full bg-[#010000] px-4 py-3 text-[#d8e4d6] focus:translate-y-0">Saltar al contenido</a>
    <LandingHeader homePath="/" />
    <main id="wiki-content" tabIndex={-1} className="min-h-[calc(100svh-5rem)] flex-1 scroll-mt-28 pb-16 sm:pb-24">
      <Container className="pt-10 pb-12 sm:pt-16 sm:pb-16">
        <p className="font-['Geist_Mono',monospace] text-sm uppercase tracking-wide">Guías para tu estudio</p>
        <h1 className="mt-4 text-[clamp(3rem,7vw,6.5rem)] leading-[1.02] font-medium tracking-[-0.045em]">Documentación</h1>
        <p className="mt-5 max-w-2xl text-lg sm:text-xl">Guías para sacar el máximo partido a tu estudio.</p>
      </Container>
      {children}
    </main>
    <LandingFooter />
  </div>
);

export const DocumentationLoadingContent = () => (
  <div role="status" className="min-h-[50svh]">
    <span className="sr-only">Cargando documentación…</span>
    <div aria-hidden="true" className="space-y-6">
      <div className="h-5 w-1/3 rounded-full bg-[#010000]/10" />
      <div className="h-10 w-3/4 rounded-full bg-[#010000]/10" />
      <div className="space-y-3">
        <div className="h-4 rounded-full bg-[#010000]/10" />
        <div className="h-4 rounded-full bg-[#010000]/10" />
        <div className="h-4 w-2/3 rounded-full bg-[#010000]/10" />
      </div>
      <div className="h-48 rounded-3xl bg-[#010000]/10" />
    </div>
  </div>
);
