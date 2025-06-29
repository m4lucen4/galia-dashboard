import { Resend } from "resend";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const { nombre, empresa, telefono, email, mensaje } = req.body;

    if (!nombre || !email || !mensaje) {
      return res
        .status(400)
        .json({ message: "Nombre, email y mensaje son requeridos" });
    }

    // Email de notificación para tu equipo
    const { data, error } = await resend.emails.send({
      from: "Formulario Contacto <noreply@mocklab.app>",
      to: ["hola@mocklab.com"], // Tu email de contacto
      subject: `Nuevo mensaje de contacto de ${nombre}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Nuevo mensaje de contacto</h1>
            <p style="color: #666; font-size: 16px;">Recibido desde el formulario web</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Datos del remitente:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057; width: 120px;">Nombre:</td>
                <td style="padding: 8px 0;">${nombre}</td>
              </tr>
              ${
                empresa
                  ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Empresa:</td>
                <td style="padding: 8px 0;">${empresa}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              ${
                telefono
                  ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Teléfono:</td>
                <td style="padding: 8px 0;">${telefono}</td>
              </tr>
              `
                  : ""
              }
            </table>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #495057;">Mensaje:</h4>
            <p style="line-height: 1.6; color: #333; white-space: pre-wrap;">${mensaje}</p>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #666;">
            <strong>Mocklab - Formulario de Contacto</strong><br>
            Fecha: ${new Date().toLocaleString("es-ES", {
              timeZone: "Europe/Madrid",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      `,
      text: `
        NUEVO MENSAJE DE CONTACTO
        
        DATOS DEL REMITENTE:
        Nombre: ${nombre}
        ${empresa ? `Empresa: ${empresa}` : ""}
        Email: ${email}
        ${telefono ? `Teléfono: ${telefono}` : ""}
        
        MENSAJE:
        ${mensaje}
        
        ---
        Mocklab - Formulario de Contacto
        Fecha: ${new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" })}
      `,
    });

    if (error) {
      console.error("Error sending contact email:", error);
      return res.status(400).json({ error: error.message || error });
    }

    return res.status(200).json({
      success: true,
      message: "Mensaje enviado correctamente",
      id: data?.id,
    });
  } catch (error) {
    console.error("Error in contact form handler:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
