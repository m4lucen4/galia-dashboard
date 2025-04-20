# Galia Dashboard

Galia Dashboard es una aplicación web moderna desarrollada con React y TypeScript, diseñada para proporcionar una interfaz de usuario intuitiva y eficiente.

## Tecnologías principales

- React 19
- TypeScript
- Vite (bundler)
- Tailwind CSS
- Redux Toolkit
- Supabase
- React Router

## Características

- Interfaz de usuario moderna con componentes de Headless UI y Heroicons
- Gestión de estado con Redux Toolkit
- Tablas interactivas con TanStack React Table
- Backend conectado a Supabase
- Rutas dinámicas con React Router DOM
- Estilos personalizables con Tailwind CSS

## Requisitos previos

- Node.js (versión recomendada: 18.x o superior)
- npm o yarn

## Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/m4lucen4/galia-dashboard.git
   cd galia-dashboard
   ```

2. Instala las dependencias:
   ```bash
   npm install
   # o
   yarn
   ```

## Scripts disponibles

- **Desarrollo**: Inicia el servidor de desarrollo con hot-reload

  ```bash
  npm run dev
  ```

- **Build**: Compila TypeScript y construye la aplicación para producción

  ```bash
  npm run build
  ```

- **Lint**: Ejecuta el linter para verificar el código

  ```bash
  npm run lint
  ```

- **Preview**: Previsualiza la aplicación construida localmente
  ```bash
  npm run preview
  ```

## Estructura del proyecto

```
galia-dashboard/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
├── .eslintrc.js
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Configuración de desarrollo

El proyecto utiliza Vite para un desarrollo rápido y eficiente con hot module replacement (HMR). La configuración TypeScript está optimizada para proporcionar verificación de tipos en tiempo real.

## Licencia

[MIT](LICENSE)

---

Desarrollado con ❤️ por el equipo de Galia
