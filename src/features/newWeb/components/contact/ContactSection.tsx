import { useState, useSyncExternalStore } from "react";
import { Container } from "../ui/Container";
import { Pill } from "../ui/Pill";
import { SectionTitle } from "../ui/SectionTitle";
import { ContactForm } from "./ContactForm";
import { createContactController } from "./contactSubmission";

export function ContactSection() {
  const [controller] = useState(() => createContactController());
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const linkFocus = "underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#fbea71]!";
  return (
    <section id="contacto" aria-labelledby="contacto-title" className="scroll-mt-24 bg-[#010000] py-16 text-[#d8e4d6] lg:py-25">
      <Container className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="flex min-w-0 flex-col items-start gap-7">
          <SectionTitle id="contacto-title" className="text-[clamp(2rem,3.62vw,3.25rem)] leading-[1.02] text-[#d8e4d6]">
            <Pill className="bg-[#d8e4d6] text-[#010000]">Te lo enseñamos</Pill>{" "}
            <Pill tone="yellow" className="mt-2.5">con un proyecto tuyo.</Pill>
          </SectionTitle>
          <p className="text-[19px] leading-[1.55]">
            Trae las fotos de un proyecto y sal de la reunión con tus post listos para publicar. En nuestra oficina de Sevilla o por videollamada.
          </p>
          <address className="flex flex-col gap-1.5 font-['Geist_Mono',monospace] text-[15px] not-italic">
            <span>Calle Arroyo 52, Sevilla</span>
            <span><a href="tel:+34954221051" className={linkFocus}>954 22 10 51</a>{" · "}<a href="tel:+34624643737" className={linkFocus}>624 64 37 37</a></span>
            <a href="mailto:hola@mocklab.app" className={linkFocus}>hola@mocklab.app</a>
          </address>
        </div>
        <ContactForm {...state} onChange={controller.update} onSubmit={(event) => {
          event.preventDefault();
          void controller.submit();
        }} />
      </Container>
    </section>
  );
}
