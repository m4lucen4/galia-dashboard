import type { ReactNode } from "react";
import { Brand } from "@/features/newWeb/components/ui/Brand";
import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { Container } from "@/features/newWeb/components/ui/Container";
import { LandingFooter } from "@/features/newWeb/components/LandingFooter";
import "@/features/newWeb/fonts.css";

type LegalPageProps = {
  document: "privacy" | "terms";
  title: string;
  description: string;
  children: ReactNode;
};

const documents = [
  { id: "privacy", href: "/privacy", label: "Política de privacidad" },
  { id: "terms", href: "/terms", label: "Términos de uso" },
] as const;

export const LegalPage = ({ document, title, description, children }: LegalPageProps) => (
  <div
    id="new-web-top"
    className="flex min-h-svh flex-col bg-[#d8e4d6] font-['Hanken_Grotesk',system-ui,sans-serif] text-base leading-normal text-[#010000] [--new-web-gutter:clamp(1.25rem,5.5556vw,5rem)] [&_a:focus-visible]:outline-[3px] [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-[#010000] [&_a:focus-visible]:outline-offset-4"
  >
    <a
      href="#legal-content"
      className="absolute top-2 left-(--new-web-gutter) z-50 -translate-y-[200%] rounded-full bg-[#010000] px-4 py-3 text-[#d8e4d6] focus:translate-y-0"
    >
      Saltar al contenido
    </a>
    <header className="sticky top-0 z-40 border-b-[1.5px] border-[#010000]/15 bg-[#d8e4d6]">
      <Container className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-3">
        <Brand />
        <ButtonLink href="/" variant="outline">
          Volver al inicio
        </ButtonLink>
      </Container>
    </header>
    <main id="legal-content" tabIndex={-1} className="flex-1 scroll-mt-28 pb-16 sm:pb-24">
      <Container>
        <div className="max-w-5xl pt-12 pb-10 sm:pt-20 sm:pb-14">
          <p className="mb-5 font-['Geist_Mono',monospace] text-sm uppercase tracking-[0.08em]">
            Información legal
          </p>
          <h1 className="text-[clamp(2.5rem,6vw,5rem)] leading-[1.02] font-medium tracking-[-0.035em]">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed sm:text-base">
            {description}
          </p>
        </div>
        <div className="grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Documentos legales" className="flex flex-wrap gap-3 lg:sticky lg:top-28 lg:flex-col">
            {documents.map(({ id, href, label }) => (
              <a
                key={id}
                href={href}
                aria-current={document === id ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-2xl border-[1.5px] border-[#010000] px-5 py-3 text-sm leading-snug no-underline ${document === id ? "bg-[#fbea71] font-medium" : "bg-transparent hover:bg-[#010000] hover:text-[#d8e4d6]"}`}
              >
                {label}
              </a>
            ))}
          </nav>
          <article
            aria-label={title}
            className="min-w-0 rounded-4xl border-[1.5px] border-[#010000] bg-white/40 p-6 text-base leading-[1.8] wrap-anywhere sm:p-10 lg:p-12 [&_section+section]:mt-8 [&_section+section]:border-t [&_section+section]:border-[#010000]/20 [&_section+section]:pt-8 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:leading-tight [&_h2]:font-medium [&_h2]:tracking-[-0.02em] sm:[&_h2]:text-2xl [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:leading-snug [&_h3]:font-medium [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_strong]:font-semibold"
          >
            {children}
          </article>
        </div>
      </Container>
    </main>
    <LandingFooter />
  </div>
);
