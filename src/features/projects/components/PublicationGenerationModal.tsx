import { useEffect, useRef, useState } from "react";
import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { PillButton } from "@/components/shared/ui/PillButton";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPromptsByUser } from "@/redux/actions/AdminActions";
import type { PromptsProps } from "@/types";
import type { GenerationConfiguration } from "../types/publicationGeneration";

type Props = {
  projectTitle: string;
  blocked: boolean;
  onClose: () => void;
  onGenerate: (configuration: GenerationConfiguration) => void;
};

export function PublicationGenerationModal({ projectTitle, blocked, onClose, onGenerate }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const actor = useAppSelector((state) => state.auth.user?.uid);
  const [publicationsCount, setCount] = useState(1);
  const [requiresAI, setAI] = useState(false);
  const [promptId, setPromptId] = useState("");
  const [catalog, setCatalog] = useState<{ prompts: PromptsProps[]; loading: boolean; error: boolean }>({
    prompts: [], loading: true, error: false,
  });
  const [reload, setReload] = useState(0);
  const submitted = useRef(false);
  const prefix = "publicationGeneration.modal";

  useEffect(() => {
    let current = true;
    if (actor) {
      // Use this fetch's result, not the shared admin catalog (which may contain
      // another actor's/private prompts or be overwritten by an open drawer).
      void dispatch(fetchPromptsByUser({ userUid: actor, includePublic: true })).unwrap().then(({ prompts }) => {
        if (current) setCatalog({
          prompts: prompts.filter((prompt: PromptsProps) =>
            (prompt.user === actor || prompt.isPrivate === false)
            && (typeof prompt.id === "string" || Number.isSafeInteger(prompt.id))),
          loading: false, error: false,
        });
      }).catch(() => { if (current) setCatalog({ prompts: [], loading: false, error: true }); });
    }
    return () => { current = false; };
  }, [actor, dispatch, reload]);

  const selected = catalog.prompts.find((prompt) => String(prompt.id) === promptId);
  const disabled = blocked || !actor || (requiresAI && (catalog.loading || catalog.error || !selected));
  const field = "min-h-11 w-full rounded-xl border border-[#010000]/30 bg-transparent px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <Dialog open onClose={onClose} className="relative z-60 font-['Hanken_Grotesk',system-ui,sans-serif] text-[#010000]">
      <DialogBackdrop className="fixed inset-0 bg-[#010000]/45" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <DialogPanel className="w-full max-w-lg space-y-5 rounded-[28px] border border-[#010000]/15 bg-[#d8e4d6] p-6 shadow-xl sm:p-8">
            <DialogTitle className="text-2xl font-medium">{t(`${prefix}.title`)}</DialogTitle>
            <Description className="break-words text-sm">{projectTitle} — {t(`${prefix}.description`)}</Description>
            <form className="space-y-5" onSubmit={(event) => {
              event.preventDefault();
              if (disabled || submitted.current) return;
              submitted.current = true;
              onGenerate({ publicationsCount, requiresAI, promptId: requiresAI ? promptId : null });
            }}>
              <fieldset className="space-y-2">
                <legend className="font-medium">{t(`${prefix}.count`)}</legend>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                  {[1, 2, 3, 4].map((count) => (
                    <button
                      key={count}
                      type="button"
                      data-autofocus={count === 1 ? "" : undefined}
                      onClick={() => setCount(count)}
                      aria-pressed={publicationsCount === count}
                      className={`min-h-12 rounded-full border border-[#010000]/40 py-3 font-mono transition-colors focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 ${
                        publicationsCount === count
                          ? "bg-[#010000] text-[#d8e4d6]"
                          : "bg-transparent text-[#010000] hover:bg-[#010000]/5"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" className="size-5 shrink-0 accent-[#010000] focus-visible:outline-2 focus-visible:outline-offset-4" checked={requiresAI} onChange={(event) => setAI(event.target.checked)} />
                {t(`${prefix}.ai`)}
              </label>
              {requiresAI && <div className="space-y-3">
                {catalog.loading ? <p role="status">{t(`${prefix}.loading`)}</p>
                  : catalog.error ? <div role="status" className="space-y-2">
                    <p>{t(`${prefix}.error`)}</p>
                    <PillButton type="button" variant="outline" onClick={() => {
                      setCatalog({ prompts: [], loading: true, error: false }); setReload((value) => value + 1);
                    }}>{t("publicationGeneration.refresh")}</PillButton>
                  </div> : !catalog.prompts.length ? <p role="status">{t(`${prefix}.empty`)}</p> : <>
                    <label htmlFor="generation-prompt" className="block font-medium">{t(`${prefix}.prompt`)}</label>
                    <select id="generation-prompt" className={field} required value={promptId} onChange={(event) => setPromptId(event.target.value)}>
                      <option value="">{t(`${prefix}.choosePrompt`)}</option>
                      {catalog.prompts.map((prompt) => <option key={prompt.id} value={String(prompt.id)}>{prompt.title}</option>)}
                    </select>
                    {selected && <div className="space-y-2 rounded-xl border border-[#010000]/20 p-3">
                      <h3 className="break-words font-medium">{selected.title}</h3>
                      <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-sm" tabIndex={0} aria-label={t(`${prefix}.preview`)}>{selected.description}</p>
                    </div>}
                  </>}
              </div>}
              {blocked && <p role="status" className="text-sm">{t(`${prefix}.blocked`)}</p>}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <PillButton type="button" variant="outline" onClick={onClose}>{t("shared.cancel")}</PillButton>
                <PillButton type="submit" disabled={disabled}>{t(`${prefix}.generate`)}</PillButton>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
