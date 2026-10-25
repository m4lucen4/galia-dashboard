import type { IRequest } from "@/types";

export type MeetingMode = "Café en Sevilla" | "Teams";
export type ContactValues = {
  nombre: string;
  empresa: string;
  email: string;
  telefono: string;
  mensaje: string;
  consent: boolean;
  mode: MeetingMode;
};
export type ContactErrors = Partial<Record<keyof ContactValues, string>>;
export type ContactState = {
  values: ContactValues;
  errors: ContactErrors;
  request: IRequest;
};
export type ContactPayload = Pick<ContactValues, "nombre" | "empresa" | "email" | "telefono" | "mensaje">;

const initialValues = (): ContactValues => ({
  nombre: "", empresa: "", email: "", telefono: "", mensaje: "",
  consent: false, mode: "Teams",
});

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.nombre.trim()) errors.nombre = "Escribe tu nombre.";
  if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/.test(values.email.trim())) {
    errors.email = "Escribe un email válido.";
  }
  if (!values.mensaje.trim()) errors.mensaje = "Cuéntanos qué te gustaría ver.";
  if (!values.consent) errors.consent = "Debes aceptar la política de privacidad.";
  return errors;
}

export function createContactPayload(values: ContactValues): ContactPayload {
  return {
    nombre: values.nombre.trim(),
    empresa: values.empresa.trim(),
    email: values.email.trim(),
    telefono: values.telefono.trim(),
    mensaje: `Formato preferido: ${values.mode}\n\n${values.mensaje.trim()}`,
  };
}

/** Owns the synchronous pending guard and retains inputs until confirmed delivery. */
export function createContactController(fetcher: typeof fetch = fetch) {
  let state: ContactState = {
    values: initialValues(), errors: {},
    request: { inProgress: false, messages: "", ok: false },
  };
  const listeners = new Set<() => void>();
  const publish = (next: ContactState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    update: (patch: Partial<ContactValues>) => {
      if (state.request.inProgress) return;
      publish({ ...state, values: { ...state.values, ...patch }, errors: {},
        request: { inProgress: false, messages: "", ok: false } });
    },
    submit: async (): Promise<boolean> => {
      if (state.request.inProgress) return false;
      const errors = validateContact(state.values);
      if (Object.keys(errors).length) {
        publish({ ...state, errors, request: {
          inProgress: false, messages: "Revisa los campos indicados antes de enviar.", ok: false,
        } });
        return false;
      }
      const payload = createContactPayload(state.values);
      publish({ ...state, errors: {}, request: {
        inProgress: true, messages: "Enviando tu mensaje...", ok: false,
      } });
      try {
        const response = await fetcher("/api/contact-form", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result: unknown = await response.json();
        if (!response.ok || typeof result !== "object" || result === null ||
          !("success" in result) || result.success !== true) {
          throw new Error("Unconfirmed delivery");
        }
        publish({ values: initialValues(), errors: {}, request: {
          inProgress: false, messages: "¡Mensaje enviado! Te contactaremos pronto.", ok: true,
        } });
        return true;
      } catch {
        publish({ ...state, request: {
          inProgress: false,
          messages: "No hemos podido confirmar el envío. Conservamos tus datos; puedes volver a intentarlo.",
          ok: false,
        } });
        return false;
      }
    },
  };
}
