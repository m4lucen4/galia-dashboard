import { ChannelIcon } from "@/features/newWeb/components/channels/ChannelIcon";
import { Container } from "@/features/newWeb/components/ui/Container";
import { FeatureCard } from "@/features/newWeb/components/ui/FeatureCard";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";

const channels = [
  {
    channel: "web",
    title: "Tu web",
    description: "Ficha del proyecto con galería, memoria y créditos.",
    accent: "violet",
  },
  {
    channel: "instagram",
    title: "Instagram",
    description: "Carrusel con recortes 4:5 y texto adaptado.",
    accent: "orange",
  },
  {
    channel: "linkedin",
    title: "LinkedIn",
    description: "Post con tono profesional para clientes y promotores.",
    accent: "olive",
  },
  {
    channel: "calendar",
    title: "Tu calendario",
    description: "Programas fechas y te avisamos por email al publicar.",
    accent: "mint",
  },
] as const;

export const OutputChannelsSection = () => (
  <section aria-labelledby="output-channels-title" className="bg-[#010000] py-16 text-[#d8e4d6] lg:py-25">
    <Container className="flex flex-col gap-10 lg:gap-16">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
        <SectionTitle id="output-channels-title" className="min-w-0 max-w-200 text-[#d8e4d6]">
          Tu estudio ya tiene proyectos. Lo que falta es tiempo para contarlos.
        </SectionTitle>
        <p className="max-w-100 text-[19px] leading-normal lg:flex-[0_0_30%]">
          Proyectos que nunca se publican, textos que cuestan una noche, una web que se quedó atrás. mocklab lo resuelve desde un solo sitio.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {channels.map(({ channel, ...card }) => (
          <FeatureCard key={channel} {...card} variant="filled" icon={<ChannelIcon channel={channel} />} />
        ))}
      </div>
    </Container>
  </section>
);
