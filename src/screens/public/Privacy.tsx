import { LegalPage } from "@/features/newWeb/components/legal/LegalPage";

export const Privacy = () => {
  return (
    <LegalPage
      document="privacy"
      title="Política de privacidad"
      description="Información sobre el titular de Mocklab, el uso de la plataforma y el tratamiento de datos personales."
    >
      <div>
        <section>
          <h2 id="legal-notice" className="scroll-mt-28">
            1. DATOS IDENTIFICATIVOS
          </h2>
          <p>
            En cumplimiento del deber de información (LSSI-CE), se informa de
            los siguientes datos de la plataforma Mocklab:
          </p>
          <ul>
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
          <h2>
            2. FINALIDAD Y CONDICIONES DE PUBLICACIÓN
          </h2>
          <p>
            Mocklab es una plataforma para estudios de arquitectura y diseño
            que permite gestionar proyectos, archivos multimedia, publicaciones
            en redes sociales y una web de portafolio. La conexión con redes
            sociales es voluntaria y se solicita desde la cuenta del usuario.
            El uso del servicio y las condiciones de publicación de contenidos
            se describen en los{" "}
            <a href="/terms" className="underline underline-offset-4">términos de uso</a>.
          </p>
        </section>

        <section>
          <h2>
            3. GARANTÍAS Y RESPONSABILIDAD EXCLUSIVA DEL USUARIO SOBRE EL
            CONTENIDO MULTIMEDIA
          </h2>
          <p>
            El usuario es el único y exclusivo responsable a nivel legal de todo
            el contenido multimedia (fotografías, vídeos, textos y proyectos)
            que suba a la Plataforma. Al aportar contenido, el usuario declara y
            garantiza jurídicamente que:
          </p>
          <ul>
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
          <h2>
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
          <h2>
            5. POLÍTICA DE PRIVACIDAD (RGPD)
          </h2>
          <ul>
            <li>
              <strong>Finalidad:</strong> Gestionar las cuentas y suscripciones,
              prestar las funciones de gestión y publicación solicitadas por el
              usuario, atender consultas y realizar la gestión administrativa
              derivada del servicio.
            </li>
            <li>
              <strong>Legitimación:</strong> La ejecución del contrato de
              prestación de servicios y las medidas precontractuales solicitadas,
              así como el cumplimiento de las obligaciones legales aplicables.
              La atención de consultas sobre el servicio no autoriza el envío
              de publicidad.
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
          <h2>
            6. POLÍTICA DE COOKIES
          </h2>
          <p>
            Mocklab utiliza almacenamiento técnico para la sesión del usuario
            y para las conexiones con redes sociales que este solicita. No
            incorpora analítica de audiencia ni píxeles publicitarios. Puedes
            consultar los nombres, las finalidades, la duración y las opciones
            de gestión en la{" "}
            <a href="/cookies" className="underline underline-offset-4">política de cookies</a>.
            No se solicita consentimiento para categorías opcionales que no se
            utilizan.
          </p>
        </section>

        <section>
          <h2>
            7. LEY APLICABLE Y JURISDICCIÓN
          </h2>
          <p>
            Las presentes condiciones se rigen por la legislación española. Para
            cualquier disputa, ambas partes se someten a los Juzgados y
            Tribunales de Sevilla.
          </p>
        </section>
      </div>
    </LegalPage>
  );
};
