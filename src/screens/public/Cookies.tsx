import { LegalPage } from "@/features/newWeb/components/legal/LegalPage";

export const Cookies = () => (
  <LegalPage
    document="cookies"
    title="Política de cookies"
    description="Información sobre las cookies y el almacenamiento del navegador utilizados por Mocklab."
  >
    <div>
      <section>
        <h2>1. Qué son las cookies</h2>
        <p>
          Las cookies son pequeños archivos que un sitio guarda en tu navegador.
          Tecnologías como localStorage también permiten guardar información en
          el dispositivo. Esta política explica el uso de ambas en Mocklab.
        </p>
      </section>
      <section>
        <h2>2. Uso actual: solo almacenamiento técnico</h2>
        <p>
          Mocklab no incorpora herramientas de analítica de audiencia, píxeles
          publicitarios ni almacenamiento para seguimiento comercial. No mostramos
          un banner de aceptación porque el almacenamiento descrito a continuación
          se utiliza para prestar las funciones que solicitas, como iniciar sesión
          o conectar una red social, y no para finalidades opcionales.
        </p>
        <h3>Sesión de usuario</h3>
        <ul>
          <li><strong>Nombre:</strong> sb-&#123;referencia-del-proyecto&#125;-auth-token.</li>
          <li><strong>Tecnología:</strong> cookie de sesión gestionada por la aplicación mediante Supabase.</li>
          <li><strong>Finalidad:</strong> mantener la autenticación y permitir el acceso a tu cuenta.</li>
          <li><strong>Duración:</strong> 30 días desde la última escritura; puede renovarse mientras utilizas la cuenta. Se elimina al cerrar sesión.</li>
          <li><strong>Cuándo se utiliza:</strong> al iniciar sesión, no por el mero hecho de visitar la web informativa.</li>
        </ul>
        <h3>Conexión con LinkedIn e Instagram</h3>
        <ul>
          <li><strong>Nombres:</strong> linkedln_auth_state e instagram_auth_state.</li>
          <li><strong>Tecnología:</strong> localStorage.</li>
          <li><strong>Finalidad:</strong> comprobar la correspondencia entre la solicitud y la respuesta al conectar una red social desde tu cuenta.</li>
          <li><strong>Duración:</strong> se elimina al procesar la respuesta de conexión. Si abandonas el proceso, puede permanecer hasta que lo sustituyas al iniciar otra conexión o lo elimines desde el navegador.</li>
          <li><strong>Cuándo se utiliza:</strong> únicamente al solicitar la conexión de la red social correspondiente.</li>
        </ul>
        <p className="mt-4">
          El idioma se detecta sin guardar automáticamente una preferencia en
          cookies o localStorage. Las fuentes tipográficas se sirven desde el
          propio sitio, sin solicitarlas a Google Fonts.
        </p>
      </section>
      <section>
        <h2>3. Cómo gestionar este almacenamiento</h2>
        <p>
          Puedes consultar, bloquear y eliminar cookies y datos de sitios desde
          la configuración de privacidad de tu navegador. Eliminar los datos de
          autenticación puede cerrar tu sesión; bloquear el almacenamiento técnico
          puede impedir el inicio de sesión o la conexión con redes sociales.
          Puedes seguir consultando la web informativa sin aceptar cookies opcionales.
        </p>
      </section>
      <section>
        <h2>4. Servicios externos</h2>
        <p>
          Si accedes a Stripe para gestionar pagos o a una red social para
          autorizar su conexión, entrarás en un servicio externo con su propia
          información sobre privacidad y cookies. Esas autorizaciones son
          independientes del uso de la web informativa de Mocklab.
        </p>
      </section>
      <section>
        <h2>5. Cambios en el uso de cookies</h2>
        <p>
          Si incorporamos analítica, campañas o píxeles publicitarios que requieran
          consentimiento, actualizaremos esta política y habilitaremos previamente
          su gestión. Esas tecnologías no se activarán sin la autorización que
          corresponda, y se podrá rechazar su uso o retirar el consentimiento.
        </p>
      </section>
      <section>
        <h2>6. Responsable y contacto</h2>
        <p>
          El responsable es Nacho Villegas SL (NIF B90271891). Puedes consultar
          sus datos y la información sobre el tratamiento de datos personales en
          la <a href="/privacy" className="underline underline-offset-4">política de privacidad</a>
          {" "}o contactar en <a href="mailto:hola@nachovillegas.com" className="underline underline-offset-4">hola@nachovillegas.com</a>.
        </p>
      </section>
    </div>
  </LegalPage>
);
