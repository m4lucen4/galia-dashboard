import type { VercelRequest } from "@vercel/node";
import { BillingError, authenticatedUser } from "./billing.js";

// Resolves the caller from its Supabase JWT and requires role "admin" in userData.
export async function requireAdmin(req: VercelRequest) {
  const { db, user } = await authenticatedUser(req);
  const { data: profile, error } = await db.from("userData").select("role").eq("uid", user.id).maybeSingle();
  if (error) throw new Error("Could not verify admin role");
  if (profile?.role !== "admin") throw new BillingError(403, "Forbidden");
  return { db, user };
}
