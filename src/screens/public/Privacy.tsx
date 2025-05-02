import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/ui/Button";

export const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900">
        Privacy Policy
      </h3>
      <Button title="Go back" onClick={() => navigate("/")} />
      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            1. Información que recopilamos
          </h2>
          <p>
            Recopilamos información personal cuando te registras en nuestra
            plataforma, inicias sesión, utilizas nuestras funciones o servicios.
            Esta información puede incluir:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Información de contacto (nombre, correo electrónico, teléfono)
            </li>
            <li>Datos de perfil y preferencias</li>
            <li>Información de uso y actividad en la plataforma</li>
            <li>Información técnica como dirección IP y tipo de navegador</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2. Uso de la información
          </h2>
          <p>Utilizamos la información recopilada para:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Proporcionar, mantener y mejorar nuestros servicios</li>
            <li>Procesar transacciones y gestionar tu cuenta</li>
            <li>Enviar notificaciones importantes y actualizaciones</li>
            <li>Personalizar tu experiencia</li>
            <li>
              Analizar el uso de la plataforma y mejorar nuestros servicios
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            3. Compartición de información
          </h2>
          <p>
            No vendemos ni alquilamos tu información personal a terceros.
            Podemos compartir información en las siguientes circunstancias:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Con proveedores de servicios que nos ayudan a operar nuestra
              plataforma
            </li>
            <li>Para cumplir con obligaciones legales</li>
            <li>
              Para proteger nuestros derechos, privacidad, seguridad o propiedad
            </li>
            <li>En relación con una fusión, venta o adquisición empresarial</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            4. Seguridad de datos
          </h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas para
            proteger tu información personal. Sin embargo, ningún método de
            transmisión por Internet o de almacenamiento electrónico es 100%
            seguro.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            5. Cookies
          </h2>
          <p>
            Utilizamos cookies y tecnologías similares para mejorar la
            experiencia del usuario, analizar tendencias y administrar la
            plataforma. Puedes configurar tu navegador para rechazar todas las
            cookies o indicar cuándo se envía una cookie.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            6. Derechos del usuario
          </h2>
          <p>Dependiendo de tu ubicación, puedes tener derecho a:</p>
          <ul className="list-disc ml-6 mt-2">
            <li>Acceder a tus datos personales</li>
            <li>Corregir datos inexactos</li>
            <li>Eliminar tus datos personales</li>
            <li>Oponerte al procesamiento de tus datos</li>
            <li>Solicitar la portabilidad de tus datos</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            7. Cambios a esta política
          </h2>
          <p>
            Podemos actualizar esta política de privacidad periódicamente. Te
            notificaremos cualquier cambio significativo mediante un aviso
            visible en nuestra plataforma o por correo electrónico.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            8. Contacto
          </h2>
          <p>
            Si tienes preguntas o inquietudes sobre esta política de privacidad
            o el manejo de tus datos, contáctanos en:{" "}
            <a
              href="mailto:hola@mocklab.app"
              className="text-blue-600 hover:underline"
            >
              hola@mocklab.app
            </a>
          </p>
        </section>

        <p className="text-sm text-gray-500 mt-8">
          Última actualización: 2 de mayo de 2025
        </p>
      </div>
    </div>
  );
};
