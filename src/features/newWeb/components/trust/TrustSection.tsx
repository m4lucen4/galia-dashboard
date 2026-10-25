import { Container } from "@/features/newWeb/components/ui/Container";
import { InfoRow } from "@/features/newWeb/components/ui/InfoRow";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";
import { ToggleIndicator } from "@/features/newWeb/components/ui/ToggleIndicator";

const assurances = [
  {
    title: "Revisión antes de publicar",
    description: "Nada sale a redes sin tu visto bueno.",
    active: true,
  },
  {
    title: "Créditos siempre visibles",
    description: "Fotógrafos y colaboradores en cada publicación.",
    active: true,
  },
  {
    title: "Prompts personalizados",
    description: "Opcional: puedes escribir tus propios textos.",
    active: false,
  },
  {
    title: "Incluye tu proyecto en la Guía de Arquitectura",
    description:
      "Con un sencillo gesto puedes añadir tu proyecto para que forme parte de esta gran red de arquitectura.",
    active: false,
  },
];

export const TrustSection = () => (
  <section
    aria-labelledby="trust-title"
    className="bg-[#d8e4d6] py-16 text-[#010000] lg:py-27.5"
  >
    <Container className="grid grid-cols-1 gap-y-10 lg:grid-cols-12 lg:gap-x-6">
      <SectionTitle
        id="trust-title"
        className="text-[clamp(2rem,3.8889vw,3.5rem)] leading-[1.02] lg:col-span-4"
      >
        Tus proyectos son tuyos.
      </SectionTitle>
      <div className="flex min-w-0 flex-col gap-3.5 lg:col-span-7 lg:col-start-6">
        {assurances.map(({ title, description, active }) => (
          <InfoRow
            key={title}
            title={title}
            description={description}
            trailing={<ToggleIndicator active={active} />}
          />
        ))}
      </div>
    </Container>
  </section>
);
