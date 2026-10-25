import { useId, type FormEventHandler } from "react";
import { Button } from "../ui/Button";
import { FormField } from "../ui/FormField";
import { FormNotice } from "../ui/FormNotice";
import type { ContactState, ContactValues, MeetingMode } from "./contactSubmission";

export type ContactFormProps = ContactState & {
  onChange: (patch: Partial<ContactValues>) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function ContactForm({ values, errors, request, onChange, onSubmit }: ContactFormProps) {
  const id = useId();
  const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]";
  return (
    <form onSubmit={onSubmit} aria-label="Contacto" aria-busy={request.inProgress}
      className="min-w-0 rounded-4xl bg-[#d8e4d6] p-6 text-[#010000] sm:p-10">
      <fieldset disabled={request.inProgress} className="flex min-w-0 flex-col gap-4.5 border-0 p-0">
        <legend className="sr-only">Envíanos tu consulta</legend>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" name="nombre" autoComplete="name" required value={values.nombre}
            error={errors.nombre} onChange={(event) => onChange({ nombre: event.target.value })} />
          <FormField label="Estudio" name="empresa" autoComplete="organization" value={values.empresa}
            onChange={(event) => onChange({ empresa: event.target.value })} />
          <FormField label="Email" type="email" name="email" autoComplete="email" required value={values.email}
            error={errors.email} onChange={(event) => onChange({ email: event.target.value })} />
          <FormField label="Teléfono (opcional)" type="tel" name="telefono" autoComplete="tel" value={values.telefono}
            onChange={(event) => onChange({ telefono: event.target.value })} />
        </div>
        <fieldset className="min-w-0 border-0 p-0">
          <legend className="mb-2 text-[15px]">¿Cómo prefieres vernos?</legend>
          <div className="inline-flex flex-wrap gap-1 rounded-[28px] border-[1.5px] border-[#010000] p-1 font-['Geist_Mono',monospace] text-sm">
            {(["Café en Sevilla", "Teams"] as MeetingMode[]).map((mode) => (
              <label key={mode} className={`flex cursor-pointer items-center gap-2 rounded-full px-3 py-2.5 ${values.mode === mode ? "bg-[#010000] text-[#d8e4d6]" : ""}`}>
                <input type="radio" name={`${id}-formato`} value={mode} checked={values.mode === mode}
                  onChange={() => onChange({ mode })}
                  className={`size-4 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4 ${values.mode === mode ? "focus-visible:outline-[#fbea71]" : "focus-visible:outline-[#010000]"}`} />
                {mode}
              </label>
            ))}
          </div>
        </fieldset>
        <FormField multiline label="¿Qué te gustaría ver?" name="mensaje" rows={3} required value={values.mensaje}
          error={errors.mensaje} onChange={(event) => onChange({ mensaje: event.target.value })} />
        <div className="text-[15px]">
          <div className="flex items-start gap-2.5">
            <input id={`${id}-consent`} name="consent" type="checkbox" required checked={values.consent}
              onChange={(event) => onChange({ consent: event.target.checked })}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? `${id}-consent-error` : undefined}
              className={`mt-0.5 size-5 shrink-0 accent-[#010000] ${focus}`} />
            <label htmlFor={`${id}-consent`}>Acepto la <a href="/privacy" className={`underline underline-offset-2 ${focus}`}>política de privacidad</a></label>
          </div>
          {errors.consent && <p id={`${id}-consent-error`} className="mt-1.5 text-sm font-medium">{errors.consent}</p>}
        </div>
        <Button type="submit" disabled={request.inProgress}
          className={`min-h-14 w-full text-[17px] text-[#fbea71] ${focus}`}>
          {request.inProgress ? "Enviando..." : "Enviar"}
        </Button>
      </fieldset>
      <div className={request.messages ? "mt-4.5" : ""}><FormNotice {...request} /></div>
    </form>
  );
}
