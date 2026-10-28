import { Brand } from "@/features/newWeb/components/ui/Brand";
import { Container } from "@/features/newWeb/components/ui/Container";

export const LandingFooter = () => (
  <footer className="bg-[#010000] py-8 text-[#d8e4d6] [&_a:focus-visible]:outline-[3px] [&_a:focus-visible]:outline-solid [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-[#d8e4d6]!">
    <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-6 border-t-[1.5px] border-[#d8e4d6] pt-6">
      <div className="rounded-[999px] border-[1.5px] border-[#d8e4d6]">
        <Brand />
      </div>
      <p className="font-['Geist_Mono',monospace] text-sm">
        © 2026 Mocklab. Todos los derechos reservados.
      </p>
      <nav aria-label="Información legal y documentación" className="flex flex-wrap gap-x-6 gap-y-3 font-['Geist_Mono',monospace] text-sm">
        <a href="/articulos" className="rounded-sm underline underline-offset-4">Artículos</a>
        <a href="/wiki" className="rounded-sm underline underline-offset-4">Documentación</a>
        <a href="/privacy#legal-notice" className="rounded-sm underline underline-offset-4">Aviso legal</a>
        <a href="/privacy" className="rounded-sm underline underline-offset-4">Política de privacidad</a>
        <a href="/cookies" className="rounded-sm underline underline-offset-4">Política de cookies</a>
        <a href="/terms" className="rounded-sm underline underline-offset-4">Términos de uso</a>
      </nav>
    </Container>
  </footer>
);
