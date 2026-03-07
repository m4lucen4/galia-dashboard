import { useNavigate } from "react-router-dom";
import { Button } from "../../components/shared/ui/Button";

export const Privacy = () => {
  const navigate = useNavigate();
  return (
    <div className="container mx-auto p-4">
      <h3 className="text-base/7 font-semibold text-gray-900 mb-4">
        AVISO LEGAL, POLÍTICA DE COOKIES Y CONDICIONES DE PUBLICACIÓN DE
        WWW.MOCKLAB.APP
      </h3>
      <Button title="Volver" onClick={() => navigate("/")} />
      <div className="space-y-6 mt-8 text-gray-700">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            1. DATOS IDENTIFICATIVOS
          </h2>
          <p>
            En cumplimiento del deber de información (LSSI-CE), se informa de
            los siguientes datos de la plataforma Mocklab:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              <strong>Titular:</strong> Nacho Villegas SL (NIF: B90271891).
            </li>
            <li>
              <strong>Domicilio Social:</strong> Calle Arroyo 52 local 2, 41008
              Sevilla (España).
            </li>
            <li>
              <strong>Contacto:</strong> hola@nachovillegas.com.
            </li>
            <li>
              <strong>Dominio:</strong> www.mocklab.app.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            2. FINALIDAD Y CONDICIONES DE PUBLICACIÓN
          </h2>
          <p>
            El acceso a la plataforma www.mocklab.app está reservado a autores y
            colaboradores de la Guía de Arquitectura para la gestión, edición y
            aportación de contenidos destinados a publicarse en
            www.guiadearquitectura.com y en sus redes sociales asociadas. El
            acceso mediante pasarelas de login social (ej. LinkedIn o Instagram)
            es voluntario e implica el uso de datos básicos de perfil. Al
            aceptar las Condiciones de Publicación (mediante el tick
            correspondiente), el autor otorga a Nacho Villegas SL una cesión de
            derechos no exclusiva para la difusión de dichos textos y reportajes
            fotográficos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            3. GARANTÍAS Y RESPONSABILIDAD EXCLUSIVA DEL USUARIO SOBRE EL
            CONTENIDO MULTIMEDIA
          </h2>
          <p>
            El usuario es el único y exclusivo responsable a nivel legal de todo
            el contenido multimedia (fotografías, vídeos, textos y proyectos)
            que suba a la Plataforma. Al aportar contenido, el usuario declara y
            garantiza jurídicamente que:
          </p>
          <ul className="list-disc ml-6 mt-2">
            <li>
              Es el titular original de los derechos o posee las autorizaciones
              expresas y por escrito de los creadores/fotógrafos para licenciar
              el uso de dichas obras.
            </li>
            <li>
              El contenido subido no infringe derechos de autor, propiedad
              intelectual, marcas ni secretos comerciales de terceros.
            </li>
            <li>
              Posee los consentimientos expresos (derechos de imagen) de
              cualquier persona reconocible que aparezca en el material gráfico,
              respetando la normativa de derecho al honor y a la intimidad.
            </li>
            <li>
              En caso de utilizar contenido generado mediante Inteligencia
              Artificial, este ha sido debidamente etiquetado y no vulnera
              derechos de terceros.
            </li>
          </ul>
          <p className="mt-4">
            <strong>Exoneración:</strong> El usuario asume toda la
            responsabilidad frente a reclamaciones, exonerando y manteniendo
            indemne de forma total a Nacho Villegas SL frente a cualquier queja,
            demanda, infracción o sanción derivada de la publicación del
            contenido aportado a la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            4. PROPIEDAD INTELECTUAL Y EXENCIÓN DE RESPONSABILIDAD TÉCNICA
          </h2>
          <p>
            Nacho Villegas SL es titular exclusivo del software y diseño de la
            plataforma Mocklab. Nacho Villegas SL no asume responsabilidad por
            la pérdida de datos, fallos técnicos o caídas de servidor, debiendo
            el usuario mantener sus propias copias de seguridad del material que
            sube.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            5. POLÍTICA DE PRIVACIDAD (RGPD)
          </h2>
          <ul className="list-disc ml-6 mt-2">
            <li>
              <strong>Finalidad:</strong> Tratamos los datos de los usuarios
              colaboradores para gestionar su cuenta, permitir la edición y
              publicar su contenido en los dominios de la empresa, así como para
              la gestión administrativa derivada.
            </li>
            <li>
              <strong>Legitimación:</strong> La ejecución del contrato de
              prestación de servicios de la plataforma Mocklab.app.
            </li>
            <li>
              <strong>Destinatarios e Infraestructura:</strong> Se utilizan
              proveedores de infraestructura esenciales como Vercel (hosting y
              frontend) y Supabase (backend y bases de datos), los cuales
              procesan datos de los autores para el funcionamiento técnico.
            </li>
            <li>
              <strong>Derechos:</strong> Los usuarios pueden ejercer sus
              derechos de acceso, rectificación, supresión, oposición,
              limitación y portabilidad enviando un email a
              hola@nachovillegas.com, o reclamar ante la AEPD.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            6. POLÍTICA DE COOKIES
          </h2>
          <p>
            Mocklab.app utiliza cookies técnicas y funcionales que son
            estrictamente necesarias para el funcionamiento de la plataforma
            (como las de Supabase para mantener la sesión segura del usuario),
            las cuales no requieren consentimiento previo. También se utilizan
            cookies estadísticas (como Google Analytics) para analizar el uso
            interno, las cuales requieren consentimiento. El usuario puede
            gestionarlas desde su navegador, advirtiendo que la plataforma no
            funcionará correctamente si se desactivan las cookies funcionales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            7. LEY APLICABLE Y JURISDICCIÓN
          </h2>
          <p>
            Las presentes condiciones se rigen por la legislación española. Para
            cualquier disputa, ambas partes se someten a los Juzgados y
            Tribunales de Sevilla.
          </p>
        </section>
      </div>
    </div>
  );
};
