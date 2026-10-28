import { useId, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

export const MyWebInactiveInfo = () => {
  const { t } = useTranslation();
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
    >
      <button
        type="button"
        aria-label={t("settings.myWebInactiveInfo")}
        aria-describedby={tooltipId}
        className="rounded-full p-1 text-[#010000]/65 hover:text-[#010000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#010000]"
      >
        <InformationCircleIcon className="size-5" aria-hidden="true" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        hidden={!open}
        className="absolute bottom-full left-1/2 z-20 w-64 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-2xl bg-[#010000] p-3 text-left text-sm leading-relaxed whitespace-normal text-[#d8e4d6] shadow-md"
      >
        {t("settings.myWebInactiveDescription")}
      </span>
    </span>
  );
};
