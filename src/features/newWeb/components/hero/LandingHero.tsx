import { HeroMedia } from "@/features/newWeb/components/hero/HeroMedia";
import { HeroTitle } from "@/features/newWeb/components/hero/HeroTitle";
import { ButtonLink } from "@/features/newWeb/components/ui/Button";
import { Container } from "@/features/newWeb/components/ui/Container";

const heroVideoUrl = "https://www.dropbox.com/scl/fi/clbqbzqj7kw4qkakgsn5f/mocklab.app-comercial-30s-01.mp4?rlkey=khey2naf2ae3pjx2n0jp0rp40&raw=1";

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
        src={heroVideoUrl}
      />
    </Container>
  </section>
);
