# Registro tras pago (register-after-payment)

Create Galia user accounts only after a successful Stripe payment, keeping the password chosen in the registration form.
Branch: feat/register-after-payment (stacked on fix/user-data-billing-guard). Every phase is proposed to the user before it is applied or deployed.

## Specs

- S1: "en la generación de un usuario debería poner un check o algo que valide que lo hace una persona y no un bot"
- S2: "He pensado que el usuario solo se vaya a crear si este completa el pago con Stripe"
- S3: "Prefiero que el cliente cree su contraseña en el mismo formulario tal y como está ahora mismo"
- S4: "quiero seguir usando resend"
- S5: "puedo probar en el entorno real ya que puedo entrar en stripe y devolverme los importes"
- S6: "n8n y Odoo se quedan ahora mismo tal y como están"
- S7: "desde el administrador se debe poder crear usuarios manualmente tal y como hasta ahora y dejarlos activos si así el administrador lo cree oportuno"
- S8: "Si, paso a paso. No hace falta correr. Consulta y me propones antes de actuar"
- S9 (agreed design, L3): the password is hashed with bcrypt on the server and kept in a server-only `pending_registrations` table until payment; Stripe only receives the pending registration id; the webhook creates the auth user with `password_hash`, creates `userData`, links the uid to the Stripe subscription, sends the existing Resend welcome email and the existing n8n call, without duplicates on Stripe retries; public sign-ups are disabled in Supabase Auth at the end.

## Tasks

- [x] T1 (4.1) S2 S9 — DB: `pending_registrations` + `stripe_webhook_events` tables, server-only — route: inline migration — commit: 64748d7
- [x] T2 (4.2) S2 S4 S6 S9 — stripe-webhook creates the user from a pending registration; event dedupe; legacy uid flow unchanged — route: inline — commit: 88b89b0
- [ ] T3 (4.3) S2 S3 S9 — create-checkout-session hashes the password and stores the pending registration; RegisterActions stops calling signUp/insert; form unchanged — route: inline — commit: -
- [ ] T4 (4.4) S7 — admin user creation through a server endpoint with the same form, fields and active option — route: inline — commit: -
- [ ] T5 (4.5) S1 S2 — user disables "Allow new users to sign up"; verify direct signUp fails — route: user action + check — commit: -
- [ ] T6 (4.6) S5 — end-to-end test in production with refunds: paid registration, abandoned payment, duplicate email, Stripe resend, admin creation active/inactive — route: user + checks — commit: -

## Log

- L1 (user, original request): "quiero que analices la feature register ya que me he dado cuenta que en la generación de un usuario debería poner un check o algo que valide que lo hace una persona y no un bot, tú que opinas? valora antes de aplicar la corrección"
- L2 (user): "He pensado que el usuario solo se vaya a crear si este completa el pago con Stripe, creo que puedes ver todo lo relacionado el tema del pago con la edge function que hay en supabase en el proyecto galia, puedes verificar esto?"
- L3 (user): "Prefiero que el cliente cree su contraseña en el mismo formulario tal y como está ahora mismo, quiero seguir usando resend, puedo probar en el entorno real ya que puedo entrar en stripe y devolverme los importes, n8n y Odoo se quedan ahora mismo tal y como están y desde el administrador se debe poder crear usuarios manualmente tal y como hasta ahora y dejarlos activos si así el administrador lo cree oportuno"
- L4 (user): "Si, procede" — plan 4.1–4.6 with bcrypt `pending_registrations` approved.
- L5 (context): prerequisite security steps already done on fix/user-data-billing-guard: 1dd1a62 (guard billing columns), ce50e52 (drop anon read), 510b583 (admin-only cross-user reads), 663acd0 (stripe-webhook v42: signature tolerance, legacy 500 on write errors, payment_failed subscription id). Failed renewals keep deactivating on first failure (user: "Prefiero opción A").
- L6 (user): "Si, aplica" — T1 applied to prod as migration 20261114222850_registration_pending_tables. Verified in a rolled-back transaction: anon/authenticated (admin included) denied on both tables and the cleanup function; service_role inserts; duplicate event id and invalid billing_period rejected; cleanup keeps live, drops expired unpaid, scrubs consumed, drops events older than 90 days; cron job cleanup-registration-data scheduled 17 3 * * *; tables empty afterwards.
- L7 (user): "SI, APLICA LA FASE 4.2 y para el punto 2 mejor dejarlos y ya los analizo yo manualmente" — the 10 inactive never-paid users are left untouched for manual review. T2 adds pending-row expiry extension to 7 days on payment (verifier caveat from T1).
- L8 (evidence): T2 deployed as stripe-webhook v43 (identical to commit) + migration 20261114223505_registration_auth_user_lookup (service_role only: admin/anon denied, service resolves case-insensitively, unknown -> null). Local harness 17/17 on v43 (v42 fails 13): pending flow creates one auth user with password_hash + email_confirm, customer userData row, Stripe metadata uid, activation via projection, consume + scrub, expiry extended, email/n8n once; redelivery, crash-after-createUser and projection-busy retries create no second user or email; missing pending -> 200 logged CRITICAL; legacy uid flows unchanged except no duplicate email/n8n. Prod probes: no-sig/stale/bad-sig -> 400.
- L9 (delivery): review slices — slice 1 = branch fix/user-data-billing-guard (1dd1a62..663acd0, security prerequisites); slice 2 = feat/register-after-payment T1-T2 (64748d7..88b89b0); T3 onwards starts a new slice. Push/PR remain the user's decision.
- L10 (user): "Si, procede" — apply native-review advisory fixes. Native review lineage review-9146ab3601b3aa42 approved (risk/resilience/reliability) and acknowledged; advisory findings fixed: (R1/R3-002) webhook never links a paid pending registration to a pre-existing auth user (only one created after the pending row; otherwise CRITICAL log, no link); (R3-001/R4) cleanup now scrubs consumed rows by personal data, not by password_hash; (R3-003/R4) guard migration creates schema private first; (R3-004) slice boundary placeholder replaced. Deployed stripe-webhook v44 (identical) + migration 20261114224425_registration_review_fixes; prod: lookup admin/anon denied, service returns id+created_at, cleanup scrubs consumed rows with blank hash; probes 400s. Local harness 18/18 (v43 fails 2).
