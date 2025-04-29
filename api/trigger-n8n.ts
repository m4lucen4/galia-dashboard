// import type { VercelRequest, VercelResponse } from "@vercel/node";

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { id } = req.query;

//   if (!id || typeof id !== "string") {
//     return res.status(400).json({ message: "Missing project ID" });
//   }

//   const n8nWebhookUrl = `${process.env.VITE_N8N_POST_SUPABASE_URL}?id=${id}`;

//   try {
//     const webhookResponse = await fetch(n8nWebhookUrl, {
//       method: "GET",
//       headers: {
//         Accept: "application/json",
//       },
//     });

//     const data = await webhookResponse.json();
//     return res.status(200).json(data);
//   } catch (error) {
//     return res
//       .status(500)
//       .json({ message: "Error calling n8n webhook", error });
//   }
// }

import type { VercelResponse } from "@vercel/node";

export default async function handler(res: VercelResponse) {
  res.status(200).json({ message: "Function is working" });
}
