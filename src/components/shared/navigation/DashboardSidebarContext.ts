import { createContext, type Dispatch, type SetStateAction } from "react";

type DashboardSidebarState = [boolean, Dispatch<SetStateAction<boolean>>];

export const DashboardSidebarContext = createContext<DashboardSidebarState | null>(null);
