// Feature-local dashboard tokens: public-site colors and shared controls stay untouched.
// Inner editor groups deliberately avoid repeating the outer dashboard panel chrome.
export const myWebEditorClassName = "@container w-full min-w-0 max-w-5xl space-y-5";
export const myWebGroupClassName = "min-w-0 space-y-3";
export const myWebFieldGridClassName =
  "grid min-w-0 grid-cols-1 gap-4 @min-[36rem]:grid-cols-2";
export const myWebChoiceGridClassName =
  "grid min-w-0 grid-cols-1 gap-2 @min-[30rem]:grid-cols-2 @min-[52rem]:grid-cols-3";
export const myWebThumbnailClassName =
  "flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full";

export const myWebPanelClassName =
  "min-w-0 space-y-5 rounded-[28px] border border-[#010000]/20 p-5 sm:p-7";

export const myWebControlClassName =
  "block min-h-12 w-full min-w-0 rounded-2xl border border-[#010000]/40 bg-transparent px-4 py-3 text-base text-[#010000] placeholder:text-[#010000]/50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const myWebLabelClassName = "text-sm font-medium text-[#010000]";
export const myWebHeadingClassName = "text-xl font-medium tracking-[-0.03em]";
export const myWebMutedClassName = "text-sm leading-relaxed text-[#010000]/65";

export const myWebOptionClassName =
  "min-w-0 rounded-2xl border border-[#010000]/20 bg-transparent p-3 text-left text-[#010000] transition-colors hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export const myWebSelectedOptionClassName = "border-[#010000] bg-[#010000]/5 ring-1 ring-[#010000]";

export const myWebIconButtonClassName =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#010000]/20 text-[#010000] hover:bg-[#010000]/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[#010000] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

export const myWebLegacyControlsClassName =
  "min-w-0 [&_input:not([type=checkbox]):not([type=color])]:rounded-2xl [&_input:not([type=checkbox]):not([type=color])]:border [&_input:not([type=checkbox]):not([type=color])]:border-[#010000]/40 [&_input:not([type=checkbox]):not([type=color])]:bg-transparent [&_input:not([type=checkbox]):not([type=color])]:px-4 [&_input:not([type=checkbox]):not([type=color])]:py-3 [&_textarea]:rounded-2xl [&_textarea]:border [&_textarea]:border-[#010000]/40 [&_textarea]:bg-transparent [&_select]:min-h-12 [&_select]:rounded-2xl [&_select]:border [&_select]:border-[#010000]/40 [&_select]:bg-transparent [&_select]:px-4 [&_select]:py-3 [&_input]:focus-visible:outline-2 [&_input]:focus-visible:outline-offset-2 [&_textarea]:focus-visible:outline-2 [&_textarea]:focus-visible:outline-offset-2 [&_select]:focus-visible:outline-2 [&_select]:focus-visible:outline-offset-2";
