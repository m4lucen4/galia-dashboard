export const BrandMark = ({ compact = false }: { compact?: boolean }) => (
  <span className={`inline-flex shrink-0 items-center rounded-full bg-[#010000] p-1 leading-tight font-medium tracking-[-0.03em] text-[#d8e4d6] ${compact ? "text-lg" : "text-2xl"}`}>
    {!compact && <span className="pt-0 pr-2.5 pb-0.75 pl-4" aria-hidden="true">mock</span>}
    <span className={`rounded-full bg-[#d8e4d6] pt-1 pb-1.75 text-[#010000] ${compact ? "px-2" : "px-4"}`} aria-hidden="true">lab</span>
  </span>
);
