const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async function handler(req, res) {
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
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return res.status(500).json({ message: "Email service not configured" });
    }

    const { data, error } = await resend.emails.send({
      from: "Mocklab <noreply@portaltraducciones.eulen.com>",
      to: [email],
      subject: "Bienvenido a mocklab, este es tu usuario",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin-bottom: 10px;">¡Bienvenido a Mocklab!</h1>
            <p style="color: #666; font-size: 16px;">Su cuenta ha sido creada exitosamente</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #495057; margin-top: 0;">Hola ${firstName ? `${firstName}${lastName ? ` ${lastName}` : ""}` : "Usuario"}!</h3>
            <p>Nos complace darle la bienvenida a Mocklab. Su cuenta ha sido configurada y ya puede acceder a nuestro sistema.</p>
          </div>
          
          <div style="background-color: #fff; border: 1px solid #dee2e6; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #495057;">Datos de acceso:</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Email:</td>
                <td style="padding: 8px 0;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">Contraseña:</td>
                <td style="padding: 8px 0; font-family: monospace; background: #f8f9fa; padding: 4px 8px; border-radius: 4px;">${password}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #495057;">URL de acceso:</td>
                <td style="padding: 8px 0;">
                  <a href="https://mocklab.app/" 
                     style="color: #007bff; text-decoration: none;">
                    https://mocklab.app/
                  </a>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #856404;">📋 Recomendaciones de seguridad:</h4>
            <ul style="margin: 10px 0; padding-left: 20px; color: #856404;">
              <li>Le recomendamos cambiar su contraseña en el primer acceso</li>
              <li>No comparta sus credenciales con terceros</li>
              <li>Mantenga segura su información de acceso</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://mocklab.app/" 
               style="display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Acceder al Portal
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos. Estamos aquí para ayudarle.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #666;">
            <strong>Mocklab</strong><br>
            Este es un email automático, por favor no responda a este mensaje.
          </p>
        </div>
      `,
      text: `
        ¡Bienvenido a Mocklab!
        
        Hola ${firstName ? `${firstName}${lastName ? ` ${lastName}` : ""}` : "Usuario"}!
        
        Nos complace darle la bienvenida a Mocklab. Su cuenta ha sido configurada y ya puede acceder a nuestro sistema.
        
        DATOS DE ACCESO:
        Email: ${email}
        Contraseña: ${password}
        URL de acceso: https://mocklab.app/
        
        RECOMENDACIONES DE SEGURIDAD:
        - Le recomendamos cambiar su contraseña en el primer acceso
        - No comparta sus credenciales con terceros
        - Mantenga segura su información de acceso
        
        Si tiene alguna pregunta o necesita asistencia, no dude en contactarnos.
        
        Mocklab
        Este es un email automático, por favor no responda a este mensaje.
      `,
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      return res.status(400).json({ error: error.message || error });
    }

    console.log("Email sent successfully:", data);
    return res.status(200).json({ success: true, id: data?.id });
  } catch (error) {
    console.error("Error in welcome email handler:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
