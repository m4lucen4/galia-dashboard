# Privacidad mínima de la web pública

La web de Mocklab no incorpora analítica de audiencia, campañas ni píxeles publicitarios. No se muestra un banner de consentimiento ni un panel de preferencias vacío: solo se utiliza almacenamiento técnico para funciones solicitadas por el usuario.

## Implementación

- `/cookies`: política pública con el inventario de cookies y almacenamiento técnico.
- `/privacy`: conserva los datos identificativos del titular y enlaza la política de cookies. El aviso legal está en `/privacy#legal-notice`.
- El pie de la nueva web y de las páginas legales enlaza privacidad, cookies y términos de uso.
- Las fuentes Hanken Grotesk, Geist Mono y Roboto Mono se sirven desde `public/fonts/`, con sus licencias SIL Open Font License. No hay solicitudes a Google Fonts.
- La detección de idioma no lee ni escribe cookies, localStorage o sessionStorage. Se mantienen la detección del navegador, el parámetro de idioma y los cambios de idioma de la cuenta en memoria. La preferencia del perfil sigue guardándose en el servidor.
- No se modifica la autenticación, el almacenamiento de sesión, los pagos ni la conexión con redes sociales. Tampoco se eliminan datos que ya estuvieran guardados en el navegador.

## Inventario técnico

| Nombre | Soporte | Finalidad | Duración |
|---|---|---|---|
| `sb-{referencia-del-proyecto}-auth-token` | Cookie escrita por la aplicación mediante Supabase | Sesión autenticada | 30 días desde cada escritura; se renueva y se elimina al cerrar sesión |
| `linkedln_auth_state` | localStorage | Comprobación del flujo OAuth de LinkedIn solicitado por el usuario | Hasta procesar la respuesta; si se abandona, puede persistir hasta su sustitución o eliminación |
| `instagram_auth_state` | localStorage | Comprobación del flujo OAuth de Instagram solicitado por el usuario | Hasta procesar la respuesta; si se abandona, puede persistir hasta su sustitución o eliminación |

El nombre `linkedln_auth_state` reproduce la clave existente en el código; no se renombra en este cambio.

## Antes de añadir campañas, analítica o contenido externo

1. Inventariar proveedores, solicitudes de red, cookies y cualquier acceso al almacenamiento del dispositivo; no basta con buscar cookies.
2. Determinar las finalidades, las bases jurídicas, los plazos y las transferencias internacionales.
3. Cuando sea necesario el consentimiento, implementar el bloqueo previo real, con rechazo y aceptación igual de accesibles y categorías opcionales desactivadas.
4. Permitir retirar la autorización fácilmente desde un enlace permanente; documentar la elección sin recopilar datos innecesarios.
5. Actualizar los textos legales y verificar en navegador la visita inicial, el rechazo, la aceptación y la retirada antes de activar las herramientas.
6. Valorar una plataforma de gestión de consentimiento si aparecen varios píxeles, campañas o dominios.

No insertar píxeles directamente en `index.html`, un gestor de etiquetas o un componente antes de completar estos pasos. No existe actualmente un motor de consentimiento preparado para bloquearlos.

## Comprobación de publicación

- Ejecutar `pnpm build` y `pnpm lint`.
- Abrir `/`, `/privacy`, `/terms` y `/cookies`; comprobar los enlaces, la navegación con teclado y las fuentes en escritorio y móvil.
- En un perfil limpio, comprobar en Network que las fuentes se descargan desde el propio origen y que no se carga analítica ni publicidad.
- Comprobar el almacenamiento: la visita informativa no debe crear preferencias automáticas de idioma; la sesión y OAuth solo deben usarse en sus respectivos flujos.
- Auditar también la configuración desplegada de Vercel y los servicios externos: una comprobación local no demuestra lo que se inyecta en producción.

## Alcance legal

Esta implementación reduce el tratamiento innecesario; no certifica el cumplimiento íntegro del RGPD. La titularidad, los plazos de conservación de datos personales, los contratos con proveedores, las transferencias, la información del formulario y la atención de derechos requieren validación del responsable y su asesoría. No se han verificado esos acuerdos ni se han reescrito las condiciones de contratación.

Referencias: [AEPD: guía de cookies](https://www.aepd.es/guias/guia-cookies.pdf) y [CEPD: Cookie Banner Taskforce](https://www.edpb.europa.eu/documents/task-force-report/report-of-the-work-undertaken-by-the-cookie-banner-taskforce_en).
