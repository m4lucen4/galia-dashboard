import { BrandVoiceTitle } from "@/features/newWeb/components/brandVoice/BrandVoiceTitle";
import { Container } from "@/features/newWeb/components/ui/Container";
import { TextExampleCard } from "@/features/newWeb/components/ui/TextExampleCard";

export const BrandVoiceSection = () => (
  <section aria-labelledby="brand-voice-title" className="bg-[#d8e4d6] pt-10 pb-16 lg:pb-20">
    <Container>
      <div className="grid grid-cols-1 items-center gap-10 rounded-[40px] bg-[#010000] p-6 text-[#d8e4d6] sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-18">
        <div className="min-w-0">
          <BrandVoiceTitle />
          <p className="mt-7 max-w-125 text-[19px] leading-[1.55]">
            Con un prompt personalizado podrás generar textos que mantengan tu tono y forma de entender la arquitectura. Porque comunicar bien también es una forma de proyectar.
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-4.5">
          <TextExampleCard
            variant="generic"
            label="IA genérica"
            text="Descubre este increíble proyecto que combina a la perfección diseño moderno y funcionalidad. Un espacio único que te dejará sin palabras."
          />
          <TextExampleCard
            variant="studio"
            label="Con la voz de tu estudio · ejemplo"
            text="Rehabilitamos una casa patio de principios del siglo XX conservando los muros de carga y la cal original. La luz sigue entrando por donde siempre entró: el patio. Fotografía: [nombre de la fotógrafa]."
          />
        </div>
      </div>
    </Container>
  </section>
);
