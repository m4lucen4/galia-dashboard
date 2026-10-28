import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { Container } from "@/features/newWeb/components/ui/Container";
import { Pill } from "@/features/newWeb/components/ui/Pill";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";
import { PortfolioPreview } from "@/features/newWeb/components/websiteBuilder/PortfolioPreview";

const features = [
  "Portfolio con filtros",
  "Galería y créditos",
  "Formulario de contacto",
  "Dominio propio",
];

const projects = Array.from({ length: 6 }, (_, index) => ({
  id: `portfolio-illustration-${index + 1}`,
  label: "proyecto",
}));

export const WebsiteBuilderSection = () => (
  <section
    id="tu-web"
    aria-labelledby="website-builder-title"
    className="bg-[#d8e4d6] pt-10 pb-16 text-[#010000] lg:pt-20 lg:pb-20"
  >
    <Container>
      <div className="grid grid-cols-1 items-center gap-y-10 rounded-[40px] bg-[#8c8abc] p-6 sm:p-10 lg:grid-cols-12 lg:gap-x-6 lg:p-16">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-5">
          <Pill
            aria-describedby="website-builder-tax-note"
            className="self-start px-4 py-2.25 font-['Geist_Mono',monospace] text-[14px] leading-normal text-[#fbea71]"
          >
            Constructor web · +18,50 €/mes* sobre tu plan
          </Pill>
          <SectionTitle
            id="website-builder-title"
            className="text-[clamp(2rem,3.75vw,3.375rem)] leading-[1.02]"
          >
            Tu web de estudio, siempre al día.
          </SectionTitle>
          <p className="text-[19px] leading-normal">
            Cada proyecto que subes para redes crea su ficha en tu web. Sin WordPress, sin plugins.
          </p>
          <div className="flex flex-wrap gap-2">
            {features.map((feature) => (
              <Pill
                key={feature}
                className="border-[1.5px] border-[#010000] bg-transparent px-3.5 py-2 text-[15px] leading-normal text-[#010000]"
              >
                {feature}
              </Pill>
            ))}
          </div>
          <ButtonLink href="/register" className="w-full max-w-full self-start px-8 py-4 text-[#fbea71] sm:w-72">
            Empezar
          </ButtonLink>
        </div>
        <PortfolioPreview
          className="lg:col-span-6 lg:col-start-7"
          address="tuestudio.com/proyectos"
          studio="[Tu estudio]"
          projects={projects}
        />
      </div>
      <p id="website-builder-tax-note" className="mt-4 text-[14px]">
        *Impuestos no incluidos
      </p>
    </Container>
  </section>
);
