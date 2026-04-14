import { default as Stripe } from "stripe";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe: any = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

const PRICE_IDS: Record<string, Record<string, string>> = {
  student: {
    monthly: process.env.STRIPE_STUDENT_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_STUDENT_ANNUAL_PRICE_ID!,
  },
  professional: {
    monthly: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID!,
    annual: process.env.STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID!,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      uid,
      email,
      first_name,
      last_name,
      phone,
      plan_type,
      billing_period,
    } = req.body;

    if (!uid || !email || !plan_type || !billing_period) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const priceId = PRICE_IDS[plan_type]?.[billing_period];
    if (!priceId) {
      return res.status(400).json({ error: "Invalid plan type or billing period" });
    }

    const baseUrl = process.env.APP_BASE_URL || "https://mocklab.app";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        uid,
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        phone: phone || "",
        plan_type,
        billing_period,
      },
      success_url: `${baseUrl}/login?registration=success`,
      cancel_url: `${baseUrl}/register?payment=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
