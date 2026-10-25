import projectForm from "@/assets/newWeb/how-it-works/project-form.png";
import preparedPosts from "@/assets/newWeb/how-it-works/prepared-posts.png";
import publishingCalendar from "@/assets/newWeb/how-it-works/publishing-calendar.png";
import { StepCard } from "@/features/newWeb/components/howItWorks/StepCard";
import { Container } from "@/features/newWeb/components/ui/Container";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";
import { StatusLegend } from "@/features/newWeb/components/ui/StatusLegend";

const steps = [
  {
    number: "01",
    title: "Sube el proyecto una vez",
    description: "Arrastra la carpeta de fotos, pega la memoria y añade ubicación y créditos.",
    screenshot: {
      src: projectForm,
      alt: "Formulario de edición de proyecto con campos y selector de imágenes",
      width: 1275,
      height: 750,
    },
    variant: "light",
  },
  {
    number: "02",
    title: "mocklab lo prepara",
    description: "Crea la ficha en tu web y propone los posts con las imágenes adaptadas.",
    screenshot: {
      src: preparedPosts,
      alt: "Cuadrícula de publicaciones preparadas con vistas previas y botones de publicación",
      width: 1275,
      height: 750,
    },
    variant: "light",
  },
  {
    number: "03",
    title: "Revisas y programas",
    description: "Ajustas lo que quieras y eliges fecha. Nada sale sin tu visto bueno.",
    screenshot: {
      src: publishingCalendar,
      alt: "Calendario de programación de publicaciones",
      width: 850,
      height: 500,
    },
    variant: "dark",
  },
] as const;

export const HowItWorksSection = () => (
  <section id="como-funciona" aria-labelledby="how-it-works-title" className="bg-[#d8e4d6] py-16 text-[#010000] lg:py-27.5">
    <Container className="flex flex-col gap-10 lg:gap-13">
      <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <SectionTitle id="how-it-works-title" className="min-w-0 text-[clamp(2rem,3.8889vw,3.5rem)] leading-[1.02]">
          Tres pasos. Tú decides en el último.
        </SectionTitle>
        <StatusLegend className="shrink-0" items={[{ label: "Borrador" }, { label: "Publicado", highlighted: true }]} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {steps.map(({ screenshot, ...step }) => (
          <StepCard
            key={step.number}
            {...step}
            preview={
              <img
                {...screenshot}
                loading="lazy"
                decoding="async"
                className="bg-[#d8e4d6] object-cover!"
                alt="How work moclklab"
              />
            }
          />
        ))}
      </div>
    </Container>
  </section>
);
