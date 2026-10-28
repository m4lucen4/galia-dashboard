# Galia Dashboard

Plataforma SaaS de gestión de proyectos y publicación en redes sociales orientada a profesionales creativos. Permite crear proyectos, publicarlos en LinkedIn e Instagram, construir una web de portafolio y gestionar suscripciones con Stripe.

## Stack tecnológico

| Categoría | Tecnología |
|---|---|
| Framework | React 19 + TypeScript 5 |
| Bundler | Vite 7 |
| Estilos | Tailwind CSS 4 |
| Estado | Redux Toolkit 2 |
| Routing | React Router DOM 7 |
| Backend / Auth | Supabase (PostgreSQL + Edge Functions) |
| Pagos | Stripe (Checkout + Customer Portal) |
| API serverless | Vercel Functions |
| Email | Resend |
| Mapas | React Leaflet |
| i18n | i18next (ES, EN, CAT) |
| Tablas | TanStack React Table |
| Drag & Drop | dnd-kit |
| Iconos | Heroicons + Lucide React |

## Características principales

- **Gestión de proyectos** — CRUD completo con imágenes, colaboradores, estado (borrador, revisión, publicado) y geolocalización
- **Publicación en redes sociales** — Conexión OAuth con LinkedIn e Instagram para publicar directamente desde la plataforma
- **Preview de publicaciones** — Vista previa del contenido antes de publicar, con flujos automatizados vía N8N
- **Constructor de webs** — Editor de sitio propio (páginas, componentes, header, grid de proyectos) por usuario
- **Multimedia** — Explorador de archivos conectado a NAS (Synology) con compresión de imagen en cliente
- **Suscripciones** — Planes Estudiante y Profesional, periodos mensual y anual, portal de cliente Stripe
- **Panel de administración** — Gestión de usuarios, acceso a archivo y módulo de GPTs
- **Autenticación** — Email/contraseña con sesión persistente en cookies, recuperación de contraseña, guards por rol
- **Tiempo real** — Sincronización en vivo de proyectos y previews vía Supabase Realtime
- **Multiidioma** — Español, inglés y catalán con detección automática del navegador

## Estructura del proyecto

```
galia-dashboard/
├── api/                        # Vercel serverless functions (Stripe)
│   ├── create-checkout-session.ts
│   ├── billing-portal.ts
│   ├── cancel-subscription.ts
│   ├── reactivate-subscription.ts
│   ├── create-user-template.ts
│   └── contact-form.ts
├── src/
│   ├── assets/                 # Imágenes y logos estáticos
│   ├── components/
│   │   ├── icons/              # Iconos SVG personalizados
│   │   ├── shared/ui/          # Componentes reutilizables (Button, Card, Table…)
│   │   └── previewProjects/    # Componentes de preview de publicaciones
│   ├── features/               # Módulos por funcionalidad
│   │   ├── login/              # Pantalla de login y recuperación de contraseña
│   │   ├── register/           # Registro con selector de plan y pago Stripe
│   │   ├── profile/            # Perfil de usuario
│   │   ├── settings/           # Integraciones sociales y gestión de suscripción
│   │   ├── projects/           # Módulo principal de proyectos
│   │   ├── postPreview/        # Preview y publicación en redes sociales
│   │   ├── multimedia/         # Gestión de archivos y carpetas (NAS)
│   │   ├── myWeb/              # Constructor de sitio web
│   │   ├── archive/            # Archivo de proyectos (rol admin)
│   │   ├── adminPanel/         # Panel de administración y GPTs
│   │   ├── documentation/      # Wiki y documentación de ayuda
│   │   ├── users/              # Gestión de usuarios (admin)
│   │   └── web/                # Landing page pública
│   ├── redux/
│   │   ├── store.ts            # Configuración del store
│   │   ├── slices/             # Estado por dominio (auth, project, site…)
│   │   └── actions/            # Async thunks para todas las llamadas a API
│   ├── routes/                 # Guards de rutas (Protected, Admin, HasWeb…)
│   ├── hooks/                  # Custom hooks (proyectos, previews, realtime)
│   ├── helpers/                # Cliente Supabase, optimizador de imágenes
│   ├── locales/                # Traducciones JSON (es, en, cat)
│   ├── types/                  # Definiciones TypeScript centralizadas
│   ├── n8n/                    # Definiciones de flujos de automatización N8N
│   ├── screens/                # Pantallas globales (Home, RecoveryPassword)
│   ├── App.tsx                 # Componente raíz con routing completo
│   ├── main.tsx                # Punto de entrada
│   └── i18n.ts                 # Configuración i18next
├── supabase/                   # Migraciones y Edge Functions
├── index.html
├── vite.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Rutas de la aplicación

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Landing page |
| `/login` | No autenticado | Inicio de sesión |
| `/register` | No autenticado | Registro + selección de plan |
| `/privacy` | Público | Política de privacidad |
| `/wiki` | Público | Documentación |
| `/articulos` | Público | Artículos de la nueva web |
| `/home` | Autenticado | Dashboard principal |
| `/profile` | Autenticado | Perfil de usuario |
| `/settings` | Autenticado | Integraciones y suscripción |
| `/projects` | Autenticado | Gestión de proyectos |
| `/preview-projects` | Autenticado | Preview y publicación social |
| `/multimedia` | Autenticado | Explorador de archivos |
| `/my-web` | Autenticado + `has_web` | Constructor de sitio web |
| `/archivo` | Admin | Archivo de proyectos |
| `/my-gpts` | Admin | Panel de GPTs |
| `/auth/linkedin/callback` | Sistema | Callback OAuth LinkedIn |
| `/auth/instagram/callback` | Sistema | Callback OAuth Instagram |

## Secciones de artículos en la wiki

En `/wiki/admin`, al crear o editar una sección, activa **Sección de artículos** para excluir la sección completa, sus subsecciones y artículos de la wiki pública, su buscador y sus enlaces directos. Todo el contenido sigue visible y editable en el gestor; no se modifica su publicación, historial ni imágenes.

- La clasificación se guarda en `wiki_sections.is_article_section`. Las secciones existentes conservan `false` y su comportamiento anterior.
- Al desmarcarla, su contenido publicado vuelve a estar disponible en la wiki. Los artículos movidos heredan la clasificación de su sección de destino.
- Es una separación visual, no una opción de privacidad.
- `/articulos` y `/articulos/:sectionId/:sectionSlug?` muestran únicamente contenido publicado de secciones marcadas, con índice, búsqueda y enlaces a artículos. Reutilizan el gestor y las imágenes de la wiki, pero tienen estado y consultas propios para no mezclar ambas vistas.
- La página Artículos utiliza la cabecera, pie, tipografías y componentes de la nueva web. Durante la descarga de la página y de los artículos mantiene ese diseño con espacios de carga reservados, sin añadir el pie antiguo ni mostrar el estado vacío antes de terminar. Sus enlaces del navbar vuelven a las anclas de la home: por ejemplo, **Precios** lleva a `/#precios`. En la home se conservan los enlaces locales `#precios`, etc. Al cargar la portada con un ancla, el desplazamiento se aplica después de montar su contenido y respeta la preferencia de movimiento reducido.
- Antes de habilitar `/articulos`, aplica también [`20261028160000_articles_public_reader.sql`](supabase/migrations/20261028160000_articles_public_reader.sql), después de la migración de clasificación. Añade las tres funciones `articles_public_*`, sin modificar las consultas de la wiki normal ni las políticas de acceso.
- **Antes de desplegar el frontend**, aplica [`20261028152541_wiki_article_sections.sql`](supabase/migrations/20261028152541_wiki_article_sections.sql) en el proyecto Supabase correspondiente. Requiere el esquema wiki existente y actualiza las tres funciones `wiki_public_*`; no cambia RLS ni Storage.

## Variables de entorno

Crea un archivo `.env` en la raíz con las siguientes variables:

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Stripe (cliente)
VITE_STRIPE_PUBLIC_KEY=

# Stripe (servidor — Vercel Functions)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STUDENT_MONTHLY_PRICE_ID=
STRIPE_STUDENT_ANNUAL_PRICE_ID=
STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID=
STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID=
# Nuevo catálogo: no sobrescribir los identificadores anteriores
STRIPE_PROFESSIONAL_V1_MONTHLY_PRICE_ID=
STRIPE_PROFESSIONAL_V1_ANNUAL_PRICE_ID=
STRIPE_MYWEB_MONTHLY_PRICE_ID=
STRIPE_MYWEB_ANNUAL_PRICE_ID=
STRIPE_VAT_21_TAX_RATE_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=

# NAS / Multimedia
VITE_NAS_PROXY_URL=
```

El catálogo Profesional + myWeb, sus importes sin IVA y el orden de despliegue se describen en [Suscripciones](docs/subscriptions.md). Antes de habilitarlo, configura una tasa manual exclusiva del 21 % en Stripe; marcar los precios como `exclusive` no basta.

## Instalación y desarrollo

```bash
# 1. Clonar el repositorio
git clone https://github.com/m4lucen4/galia-dashboard.git
cd galia-dashboard

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Iniciar servidor de desarrollo
npm run dev
```

## Scripts disponibles

```bash
npm run dev       # Servidor de desarrollo con HMR
npm run build     # Compilar TypeScript y construir para producción
npm run preview   # Previsualizar el build localmente
npm run lint      # Ejecutar ESLint
```

## Flujo de autenticación

1. El usuario se registra en `/register`, selecciona plan y periodo
2. Se crea la cuenta en Supabase Auth y se redirige a Stripe Checkout
3. Tras el pago, el webhook de Stripe activa la suscripción
4. En login, se autentica con Supabase y se carga el perfil extendido de `userData`
5. La sesión se persiste en cookies seguras (`SameSite=Strict`)
6. Los guards de ruta comprueban `authenticated`, `role` y flags como `has_web`

## Integraciones externas

- **LinkedIn OAuth 2.0** — Publicación en perfiles y páginas de empresa
- **Instagram / Meta Graph API** — Publicación en cuentas de negocio
- **N8N** — Automatización de flujos de publicación (inmediata y programada)
- **Synology NAS** — Almacenamiento de archivos multimedia vía proxy
- **Google Maps** — Geolocalización de proyectos

## Requisitos previos

- Node.js 18 o superior
- Cuenta en Supabase con las tablas y Edge Functions configuradas
- Cuenta en Stripe con los productos y precios creados
- Cuenta en Vercel para el despliegue de las serverless functions

---

Desarrollado por el equipo de Mocklab
