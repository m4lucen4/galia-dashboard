import type { VercelRequest, VercelResponse } from "@vercel/node";
import { BillingError } from "./_lib/billing.js";
import { requireAdmin } from "./_lib/admin.js";
import { PASSWORD_POLICY_MESSAGE, isStrongPassword } from "./_lib/passwordPolicy.js";

// Register-after-payment, T4 (odd/tasks/registro-tras-pago.md): admins create users
// server-side with service_role, so public sign-ups can be disabled in Supabase Auth.
// The admin form, its fields and the "active" choice stay exactly as before.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_FIELDS = [
  "active", "avatar_url", "first_name", "last_name", "phone", "company", "vat", "description",
  "role", "address", "postal_code", "city", "province", "province_id", "country", "job_position",
  "web", "tags", "odoo_id", "folder_nas", "has_web",
] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { db } = await requireAdmin(req);
    const body = req.body ?? {};
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: PASSWORD_POLICY_MESSAGE });
    }

    const { data: created, error: createError } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError || !created?.user) {
      const status = createError?.status === 422 ? 409 : 400;
      return res.status(status).json({ error: createError?.message ?? "Could not create user in the authentication system" });
    }
    const uid = created.user.id;

    const profile: Record<string, unknown> = { uid, email };
    for (const field of PROFILE_FIELDS) if (body[field] !== undefined) profile[field] = body[field];
    profile.has_web = body.has_web ?? false;

    const { data: userRecord, error: insertError } = await db.from("userData").insert(profile).select("*").single();
    if (insertError || !userRecord) {
      // Do not leave an auth account without its profile.
      const { error: rollbackError } = await db.auth.admin.deleteUser(uid);
      if (rollbackError) console.error(`Could not roll back auth user ${uid}:`, rollbackError);
      return res.status(400).json({ error: `Error creating user in database: ${insertError?.message ?? "unknown"}` });
    }

    return res.status(200).json({ user: userRecord });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(error instanceof BillingError ? error.status : 500)
      .json({ error: error instanceof BillingError ? error.message : "Internal server error" });
  }
}
