import ambitoPortfolio from "@/assets/newWeb/case-studies/ambito-portfolio.jpg";
import ele2fPortfolio from "@/assets/newWeb/case-studies/ele2f-portfolio.jpg";
import donairePortfolio from "@/assets/newWeb/case-studies/donaire-portfolio.jpg";
import { CaseStudyCard, type CaseStudyCardProps } from "@/features/newWeb/components/ui/CaseStudyCard";
import { Container } from "@/features/newWeb/components/ui/Container";
import { SectionTitle } from "@/features/newWeb/components/ui/SectionTitle";

const cases = [
  {
    image: ambitoPortfolio,
    alt: "225 viviendas en Avenida de las Ciencias, de ámbito arquitectura",
    width: 2560,
    height: 1707,
    studio: "ámbito arquitectura",
    channel: "Instagram",
    badgeTone: "orange",
    caption: "Proyecto: 225 Viviendas en Avda. de las Ciencias",
  },
  {
    image: ele2fPortfolio,
    alt: "Torre Palmas Altas Metrovacesa, concurso de ele2f arquitectos",
    width: 1000,
    height: 617,
    studio: "ele2f arquitectos",
    channel: "LinkedIn",
    badgeTone: "olive",
    caption: "Concurso: Torre Palmas Altas Metrovacesa C145",
  },
  {
    image: donairePortfolio,
    alt: "Web de Donaire Arquitectos hecha con mocklab",
    width: 2992,
    height: 1544,
    objectPosition: "top",
    studio: "Donaire Arquitectos",
    channel: "Web",
    badgeTone: "lavender",
    caption: (
      <a href="http://donairearquitectos.com/" className="underline underline-offset-4">
        Visita la web creada desde mocklab
      </a>
    ),
  },
] satisfies CaseStudyCardProps[];

export const CaseStudiesSection = () => (
  <section
    aria-labelledby="case-studies-title"
    className="bg-[#d8e4d6] py-16 text-[#010000] lg:py-27.5"
  >
    <Container className="flex flex-col gap-12">
      <SectionTitle
        id="case-studies-title"
        className="text-[clamp(2rem,3.8889vw,3.5rem)] leading-[1.02]"
      >
        Obra real, publicada de verdad.
      </SectionTitle>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {cases.map((study) => <CaseStudyCard key={study.studio} {...study} />)}
      </div>
    </Container>
  </section>
);
