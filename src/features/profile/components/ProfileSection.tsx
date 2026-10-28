import { useId, type ReactNode } from "react";

export const ProfileSection = ({ title, children }: { title: string; children: ReactNode }) => {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="min-w-0 rounded-[28px] border border-[#010000]/20 p-5 sm:p-7 [&_label]:mb-2 [&_label]:block [&_label]:text-sm [&_label]:font-medium [&_label_span]:text-[#010000]">
      <h2 id={titleId} className="mb-6 text-xl font-medium tracking-[-0.03em] sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
};
