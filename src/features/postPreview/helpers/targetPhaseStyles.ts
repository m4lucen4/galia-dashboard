import type { TargetPhase } from "./publicationTargets";

/** Chip colours per phase (text + background + border), and the dot used in the calendar. */
export const PHASE_STYLES: Record<
  TargetPhase,
  { chip: string; dot: string }
> = {
  scheduled: { chip: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-600" },
  publishing: { chip: "bg-blue-50 text-blue-800 border-blue-200", dot: "bg-blue-600" },
  published: { chip: "bg-green-50 text-green-800 border-green-200", dot: "bg-green-600" },
  retrying: { chip: "bg-amber-50 text-amber-900 border-amber-300", dot: "bg-amber-500" },
  needsAction: { chip: "bg-orange-50 text-orange-900 border-orange-300", dot: "bg-orange-500" },
  failed: { chip: "bg-red-50 text-red-800 border-red-200", dot: "bg-red-600" },
};
