const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3060;
const API_TOKEN = process.env.API_TOKEN || "";

// Rutas a los scripts Python y su directorio
const SCRIPT_DIR = process.env.SCRIPT_DIR || "/app/processor";
const PROCESSOR_PATH = path.join(SCRIPT_DIR, "photo_processor.py");
const ANALYZER_PATH = path.join(SCRIPT_DIR, "ai_analyzer.py");
const ADD_PHOTOS_PATH = path.join(SCRIPT_DIR, "add_photos.py");
const CONFIG_PATH = path.join(SCRIPT_DIR, "config.json");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";

// ─────────────────────────────────────────────
// Middleware de autenticación por token
// ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (!API_TOKEN) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
    return res.status(401).json({
      inProgress: false,
      ok: false,
      message: "No autorizado.",
    });
  }
  next();
}

app.use("/process", authMiddleware);
app.use("/status", authMiddleware);
app.use("/add-photos", authMiddleware);

// ─────────────────────────────────────────────
// Almacén de trabajos en memoria
// ─────────────────────────────────────────────
const jobs = new Map();

/**
 * Estructura de un job:
 * {
 *   folder:      string,
 *   phase:       "processing" | "analyzing" | "done",
 *   inProgress:  boolean,
 *   ok:          boolean,
 *   message:     string,
 *   analysis:    object | null,    ← resultado del análisis IA
 *   startedAt:   string (ISO),
 *   finishedAt:  string (ISO) | null
 * }
 */

// ─────────────────────────────────────────────
// Ejecuta un script Python y devuelve una promesa
// ─────────────────────────────────────────────
function runScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(PYTHON_BIN, [scriptPath, ...args], {
      cwd: SCRIPT_DIR,
      env: { ...process.env },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject({ stdout, stderr, code });
      }
    });

    proc.on("error", (err) => {
      reject({ stdout, stderr, code: -1, error: err.message });
    });
  });
}

// ─────────────────────────────────────────────
// POST /process
// Lanza el pipeline: photo_processor → ai_analyzer
// Body: { "folder": "usuario/carpeta" }
// ─────────────────────────────────────────────
app.post("/process", (req, res) => {
  const { folder } = req.body;

  if (!folder || typeof folder !== "string") {
    return res.status(400).json({
      inProgress: false,
      ok: false,
      message:
        "Se requiere el campo 'folder' con el nombre de la carpeta del reportaje.",
    });
  }

  // Verificar si ya hay un proceso activo para esta carpeta
  const existing = jobs.get(folder);
  if (existing && existing.inProgress) {
    return res.status(409).json({
      inProgress: true,
      ok: false,
      message: `El reportaje '${folder}' ya se está procesando.`,
    });
  }

  // Crear el job
  const job = {
    folder,
    phase: "processing",
    inProgress: true,
    ok: false,
    message: "Procesando imágenes...",
    analysis: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  jobs.set(folder, job);

  // Responder inmediatamente
  res.status(202).json({
    inProgress: job.inProgress,
    ok: job.ok,
    message: job.message,
  });

  // Lanzar pipeline asíncrono
  (async () => {
    try {
      // ── FASE 1: Procesar imágenes ──
      console.log(`[FASE 1] ${folder} | Procesando imágenes...`);
      const procResult = await runScript(PROCESSOR_PATH, [
        "--force", folder,
        "--config", CONFIG_PATH,
      ]);

      const summary = extractMarker(procResult.stdout, "##SUMMARY##");
      console.log(
        `[FASE 1 OK] ${folder} | ${summary || "Imágenes procesadas"}`
      );

      // ── FASE 2: Análisis IA ──
      job.phase = "analyzing";
      job.message = "Analizando imágenes con IA...";
      console.log(`[FASE 2] ${folder} | Analizando con IA...`);

      const aiResult = await runScript(ANALYZER_PATH, [
        "--folder", folder,
        "--config", CONFIG_PATH,
      ]);

      const aiData = extractMarker(aiResult.stdout, "##AI_RESULT##");

      if (aiData) {
        try {
          const parsed = JSON.parse(aiData);
          job.analysis = parsed;
          job.ok = parsed.ok !== false;
          job.message = job.ok
            ? `Carpeta '${folder}' procesada y analizada correctamente.`
            : parsed.message || "Error en el análisis IA.";
        } catch {
          job.ok = true;
          job.message = `Carpeta '${folder}' procesada. Análisis IA no disponible.`;
        }
      } else {
        job.ok = true;
        job.message = `Carpeta '${folder}' procesada. Análisis IA sin resultados.`;
      }

      console.log(`[FASE 2 OK] ${folder} | Análisis completado`);
    } catch (err) {
      // Si falla FASE 1, no lanzar FASE 2
      if (job.phase === "processing") {
        job.ok = false;
        job.message = `Error al procesar las imágenes de '${folder}'. Revisa los logs.`;
        console.error(`[FASE 1 ERROR] ${folder} | Código: ${err.code}`);
        console.error(`[STDERR] ${err.stderr || err.error || ""}`);
        if (err.stdout) console.error(`[STDOUT] ${err.stdout}`);
      } else {
        // FASE 2 falló — las imágenes se procesaron bien
        // Intentar extraer el resultado de IA aunque haya fallado
        const aiData = extractMarker(err.stdout || "", "##AI_RESULT##");
        if (aiData) {
          try {
            const parsed = JSON.parse(aiData);
            job.ok = false;
            job.message = parsed.message || `El análisis IA falló para '${folder}'.`;
            job.analysis = parsed;
          } catch {
            job.ok = true;
            job.message = `Carpeta '${folder}' procesada correctamente. El análisis IA falló.`;
          }
        } else {
          job.ok = true;
          job.message = `Carpeta '${folder}' procesada correctamente. El análisis IA falló.`;
        }
        console.error(`[FASE 2 ERROR] ${folder} | Código: ${err.code}`);
        console.error(`[STDERR] ${err.stderr || err.error || ""}`);
        if (err.stdout) console.error(`[STDOUT] ${err.stdout}`);
      }
    } finally {
      job.inProgress = false;
      job.phase = "done";
      job.finishedAt = new Date().toISOString();
      console.log(
        `[${job.ok ? "OK" : "ERROR"}] ${folder} | Duración: ${getDuration(job.startedAt, job.finishedAt)}`
      );
    }
  })();
});

// ─────────────────────────────────────────────
// GET /status?folder=usuario/carpeta
// Consulta el estado del procesamiento
// Devuelve analysis cuando está disponible
// ─────────────────────────────────────────────
app.get("/status", (req, res) => {
  const folder = req.query.folder;

  if (!folder) {
    return res.status(400).json({
      inProgress: false,
      ok: false,
      message: "Se requiere el parámetro 'folder'.",
    });
  }

  const job = jobs.get(folder);

  if (!job) {
    return res.status(404).json({
      inProgress: false,
      ok: false,
      message: `No se encontró ningún procesamiento para '${folder}'.`,
    });
  }

  const response = {
    inProgress: job.inProgress,
    phase: job.phase,
    ok: job.ok,
    message: job.message,
  };

  // Solo incluir analysis cuando el proceso ha terminado y hay datos
  if (!job.inProgress && job.analysis) {
    response.analysis = job.analysis;
  }

  return res.json(response);
});

// ─────────────────────────────────────────────
// POST /add-photos
// Añade fotos nuevas a un proyecto existente
// Body: { "folder": "mlucena/42-1547-MAL", "projectId": "42", "odooId": "1547" }
// ─────────────────────────────────────────────
app.post("/add-photos", (req, res) => {
  const { folder, projectId, odooId } = req.body;

  if (!folder || !projectId || !odooId) {
    return res.status(400).json({
      inProgress: false,
      ok: false,
      message: "Se requieren 'folder', 'projectId' y 'odooId'.",
    });
  }

  // Verificar si ya hay un proceso activo para esta carpeta
  const jobKey = `add:${folder}`;
  const existing = jobs.get(jobKey);
  if (existing && existing.inProgress) {
    return res.status(409).json({
      inProgress: true,
      ok: false,
      message: `Ya se están añadiendo fotos a '${folder}'.`,
    });
  }

  // Crear el job
  const job = {
    folder,
    phase: "processing",
    inProgress: true,
    ok: false,
    message: "Procesando y analizando fotos nuevas...",
    analysis: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  };

  jobs.set(jobKey, job);

  // Responder inmediatamente
  res.status(202).json({
    inProgress: job.inProgress,
    ok: job.ok,
    message: job.message,
  });

  // Lanzar pipeline asíncrono
  (async () => {
    try {
      console.log(`[ADD-PHOTOS] ${folder} | Procesando fotos nuevas...`);

      const result = await runScript(ADD_PHOTOS_PATH, [
        "--folder", folder,
        "--project-id", String(projectId),
        "--odoo-id", String(odooId),
        "--config", CONFIG_PATH,
      ]);

      const addData = extractMarker(result.stdout, "##ADD_RESULT##");

      if (addData) {
        try {
          const parsed = JSON.parse(addData);
          job.analysis = parsed;
          job.ok = parsed.ok !== false;
          job.message = job.ok
            ? parsed.message || `Fotos añadidas a '${folder}'.`
            : parsed.message || "Error al añadir fotos.";
        } catch {
          job.ok = false;
          job.message = "Error parseando resultado del script.";
        }
      } else {
        job.ok = false;
        job.message = "El script no devolvió resultados.";
      }

      console.log(`[ADD-PHOTOS OK] ${folder} | ${job.message}`);
    } catch (err) {
      job.ok = false;
      job.message = `Error al procesar fotos nuevas de '${folder}'.`;
      console.error(`[ADD-PHOTOS ERROR] ${folder} | Código: ${err.code}`);
      console.error(`[STDERR] ${err.stderr || err.error || ""}`);
      if (err.stdout) console.error(`[STDOUT] ${err.stdout}`);
    } finally {
      job.inProgress = false;
      job.phase = "done";
      job.finishedAt = new Date().toISOString();
      console.log(
        `[${job.ok ? "OK" : "ERROR"}] add-photos ${folder} | Duración: ${getDuration(job.startedAt, job.finishedAt)}`
      );
    }
  })();
});

// ─────────────────────────────────────────────
// GET /status?folder=add:usuario/carpeta (también soporta add-photos)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ─────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────

/**
 * Extrae datos de una línea marcada en el stdout.
 * Busca la última línea que empiece con el marcador.
 */
function extractMarker(output, marker) {
  const lines = output.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith(marker)) {
      return line.replace(marker, "").trim();
    }
  }
  return null;
}

/**
 * Calcula la duración legible entre dos timestamps ISO.
 */
function getDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

// ─────────────────────────────────────────────
// Inicio del servidor
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Photo Processor Service escuchando en puerto ${PORT}`);
  console.log(`Processor: ${PROCESSOR_PATH}`);
  console.log(`Analyzer: ${ANALYZER_PATH}`);
  console.log(`Directorio: ${SCRIPT_DIR}`);
});