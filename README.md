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

# Email
RESEND_API_KEY=

# NAS / Multimedia
VITE_NAS_PROXY_URL=
```

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
