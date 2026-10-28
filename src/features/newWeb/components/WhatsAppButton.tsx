import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/features/newWeb/components/ui/Button";

const phoneNumber = "34676046878";
const defaultMessage = "Hola, me gustaría obtener más información sobre mocklab.";

type WhatsAppMessageFormProps = {
  messageId: string;
  message: string;
  onMessageChange: (message: string) => void;
  onClose: () => void;
};

export const WhatsAppMessageForm = ({ messageId, message, onMessageChange, onClose }: WhatsAppMessageFormProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) return;

    window.location.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-col gap-5">
      <h2 className="text-xl font-medium">Hablemos por WhatsApp</h2>
      <div className="flex flex-col gap-2">
        <label htmlFor={messageId} className="font-['Geist_Mono',monospace] text-sm">Escribe tu mensaje</label>
        <textarea
          id={messageId}
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          rows={3}
          placeholder="Escribe tu mensaje aquí..."
          className="w-full resize-y rounded-2xl border-[1.5px] border-[#010000] bg-transparent px-4 py-3 text-base focus-visible:outline-2 focus-visible:outline-[#010000] focus-visible:outline-offset-4"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!message.trim()} className="flex-1 text-[#fbea71]">Enviar</Button>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
      </div>
    </form>
  );
};

export const WhatsAppButton = () => {
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState(defaultMessage);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label="Contactar por WhatsApp"
        aria-haspopup="dialog"
        aria-controls={dialogId}
        className="fixed right-5 bottom-6 z-50 inline-flex size-14 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#010000] bg-[#fbea71] text-[#010000] shadow-lg transition-colors hover:bg-[#d8e4d6] sm:right-6 sm:size-16"
      >
        <svg aria-hidden="true" className="size-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.893 3.386" />
        </svg>
      </button>
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Contactar por WhatsApp"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        className="fixed inset-auto right-5 bottom-24 m-0 max-h-[calc(100svh-7rem)] w-[min(22rem,calc(100%-2.5rem))] max-w-none overflow-y-auto rounded-4xl border-[1.5px] border-[#010000] bg-[#d8e4d6] p-6 text-[#010000] shadow-xl backdrop:bg-[#010000]/20 sm:right-6 sm:bottom-28"
      >
        <WhatsAppMessageForm
          messageId={`${dialogId}-message`}
          message={message}
          onMessageChange={setMessage}
          onClose={() => dialogRef.current?.close()}
        />
      </dialog>
    </>
  );
};
