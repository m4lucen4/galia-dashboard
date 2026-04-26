#!/usr/bin/env python3
"""
Add Photos v1 para Synology NAS
Procesa y analiza fotos NUEVAS añadidas a un proyecto ya existente.

- Detecta fotos en la raíz de la carpeta del proyecto (no en subcarpetas)
- Las procesa (genera versiones alta, baja, baja_ma, min)
- Las renombra siguiendo la secuencia existente (projectId-odooId-NNN.jpg)
- Analiza SOLO las nuevas con Gemini (sin Claude, sin cambiar descripción)
- Devuelve fileMapping + foto_tags para insertar en Supabase

Autor: MockLab
Versión: 1.0.0
"""

import os
import sys
import json
import shutil
import logging
import argparse
import re
import subprocess
from pathlib import Path
from typing import List, Dict

try:
    from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageCms
except ImportError:
    print("ERROR: Pillow no está instalado.")
    sys.exit(1)


# =============================================================================
# CONFIGURACIÓN
# =============================================================================

def load_config(config_path: str) -> dict:
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def setup_logging(config: dict, script_dir: Path) -> logging.Logger:
    log_file = script_dir / config.get('ai_logging', {}).get('log_file', 'ai_analyzer.log')
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)


# =============================================================================
# PROCESAMIENTO DE IMAGEN (reutilizado de photo_processor.py)
# =============================================================================

def load_image(file_path: Path, logger) -> Image.Image:
    try:
        ext = file_path.suffix.lower()
        if ext in ('.tif', '.tiff', '.psd'):
            try:
                from wand.image import Image as WandImage
                with WandImage(filename=str(file_path)) as wand_img:
                    wand_img.merge_layers('flatten')
                    png_blob = wand_img.make_blob('png')
                    from io import BytesIO
                    return Image.open(BytesIO(png_blob))
            except ImportError:
                return Image.open(file_path).convert('RGB')
        else:
            img = Image.open(file_path)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                if img.mode in ('RGBA', 'LA'):
                    background.paste(img, mask=img.split()[-1])
                    return background
            return img.convert('RGB')
    except Exception as e:
        logger.error(f"Error cargando imagen {file_path}: {e}")
        return None


def apply_sharpening(img: Image.Image, config: dict) -> Image.Image:
    sharpening = config['processing']['sharpening']
    return img.filter(ImageFilter.UnsharpMask(
        radius=sharpening['radius'],
        percent=sharpening['percent'],
        threshold=sharpening['threshold']
    ))


def resize_to_long_edge(img: Image.Image, long_edge: int) -> Image.Image:
    width, height = img.size
    if width >= height:
        new_width = long_edge
        new_height = int(height * (long_edge / width))
    else:
        new_height = long_edge
        new_width = int(width * (long_edge / height))
    return img.resize((new_width, new_height), Image.Resampling.LANCZOS)


def convert_to_srgb(img: Image.Image, logger) -> Image.Image:
    from io import BytesIO
    try:
        icc_profile = img.info.get('icc_profile')
        if icc_profile:
            srgb_profile = ImageCms.createProfile('sRGB')
            input_profile = ImageCms.ImageCmsProfile(BytesIO(icc_profile))
            img = ImageCms.profileToProfile(img, input_profile, srgb_profile, outputMode='RGB')
        return img
    except Exception as e:
        logger.warning(f"No se pudo convertir perfil de color: {e}")
        return img


def add_watermark(img, ref, config, script_dir, logger):
    try:
        import math
        wm = config['watermark']
        diagonal = math.sqrt(img.width ** 2 + img.height ** 2)
        base_font_size = diagonal * wm['font_size_percent'] / 100
        aspect_ratio = img.width / img.height
        if aspect_ratio < 1:
            correction = 1.25
        elif aspect_ratio <= 1.3:
            correction = 1.15
        elif aspect_ratio <= 1.6:
            correction = 1.0
        else:
            correction = 0.95
        font_size = max(int(base_font_size * correction), 10)

        font_path = script_dir / wm['font']
        if font_path.exists():
            font = ImageFont.truetype(str(font_path), font_size)
        else:
            try:
                font = ImageFont.truetype(wm['font'], font_size)
            except:
                font = ImageFont.load_default()

        line1 = wm['line1_template']
        line2 = wm['line2_template'].format(ref=ref)
        margin = max(int(img.width * wm['margin_percent'] / 100), 10)

        txt_layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
        txt_draw = ImageDraw.Draw(txt_layer)

        bbox1 = txt_draw.textbbox((0, 0), line1, font=font)
        bbox2 = txt_draw.textbbox((0, 0), line2, font=font)
        line1_height = bbox1[3] - bbox1[1]
        line2_height = bbox2[3] - bbox2[1]
        line_spacing = int(font_size * 0.3)
        total_height = line1_height + line_spacing + line2_height

        x = margin
        y1 = img.height - margin - total_height
        y2 = y1 + line1_height + line_spacing

        shadow_opacity = int(255 * wm['shadow_opacity'])
        shadow_color = tuple(wm['shadow_color']) + (shadow_opacity,)
        text_opacity = int(255 * wm['opacity'])
        text_color = tuple(wm['color']) + (text_opacity,)
        shadow_offset = wm['shadow_offset']

        txt_draw.text((x + shadow_offset, y1 + shadow_offset), line1, font=font, fill=shadow_color)
        txt_draw.text((x + shadow_offset, y2 + shadow_offset), line2, font=font, fill=shadow_color)
        txt_draw.text((x, y1), line1, font=font, fill=text_color)
        txt_draw.text((x, y2), line2, font=font, fill=text_color)

        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        img = Image.alpha_composite(img, txt_layer)
        return img.convert('RGB')
    except Exception as e:
        logger.error(f"Error añadiendo marca de agua: {e}")
        return img


def save_as_jpeg(img, output_path, quality, dpi=72, logger=None):
    try:
        img.save(output_path, 'JPEG', quality=quality, optimize=True, dpi=(dpi, dpi))
    except Exception as e:
        if logger:
            logger.error(f"Error guardando imagen {output_path}: {e}")
        raise


def copy_metadata_with_exiftool(source_path, dest_path, logger):
    try:
        cmd = ['perl', '/usr/local/bin/exiftool', '-TagsFromFile', str(source_path),
               '-all:all', '-overwrite_original', str(dest_path)]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning(f"Exiftool warning: {result.stderr}")
    except Exception as e:
        logger.error(f"Error copiando metadatos: {e}")


# =============================================================================
# ANÁLISIS CON GEMINI (solo fotos nuevas, sin Claude)
# =============================================================================

import base64

GEMINI_ADD_PROMPT = """Eres un editor senior de fotografía de arquitectura con experiencia en publicaciones como Arquitectura Viva, El Croquis y Domus.

Tienes delante fotografías NUEVAS añadidas a un reportaje de arquitectura existente. Analiza SOLO estas fotos.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional):

{
  "foto_tags": [
    {
      "filename": "nombre exacto del archivo",
      "descripcion_corta": "Frase técnica que describe lo que se ve. Útil como ALT text.",
      "iluminacion": ["valores canónicos"],
      "tipo_plano": ["valores canónicos"],
      "atmosfera_mood": ["valores canónicos"],
      "materiales_visibles": ["solo los claramente visibles"],
      "elementos_arquitectonicos": ["solo los identificables"],
      "rating": "principal o apoyo"
    }
  ]
}

REGLAS:
- foto_tags: un objeto por CADA foto nueva, en el mismo orden en que aparecen.
- iluminacion: solo valores canónicos: luz natural, luz artificial, luz mixta, luz cenital, luz lateral, luz rasante, luz frontal, luz difusa, luz directa, luz indirecta, contraluz, sombras geométricas, sombras marcadas, sombras suaves, hora dorada, hora azul, mediodía, cielo despejado, cielo nublado, noche, amanecer, atardecer
- tipo_plano: solo valores canónicos: plano general, plano medio, plano detalle, perspectiva central, perspectiva angular, perspectiva diagonal, vista cenital, vista aérea, contrapicado, picado, frontal, lateral, tres cuartos, interior-exterior
- atmosfera_mood: solo valores canónicos: serena, luminosa, íntima, contemplativa, dinámica, cálida, fría, monumental, minimalista, dramática, poética, industrial, rústica, mediterránea, doméstica, acogedora, abstracta, escultural
- materiales_visibles: solo los que se ven claramente. Máximo 5 por foto.
- elementos_arquitectonicos: solo los identificables. Máximo 5 por foto.
- rating: "principal" si la foto es destacable, "apoyo" si es complementaria.
- Responde ÚNICAMENTE con el JSON, sin texto adicional."""


BATCH_SIZE = 25  # Máximo de fotos por lote para Gemini


def _gemini_add_batch(client, batch_paths: List[Path], prompt: str,
                      gemini_model: str, logger) -> dict:
    """Envía un lote de fotos nuevas a Gemini."""
    from google.genai import types as google_types

    parts = []
    for p in batch_paths:
        try:
            data = p.read_bytes()
            parts.append(google_types.Part.from_bytes(data=data, mime_type='image/jpeg'))
            parts.append(f'[Foto: {p.name}]')
        except Exception as e:
            logger.warning(f"  No se pudo adjuntar {p.name}: {e}")

    parts.append(prompt)

    for attempt in range(3):
        try:
            if attempt > 0:
                logger.warning(f"  [Gemini] Reintento {attempt + 1}...")

            response = client.models.generate_content(
                model=gemini_model,
                contents=parts,
                config=google_types.GenerateContentConfig(
                    max_output_tokens=16000,
                    temperature=0.2,
                )
            )

            raw = response.text.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            return json.loads(raw)

        except Exception as e:
            logger.error(f"  [Gemini] Error lote (intento {attempt + 1}): {e}")

    return {}


def analyze_new_photos_gemini(image_paths: List[Path], config: dict, logger) -> dict:
    """Analiza fotos nuevas con Gemini, por lotes si es necesario."""
    ai_config = config.get('ai', {})
    gemini_key = ai_config.get('gemini_api_key') or os.environ.get('GEMINI_API_KEY', '')
    gemini_model = ai_config.get('gemini_model', 'gemini-2.5-flash')

    if not gemini_key:
        logger.error("GEMINI_API_KEY no configurada")
        return {}

    from google import genai as google_genai
    client = google_genai.Client(api_key=gemini_key)

    total = len(image_paths)
    logger.info(f"  [Gemini] Análisis de {total} fotos nuevas...")

    if total <= BATCH_SIZE:
        result = _gemini_add_batch(client, image_paths, GEMINI_ADD_PROMPT,
                                    gemini_model, logger)
        logger.info(f"  [Gemini] OK: {len(result.get('foto_tags', []))} fotos analizadas")
        return result

    # Múltiples lotes
    logger.info(f"  [Gemini] Dividiendo en lotes de {BATCH_SIZE}...")
    all_foto_tags = []

    for i in range(0, total, BATCH_SIZE):
        batch = image_paths[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(f"  [Gemini] Lote {batch_num}/{total_batches}: {len(batch)} fotos...")

        result = _gemini_add_batch(client, batch, GEMINI_ADD_PROMPT,
                                    gemini_model, logger)
        if result:
            all_foto_tags.extend(result.get('foto_tags', []))
        else:
            logger.warning(f"  [Gemini] Lote {batch_num} sin resultados, continuando...")

    logger.info(f"  [Gemini] OK total: {len(all_foto_tags)} fotos analizadas")
    return {'foto_tags': all_foto_tags}


# =============================================================================
# PIPELINE PRINCIPAL
# =============================================================================

def get_next_sequence(folder: Path, project_id: str) -> int:
    """Determina el siguiente número de secuencia mirando las subcarpetas existentes."""
    alta_folder = folder / f"{project_id}_alta"
    if not alta_folder.exists():
        return 1

    max_num = 0
    for f in alta_folder.iterdir():
        if f.is_file():
            # Extraer número de archivos tipo 42-1547-003.jpg
            match = re.search(r'-(\d{3})\.\w+$', f.name)
            if match:
                num = int(match.group(1))
                if num > max_num:
                    max_num = num
    return max_num + 1


def get_new_images(folder: Path) -> List[Path]:
    """Obtiene imágenes en la RAÍZ de la carpeta (no en subcarpetas)."""
    extensions = {'.jpg', '.jpeg', '.png', '.tif', '.tiff'}
    files = []
    for f in folder.iterdir():
        if f.is_file() and f.suffix.lower() in extensions:
            files.append(f)
    return sorted(files, key=lambda x: x.name.lower())


def add_photos_pipeline(folder_path: str, project_id: str, odoo_id: str,
                        config: dict, script_dir: Path, logger) -> dict:
    """
    Pipeline para añadir fotos nuevas a un proyecto existente:
    1. Detecta fotos nuevas en la raíz
    2. Las procesa (4 versiones)
    3. Las mueve a las subcarpetas con numeración secuencial
    4. Analiza con Gemini
    5. Devuelve fileMapping + foto_tags
    """
    target_folder = Path(folder_path)
    folder_name = target_folder.name

    logger.info("=" * 60)
    logger.info(f"Añadiendo fotos a proyecto: {folder_name}")
    logger.info(f"  project_id={project_id}, odoo_id={odoo_id}")
    logger.info("=" * 60)

    # Verificar que existen las subcarpetas del proyecto
    alta_folder = target_folder / f"{project_id}_alta"
    baja_folder = target_folder / f"{project_id}_baja"
    baja_ma_folder = target_folder / f"{project_id}_baja_ma"
    min_folder = target_folder / f"{project_id}_min"

    for sf in [alta_folder, baja_folder, baja_ma_folder, min_folder]:
        if not sf.exists():
            sf.mkdir(parents=True, exist_ok=True)
            logger.info(f"  Creada subcarpeta: {sf.name}")

    # Detectar fotos nuevas en la raíz
    new_images = get_new_images(target_folder)
    if not new_images:
        return {"ok": False, "message": "No se encontraron fotos nuevas en la raíz de la carpeta."}

    logger.info(f"  {len(new_images)} fotos nuevas encontradas")

    # Determinar secuencia
    next_num = get_next_sequence(target_folder, project_id)
    logger.info(f"  Secuencia desde: {next_num}")

    file_mapping = {}  # { original_name: new_name }
    baja_paths_for_analysis = []  # paths de baja para enviar a Gemini

    for idx, img_path in enumerate(new_images):
        seq = next_num + idx
        new_name = f"{project_id}-{odoo_id}-{str(seq).padStart(3, '0')}.jpg" if False else \
                   f"{project_id}-{odoo_id}-{str(seq).zfill(3)}.jpg"
        original_name = img_path.name

        logger.info(f"  Procesando {idx + 1}/{len(new_images)}: {original_name} -> {new_name}")

        # Cargar imagen
        img = load_image(img_path, logger)
        if img is None:
            logger.error(f"  No se pudo cargar: {img_path}")
            continue

        # 1. Alta — mover/convertir original
        alta_output = alta_folder / new_name
        original_was_jpg = img_path.suffix.lower() in ['.jpg', '.jpeg']
        if original_was_jpg:
            shutil.move(str(img_path), str(alta_output))
        else:
            save_as_jpeg(img.copy(), alta_output,
                        config['processing']['jpeg_quality_high'],
                        dpi=config['processing']['dpi_high'],
                        logger=logger)
            copy_metadata_with_exiftool(img_path, alta_output, logger)
            img_path.unlink()

        # 2. Baja — redimensionada + enfoque + sRGB
        img_baja = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
        img_baja = apply_sharpening(img_baja, config)
        img_baja = convert_to_srgb(img_baja, logger)
        baja_output = baja_folder / new_name
        save_as_jpeg(img_baja, baja_output,
                    config['processing']['jpeg_quality_web'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)
        copy_metadata_with_exiftool(alta_output, baja_output, logger)

        # 3. Baja con marca de agua
        img_baja_ma = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
        img_baja_ma = apply_sharpening(img_baja_ma, config)
        img_baja_ma = convert_to_srgb(img_baja_ma, logger)
        img_baja_ma = add_watermark(img_baja_ma, new_name.replace('.jpg', ''), config, script_dir, logger)
        baja_ma_output = baja_ma_folder / new_name
        save_as_jpeg(img_baja_ma, baja_ma_output,
                    config['processing']['jpeg_quality_web'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)
        copy_metadata_with_exiftool(alta_output, baja_ma_output, logger)

        # 4. Miniatura
        img_min = resize_to_long_edge(img.copy(), config['processing']['min_long_edge'])
        img_min = convert_to_srgb(img_min, logger)
        min_output = min_folder / new_name
        save_as_jpeg(img_min, min_output,
                    config['processing']['jpeg_quality_min'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)

        file_mapping[original_name] = new_name
        baja_paths_for_analysis.append(baja_output)

        logger.info(f"  -> {new_name} (4 versiones generadas)")

    # Analizar las fotos nuevas con Gemini
    foto_tags = []
    if baja_paths_for_analysis:
        gemini_result = analyze_new_photos_gemini(baja_paths_for_analysis, config, logger)
        if gemini_result:
            raw_tags = gemini_result.get('foto_tags', [])
            # Mapear filenames de Gemini (que usa los new_names) a los resultados
            foto_tags = raw_tags

    result = {
        "ok": True,
        "message": f"{len(file_mapping)} fotos añadidas y analizadas.",
        "fileMapping": file_mapping,
        "foto_tags": foto_tags
    }

    logger.info(f"  Pipeline completado: {len(file_mapping)} fotos procesadas")
    return result


# =============================================================================
# PROGRAMA PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Añadir fotos nuevas a un proyecto existente'
    )
    parser.add_argument('--config', '-c', default='config.json')
    parser.add_argument('--folder', '-f', required=True,
                        help='Carpeta del proyecto (ej: mlucena/42-1547-MAL)')
    parser.add_argument('--project-id', '-p', required=True,
                        help='ID del proyecto (ej: 42)')
    parser.add_argument('--odoo-id', '-o', required=True,
                        help='ID de Odoo del usuario (ej: 1547)')

    args = parser.parse_args()

    script_dir = Path(__file__).parent.resolve()

    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = script_dir / config_path

    if not config_path.exists():
        print(f"ERROR: No se encuentra configuración: {config_path}")
        sys.exit(1)

    config = load_config(config_path)
    logger = setup_logging(config, script_dir)

    # Resolver ruta
    folder_path = Path(args.folder)
    if not folder_path.is_absolute():
        homes_base = Path(config['paths']['homes_base'])
        folder_path = homes_base / args.folder

    if not folder_path.exists():
        result = {"ok": False, "message": f"No se encontró la carpeta '{args.folder}'."}
        print(f"##ADD_RESULT## {json.dumps(result, ensure_ascii=False)}")
        sys.exit(1)

    result = add_photos_pipeline(
        str(folder_path), args.project_id, args.odoo_id,
        config, script_dir, logger
    )

    print(f"##ADD_RESULT## {json.dumps(result, ensure_ascii=False)}")

    if not result.get('ok', False):
        sys.exit(1)

    logger.info("Add Photos finalizado")


if __name__ == '__main__':
    main()
