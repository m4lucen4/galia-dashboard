# Skill: Synology NAS — Gestión de archivos y fotos de proyecto

## Servicios desplegados en el Synology

Hay dos servicios Node independientes:

| Servicio | Archivo | Puerto | Función |
|---|---|---|---|
| NAS Proxy | `synology/nas_upload_service.js` | 3003 | Operaciones de filesystem (upload, serve, delete, rename, restructure) |
| Photo Processor | `synology/photo_processor/photo_processor_service.js` | 3060 | Orquesta scripts Python de procesado e IA |

El archivo `nas-upload-proxy` es una versión antigua sin uso — no tiene `/photo`, `/folder` ni `/restructure`.

---

## Variables de entorno relevantes (cliente)

```
VITE_NAS_PROXY_URL          → URL del NAS Proxy (nas_upload_service.js)
VITE_NAS_PROXY_API_KEY      → API key del NAS Proxy (header x-api-key o ?apikey=)
VITE_PHOTO_PROCESSOR_URL    → URL del Photo Processor Service
VITE_PHOTO_PROCESSOR_TOKEN  → Bearer token del Photo Processor
```

---

## NAS Proxy — Endpoints (`nas_upload_service.js`)

Auth: header `x-api-key` o query `?apikey=` (necesario para `<img src>`).
`BASE_PATH` = `/volume1/homes` — todos los paths son relativos a esta raíz.

### `POST /upload?path={folder}`
Sube un archivo al NAS. Multer escribe en `{BASE_PATH}/{folder}`. Límite 200MB.
- Preserva nombre original, elimina caracteres peligrosos.
- En modo proyecto (`projectId` presente), `folder` = `baseFolder` (raíz del proyecto) para que `add_photos.py` detecte los archivos nuevos.
- Si no hay `projectId`, después del upload se refresca el listado con `GET /files`.

### `GET /files?path={folder}`
Lista archivos (no directorios) de `{BASE_PATH}/{folder}`. Devuelve `{ name, path, size, modified }[]`.

### `GET /serve?path={filePath}&apikey={key}`
Sirve un archivo directamente como stream. Soporta JPG, PNG, GIF, WEBP, TIFF, BMP, HEIC.
- Usado para thumbnails en `NasFilesModal` (cliente directo).
- Para fotos de proyecto con autenticación → Edge Function `serve-photo` (ver más abajo).

### `DELETE /file?path={filePath}`
Elimina un archivo individual. Usado para archivos no-imagen o cuando no hay `projectId`.

### `DELETE /folder?path={folderPath}`
Elimina una carpeta completa de forma recursiva (`rmSync recursive`).

### `DELETE /photo?folder={folder}&filename={filename}&projectId={projectId}`
Elimina las 4 versiones de una foto de proyecto:
- `{projectId}_alta/{filename}`
- `{projectId}_baja/{filename}`
- `{projectId}_baja_ma/{filename}`
- `{projectId}_min/{filename}`

Devuelve `{ deleted[], notFound[] }`.

### `POST /rename`
Body: `{ from, to }`. Renombra una carpeta. Devuelve 409 si el destino ya existe.

### `POST /restructure`
Body: `{ folder, projectId, odooId }`.
Renombra subcarpetas `alta/baja/baja_ma/min/` → `{projectId}_alta/` etc., y los archivos dentro a `{projectId}-{odooId}-NNN.jpg`. Devuelve `fileMapping` `{ oldName: newName }`.

**Nota:** El watermark en `photo_processor.py` se aplica ANTES de que `/restructure` renombre los archivos, por lo que el watermark muestra el nombre original del archivo, no el nombre final renombrado. Cambio pendiente, descartado por coste de implementación.

---

## Photo Processor Service — Endpoints (`photo_processor_service.js`)

Auth: header `Authorization: Bearer {token}`.
Jobs almacenados en memoria (Map). Clave del job: `folder` o `add:{folder}`.

### `POST /process`
Body: `{ folder }` — ruta relativa a `homes_base` (ej: `mlucena/42-1547-MAL`).
Lanza pipeline secuencial:
1. `photo_processor.py --force {folder} --config config.json` → genera las 4 versiones
2. `ai_analyzer.py --folder {folder} --config config.json` → análisis Gemini + Claude

Responde 202 inmediatamente. Resultado disponible vía `/status`.

### `POST /add-photos`
Body: `{ folder, projectId, odooId }`.
Lanza `add_photos.py --folder {folder} --project-id {projectId} --odoo-id {odooId} --config config.json`.
Job key: `add:{folder}`.

### `GET /status?folder={key}`
Devuelve estado del job. Cuando `inProgress: false`:
- Si `ok: true` → incluye `analysis` con el resultado.
- Para jobs de `/process`: `analysis` tiene estructura `ProcessorAnalysis`.
- Para jobs de `/add-photos` (key `add:{folder}`): `analysis` tiene estructura `AddPhotosAnalysis`.

---

## Scripts Python (`synology/photo_processor/`)

Configuración compartida: `config.json`.
- `paths.homes_base` = `/volume1/homes`
- Calidades: alta 95%, web 80%, min 40%
- Tamaños: web 2080px lado largo, min 200px lado largo
- Watermark: `mocklab©` + `Ref: {nombre_archivo}`, fuente RobotoMono 2.5% diagonal

### `photo_processor.py`
Invocado por `/process`. Args: `--force {folder}` o sin args (escaneo automático).

**Primera vez** (no existe `alta/`):
1. Lee imágenes de la raíz de la carpeta
2. Crea subcarpetas `alta/`, `baja/`, `baja_ma/`, `min/`
3. Por cada imagen:
   - `alta/` — mueve/convierte original a JPG 95%
   - `baja/` — resize 2080px + sharpening + sRGB, JPG 80%
   - `baja_ma/` — igual + watermark con `original_name` (pendiente fix rename)
   - `min/` — resize 200px + sRGB, JPG 40%
   - Copia metadatos EXIF con exiftool
4. Emite `##SUMMARY## {json}` en stdout

**Ya procesado** (existe `alta/` y `baja/`):
- Modo sincronización: detecta fotos nuevas/eliminadas en `alta/` y actualiza `baja/`, `baja_ma/`, `min/` en consecuencia.

### `ai_analyzer.py`
Invocado por `/process` tras `photo_processor.py`. Args: `--folder {folder}`.
Lee imágenes de `baja/`.

**Pipeline:**
1. Extrae metadatos EXIF (año, web) de `alta/`
2. **Gemini** (`gemini-2.5-flash`) — análisis visual global: `tags_proyecto`, ratings (`foto_heroica`, `fotos_principales`, `fotos_apoyo`), `foto_tags` por imagen. Lotes de 25 fotos máximo.
3. **Claude** (`claude-sonnet-4-20250514`) — descripción editorial en español (250-400 palabras, tono Arquitectura Viva). Máximo 10 fotos (las mejor valoradas por Gemini).
4. Combina resultado y asigna `rating` (`heroica`/`principal`/`apoyo`) a cada `foto_tag`.
5. Emite `##AI_RESULT## {json}` en stdout.

Resultado: `{ ok, titulo, descripcion, tags, web, anio, foto_tags[] }`.

### `add_photos.py`
Invocado por `/add-photos`. Args: `--folder`, `--project-id`, `--odoo-id`.
Diseñado para añadir fotos nuevas a un proyecto **ya existente y restructurado**.

**Pipeline:**
1. Detecta fotos nuevas en la **raíz** de la carpeta (no en subcarpetas)
2. Determina siguiente número de secuencia leyendo `{projectId}_alta/`
3. Por cada foto nueva:
   - Genera las 4 versiones con nombre final `{projectId}-{odooId}-NNN.jpg`
   - `{projectId}_alta/`, `{projectId}_baja/`, `{projectId}_baja_ma/`, `{projectId}_min/`
   - Watermark usa el `new_name` correcto (sin bug de rename)
4. **Gemini** — analiza solo las fotos nuevas (sin Claude, sin cambiar descripción del proyecto)
5. Emite `##ADD_RESULT## {json}` en stdout.

Resultado: `{ ok, message, fileMapping, foto_tags[] }`.

---

## Supabase Edge Function — `serve-photo`

Archivo: `supabase/functions/serve-photo/index.ts`.
Proxy seguro para servir fotos de proyecto — el API key del NAS nunca llega al cliente.

**Flujo:** `GET /serve-photo?id={photoId}&size={min|baja_ma}&token={jwt}`
1. Valida sesión del usuario (JWT)
2. Verifica que el usuario tiene `role === "admin"`
3. Consulta `project_photos` para obtener `nas_base_path`, `project_id`, `filename`
4. Construye path: `/{nas_base_path}/{project_id}_{size}/{filename}`
5. Llama internamente a `NAS_URL/serve?path=...&apikey=...`
6. Devuelve la imagen como stream con `Cache-Control: private, max-age=3600`

Tamaños permitidos: `min` y `baja_ma`.

---

## Componentes del dashboard implicados

| Componente | Archivo | Rol |
|---|---|---|
| `ProjectsForm` | `src/features/projects/components/ProjectsForm.tsx` | Contenedor del formulario, monta `NasFilesModal` |
| `NasFilesModal` | `src/features/projects/components/NasFilesModal.tsx` | Modal de gestión de archivos NAS (upload, delete, analizar) |
| `NasFilesSection` | `src/features/projects/components/NasFilesSection.tsx` | Versión inline sin procesado (legacy, sin uso en flujo principal) |
| `usePhotoProcessor` | `src/features/projects/hooks/usePhotoProcessor.ts` | Hook que gestiona llamadas al Photo Processor y polling de estado |
| `NasActions` | `src/redux/actions/NasActions.ts` | Thunks para todas las llamadas al NAS Proxy |
| `ProjectPhotoActions` | `src/redux/actions/ProjectPhotoActions.ts` | Thunks para INSERT/DELETE en tabla `project_photos` de Supabase |

---

## Flujo completo — Primera subida de fotos a proyecto nuevo

```
1. ProjectsForm monta → GET /files (NAS Proxy) → muestra contador
2. Usuario abre NasFilesModal → GET /files refresca listado
3. Usuario sube archivos → POST /upload × N (XHR directo al NAS Proxy)
4. Todas subidas OK → aparece botón "Analizar"
5. Usuario pulsa Analizar → POST /process (Photo Processor)
   → photo_processor.py: genera alta/ baja/ baja_ma/ min/ con nombres originales
   → ai_analyzer.py: Gemini (tags) + Claude (descripción editorial)
6. Polling GET /status cada 3s → cuando done:
   → análisis disponible en formData del proyecto (título, descripción, tags)
7. Usuario llama POST /restructure (NAS Proxy)
   → renombra carpetas y archivos a {projectId}-{odooId}-NNN.jpg
   ⚠️ El watermark ya está grabado con nombre original (bug conocido, descartado)
8. INSERT en project_photos (Supabase directo) — no pasa por NAS
```

## Flujo completo — Añadir fotos a proyecto existente

```
1. Usuario abre NasFilesModal → GET /files
2. Usuario sube archivos nuevos → POST /upload × N (van a la raíz del proyecto)
3. Todas subidas OK → aparece botón "Analizar"
4. Usuario pulsa Analizar → POST /add-photos (Photo Processor)
   → add_photos.py: detecta fotos en raíz, genera 4 versiones con new_name correcto,
     analiza con Gemini (sin Claude)
5. Polling GET /status?folder=add:{folder} cada 3s → cuando done:
   → addPhotosResult.foto_tags disponible
6. dispatch(addProjectPhotos) → INSERT en project_photos (Supabase)
7. GET /files → refresca modal con thumbnails nuevas
```

## Flujo completo — Eliminar foto de proyecto

```
1. Usuario hace click en TrashIcon en NasFilesModal
2. DELETE /photo?folder={baseFolder}&filename={filename}&projectId={projectId} (NAS Proxy)
   → elimina las 4 versiones del archivo en el NAS
3. dispatch(deleteProjectPhoto) → DELETE en project_photos (Supabase)
4. GET /files → refresca listado
```
