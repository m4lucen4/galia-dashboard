import type React from "react";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "../../../components/icons";
import type { PublicationNetwork } from "../../../types";

/** One icon per publication network (explicit mapping: never a binary fallback). */
export const NETWORK_ICONS: Record<
  PublicationNetwork,
  React.FC<{ className?: string }>
> = {
  instagram: InstagramIcon,
  linkedin: LinkedInIcon,
  facebook: FacebookIcon,
};
