import heroImage from "@/assets/newWeb/hero.jpg";
import { HeroMedia } from "@/features/newWeb/components/hero/HeroMedia";
import { HeroTitle } from "@/features/newWeb/components/hero/HeroTitle";
import type { HeroBannerProps } from "@/features/newWeb/components/hero/HeroBanner";
import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { Container } from "@/features/newWeb/components/ui/Container";

const banners: HeroBannerProps[] = [
  {
    label: "Ficha web",
    badges: [{ label: "tuestudio.com", tone: "lavender" }],
    className: "min-[75rem]:-left-10 min-[75rem]:top-[60px]",
  },
  {
    label: "Instagram",
    tone: "dark",
    badges: [{ label: "4:5", tone: "orange" }, { label: "mar 10:00", tone: "sage" }],
    className: "min-[75rem]:-right-6 min-[75rem]:top-[250px]",
  },
  {
    label: "LinkedIn",
    badges: [{ label: "programado", tone: "olive" }, { label: "jue 9:30", tone: "ink" }],
    className: "min-[75rem]:-left-6 min-[75rem]:top-[430px]",
  },
];

export const LandingHero = () => (
  <section aria-label="Publica tus proyectos con mocklab">
    <Container className="grid items-center gap-10 py-10 min-[75rem]:min-h-207.5 min-[75rem]:grid-cols-12 min-[75rem]:gap-6 min-[75rem]:py-16">
      <div className="flex min-w-0 flex-col items-start gap-8.5 min-[75rem]:col-span-7">
        <HeroTitle />
        <p className="max-w-155 text-lg leading-normal sm:text-[21px]">
          mocklab convierte las fotos y la memoria de tus proyectos en tu web de portafolio y en posts listos para redes, escritos con la voz de tu estudio. Así tú solo revisas y apruebas.
        </p>
        <ButtonLink href="#como-funciona" variant="outline" className="px-7 py-4.25 text-[17px]">
          Ver cómo funciona
        </ButtonLink>
      </div>
      <HeroMedia
        className="min-[75rem]:col-span-5"
        src={heroImage}
        alt="Nave industrial con fachada translúcida, proyecto publicado con mocklab"
        width={1200}
        height={744}
        credit="Fotografía: Juanca Lagares"
        banners={banners}
      />
    </Container>
  </section>
);
