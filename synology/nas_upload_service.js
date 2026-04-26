const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 3003;
const API_KEY = process.env.API_KEY || "";
const BASE_PATH = process.env.BASE_PATH || "/data";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["*"];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
  }),
);
app.use(express.json());

// Auth — acepta header x-api-key o query param ?apikey= (necesario para <img src>)
function auth(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.apikey;
  if (API_KEY && key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Path sanitization — evita path traversal (../../etc)
function safePath(base, userPath) {
  const normalized = path.normalize(userPath).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(base, normalized);
  if (!full.startsWith(path.resolve(base))) {
    throw new Error("Invalid path");
  }
  return full;
}

// Multer — escribe en la ruta que viene en ?path=
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const dest = safePath(BASE_PATH, req.query.path || "");
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    // Preserva el nombre original, solo elimina caracteres peligrosos
    const safe = file.originalname.replace(/[/\\:*?"<>|]/g, "_");
    cb(null, safe);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB por fichero
});

// POST /upload?path=emailPrefix/carpetaProyecto
app.post("/upload", auth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file provided" });
  }
  res.json({
    success: true,
    filename: req.file.filename,
    size: req.file.size,
  });
});

// GET /files?path=emailPrefix/carpetaProyecto
app.get("/files", auth, (req, res) => {
  try {
    const folderPath = safePath(BASE_PATH, req.query.path || "");
    if (!fs.existsSync(folderPath)) {
      return res.json({ success: true, files: [] });
    }
    const items = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = items
      .filter((item) => item.isFile())
      .map((item) => {
        const stat = fs.statSync(path.join(folderPath, item.name));
        return {
          name: item.name,
          path: `${req.query.path}/${item.name}`,
          size: stat.size,
          modified: stat.mtime,
        };
      });
    res.json({ success: true, files });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /serve?path=emailPrefix/carpetaProyecto/imagen.jpg&apikey=xxx
// Sirve el archivo directamente (soporta apikey como query param para <img src>)
app.get("/serve", auth, (req, res) => {
  try {
    const filePath = safePath(BASE_PATH, req.query.path || "");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".tiff": "image/tiff",
      ".tif": "image/tiff",
      ".bmp": "image/bmp",
      ".heic": "image/heic",
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /file?path=emailPrefix/carpetaProyecto/imagen.jpg
app.delete("/file", auth, (req, res) => {
  try {
    const filePath = safePath(BASE_PATH, req.query.path || "");
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File not found" });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /rename — renombra carpeta tras crear proyecto
app.post("/rename", auth, (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) {
      return res.status(400).json({ success: false, error: "from and to required" });
    }
    const srcPath = safePath(BASE_PATH, from);
    const destPath = safePath(BASE_PATH, to);

    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ success: false, error: "Source folder not found" });
    }
    if (fs.existsSync(destPath)) {
      return res.status(409).json({ success: false, error: "Destination already exists" });
    }

    fs.renameSync(srcPath, destPath);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /folder — borra una carpeta completa de proyecto (con todas sus subcarpetas)
// Query: ?path=mlucena/42-1547-MAL
app.delete("/folder", auth, (req, res) => {
  try {
    const folderPath = safePath(BASE_PATH, req.query.path || "");
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ success: false, error: "Folder not found" });
    }
    fs.rmSync(folderPath, { recursive: true, force: true });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /photo — borra las 4 versiones de una foto (alta, baja, baja_ma, min)
// Query: ?folder=mlucena/42-1547-MAL&filename=42-1547-001.jpg&projectId=42
app.delete("/photo", auth, (req, res) => {
  try {
    const { folder, filename, projectId } = req.query;
    if (!folder || !filename || !projectId) {
      return res.status(400).json({
        success: false,
        error: "folder, filename and projectId required",
      });
    }

    const folderPath = safePath(BASE_PATH, folder);
    const subfolders = [`${projectId}_alta`, `${projectId}_baja`, `${projectId}_baja_ma`, `${projectId}_min`];
    const deleted = [];
    const notFound = [];

    for (const sub of subfolders) {
      const filePath = path.join(folderPath, sub, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deleted.push(sub);
      } else {
        notFound.push(sub);
      }
    }

    res.json({ success: true, deleted, notFound });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /restructure — renombra subcarpetas y ficheros según estructura del proyecto
// Body: { "folder": "mlucena/42-1547-MAL", "projectId": "42", "odooId": "1547" }
// Resultado:
//   alta/         → 42_alta/         con ficheros 42-1547-001.jpg, 42-1547-002.jpg...
//   baja/         → 42_baja/         con ficheros 42-1547-001.jpg, 42-1547-002.jpg...
//   baja_ma/      → 42_baja_ma/      con ficheros 42-1547-001.jpg, 42-1547-002.jpg...
//   min/          → 42_min/          con ficheros 42-1547-001.jpg, 42-1547-002.jpg...
app.post("/restructure", auth, (req, res) => {
  try {
    const { folder, projectId, odooId } = req.body;
    if (!folder || !projectId || !odooId) {
      return res.status(400).json({
        success: false,
        error: "folder, projectId and odooId required",
      });
    }

    const folderPath = safePath(BASE_PATH, folder);
    if (!fs.existsSync(folderPath)) {
      return res.status(404).json({ success: false, error: "Folder not found" });
    }

    const subfolders = ["alta", "baja", "baja_ma", "min"];
    const fileMapping = {}; // { oldFilename: newFilename }

    for (const sub of subfolders) {
      const oldSubPath = path.join(folderPath, sub);
      if (!fs.existsSync(oldSubPath)) continue;

      // Leer ficheros y ordenarlos para numeración consistente
      const files = fs.readdirSync(oldSubPath)
        .filter((f) => fs.statSync(path.join(oldSubPath, f)).isFile())
        .sort();

      // Renombrar ficheros dentro de la subcarpeta
      let counter = 1;
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        const newName = `${projectId}-${odooId}-${String(counter).padStart(3, "0")}${ext}`;
        const oldFilePath = path.join(oldSubPath, file);
        const newFilePath = path.join(oldSubPath, newName);
        fs.renameSync(oldFilePath, newFilePath);

        // Guardar mapping solo para la primera subcarpeta (evitar duplicados)
        if (sub === "alta") {
          fileMapping[file] = newName;
        }
        counter++;
      }

      // Renombrar la subcarpeta
      const newSubPath = path.join(folderPath, `${projectId}_${sub}`);
      fs.renameSync(oldSubPath, newSubPath);
    }

    res.json({ success: true, fileMapping });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`NAS Proxy running on port ${PORT}`);
  console.log(`Base path: ${BASE_PATH}`);
});
