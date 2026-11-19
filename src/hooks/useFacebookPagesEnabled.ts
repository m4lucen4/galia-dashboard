import { useAppSelector } from "@/redux/hooks";

// Facebook Pages stay admin-only until Meta grants Advanced Access to pages_manage_posts:
// with Standard access only people with a role in the Meta app can grant it.
export const useFacebookPagesEnabled = (): boolean =>
  useAppSelector((state) => state.auth.user?.role === "admin");
