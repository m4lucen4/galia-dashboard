#!/usr/bin/env python3
"""
AI Analyzer v1 para Synology NAS
Analiza carpetas de fotos procesadas usando Gemini + Claude:
- Gemini: análisis visual global (ratings, tags por foto, tags generales)
- Claude: descripción editorial en español con tono arquitectura

Entrada: carpeta con subcarpeta baja/ generada por photo_processor.py
Salida: JSON con datos para prellenar formulario de proyecto

Autor: MockLab
Versión: 1.0.0
"""

import os
import sys
import json
import base64
import logging
import argparse
import re
import subprocess
from pathlib import Path
from typing import Optional, List, Dict

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

def load_config(config_path: str) -> dict:
    """Carga la configuración desde el archivo JSON."""
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def setup_logging(config: dict, script_dir: Path) -> logging.Logger:
    """Configura el sistema de logging."""
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
# CLIENTES IA
# =============================================================================

def get_gemini_client(api_key: str):
    """Inicializa el cliente de Gemini."""
    from google import genai as google_genai
    return google_genai.Client(api_key=api_key)


def get_claude_client(api_key: str):
    """Inicializa el cliente de Claude."""
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


# =============================================================================
# UTILIDADES DE IMAGEN
# =============================================================================

def get_image_files(folder: Path) -> List[Path]:
    """Obtiene lista de imágenes JPG ordenadas."""
    files = []
    for ext in ('.jpg', '.jpeg', '.JPG', '.JPEG'):
        files.extend(folder.glob(f'*{ext}'))
    return sorted(set(files), key=lambda x: x.name.lower())


def image_to_base64(path: Path) -> str:
    """Convierte imagen a base64."""
    with open(path, 'rb') as f:
        return base64.standard_b64encode(f.read()).decode('utf-8')


def read_exif_metadata(folder: Path, logger: logging.Logger) -> dict:
    """
    Lee metadatos EXIF/IPTC de la primera imagen de la carpeta.
    Intenta extraer web y año si están disponibles.
    """
    images = get_image_files(folder)
    if not images:
        return {}

    try:
        cmd = ['exiftool', '-j', '-charset', 'utf8', str(images[0])]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0 or not result.stdout.strip():
            return {}

        data = json.loads(result.stdout)
        raw = data[0] if data else {}

        metadata = {}

        # Intentar extraer año
        for field in ['DateCreated', 'CreateDate', 'DateTimeOriginal', 'ModifyDate']:
            val = raw.get(field, '')
            if val:
                # Extraer año del formato YYYY:MM:DD o YYYY-MM-DD
                match = re.match(r'(\d{4})', str(val))
                if match:
                    metadata['anio'] = match.group(1)
                    break

        # Intentar extraer URL/web
        for field in ['URL', 'WebStatement', 'Source', 'Credit']:
            val = raw.get(field, '')
            if val and ('http' in str(val) or 'www' in str(val)):
                metadata['web'] = str(val).strip()
                break

        if metadata:
            logger.info(f"  Metadatos EXIF extraídos: {metadata}")

        return metadata

    except Exception as e:
        logger.warning(f"  No se pudieron leer metadatos EXIF: {e}")
        return {}


# =============================================================================
# PROMPTS
# =============================================================================

GEMINI_GLOBAL_PROMPT = """Eres un editor senior de fotografía de arquitectura con experiencia en publicaciones como Arquitectura Viva, El Croquis y Domus.

Tienes delante TODAS las fotografías de un reportaje de arquitectura. Estúdialas con atención antes de responder — tu análisis debe reflejar lo que realmente ves en el conjunto, no suposiciones genéricas.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks, sin texto adicional):

{
  "tags_proyecto": ["tag1", "tag2", "..."],
  "ratings": {
    "foto_heroica": "filename.jpg — LA foto del reportaje. La más expresiva, técnicamente perfecta y narrativamente potente. Solo una.",
    "fotos_principales": ["filename.jpg"],
    "fotos_apoyo": ["filename.jpg"]
  },
  "foto_tags": [
    {
      "filename": "nombre exacto del archivo",
      "descripcion_corta": "Frase técnica que describe lo que se ve. Útil como ALT text.",
      "iluminacion": ["solo valores canónicos: luz natural, luz artificial, luz mixta, luz cenital, luz lateral, luz rasante, luz frontal, luz difusa, luz directa, luz indirecta, contraluz, sombras geométricas, sombras marcadas, sombras suaves, hora dorada, hora azul, mediodía, cielo despejado, cielo nublado, noche, amanecer, atardecer"],
      "tipo_plano": ["solo valores canónicos: plano general, plano medio, plano detalle, perspectiva central, perspectiva angular, perspectiva diagonal, vista cenital, vista aérea, contrapicado, picado, frontal, lateral, tres cuartos, interior-exterior"],
      "atmosfera_mood": ["solo valores canónicos: serena, luminosa, íntima, contemplativa, dinámica, cálida, fría, monumental, minimalista, dramática, poética, industrial, rústica, mediterránea, doméstica, acogedora, abstracta, escultural"],
      "materiales_visibles": ["solo los claramente visibles: hormigón, madera, vidrio, acero, ladrillo, piedra, cerámica, metal, aluminio, cobre, mármol, terrazo, microcemento, etc."],
      "elementos_arquitectonicos": ["solo los identificables: escalera, fachada, cubierta, voladizo, patio, terraza, balcón, ventanal, lucernario, pérgola, porche, muro cortina, pilar, viga, barandilla, puerta corredera, etc."]
    }
  ]
}

REGLAS CRÍTICAS:
- tags_proyecto: entre 8 y 15 tags generales que describan el proyecto completo. Incluir: tipología (vivienda, oficina, hotel...), estilo (minimalista, brutalista...), materiales dominantes, ubicación si es evidente, escala, conceptos clave.
- foto_heroica: exactamente UNA foto. La más expresiva del conjunto.
- fotos_principales: entre 3 y 8 fotos. Las mejores después de la heroica.
- fotos_apoyo: el resto.
- foto_tags: un objeto por CADA foto, en el mismo orden en que aparecen.
- materiales_visibles: solo los que se ven claramente. Máximo 5 por foto.
- elementos_arquitectonicos: solo los identificables. Máximo 5 por foto.
- Responde ÚNICAMENTE con el JSON, sin texto adicional."""


CLAUDE_EDITORIAL_PROMPT = """Eres un editor senior de fotografía de arquitectura.

A partir de estas fotografías de un reportaje de arquitectura, genera una descripción editorial.

Responde ÚNICAMENTE con un JSON válido (sin markdown, sin backticks):

{
  "descripcion": "4-5 párrafos en ESPAÑOL. Mínimo 250 palabras. Tono técnico pero accesible, estilo Arquitectura Viva / El Croquis. Describe qué hace singular este proyecto: su relación con el lugar, las decisiones de proyecto, los materiales, la luz. Sin referencias temporales. Sin adjetivos vacíos (impresionante, espectacular). Sin párrafos de cierre genéricos. Prosa densa con criterio editorial."
}

REGLAS:
- SIEMPRE en español.
- Mínimo 250 palabras, máximo 400.
- Tono: técnico pero accesible. Como si escribieras para Arquitectura Viva.
- No uses referencias temporales como "reciente", "nueva obra", "proyecto de este año".
- No uses adjetivos vacíos: "impresionante", "espectacular", "increíble".
- Responde ÚNICAMENTE con el JSON."""


# =============================================================================
# ANÁLISIS CON IA
# =============================================================================

def _gemini_batch(gemini_client, batch_paths: List[Path], prompt: str,
                   gemini_model: str, logger: logging.Logger) -> dict:
    """Envía un lote de fotos a Gemini y devuelve el resultado parseado."""
    from google.genai import types as google_types

    parts = []
    for p in batch_paths:
        try:
            data = p.read_bytes()
            parts.append(google_types.Part.from_bytes(
                data=data, mime_type='image/jpeg'))
            parts.append(f'[Foto: {p.name}]')
        except Exception as e:
            logger.warning(f"  No se pudo adjuntar {p.name}: {e}")

    parts.append(prompt)

    for attempt in range(3):
        try:
            if attempt > 0:
                logger.warning(f"  [Gemini] Reintento {attempt + 1} para lote de {len(batch_paths)} fotos...")

            response = gemini_client.models.generate_content(
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


BATCH_SIZE = 25  # Máximo de fotos por lote para Gemini


def analyze_with_gemini(gemini_client, image_paths: List[Path],
                        gemini_model: str, logger: logging.Logger) -> dict:
    """
    Envía todas las fotos de baja/ a Gemini para análisis visual global.
    Si hay más de BATCH_SIZE fotos, las envía en lotes y combina resultados.
    Devuelve JSON con tags del proyecto, ratings y tags por foto.
    """
    total = len(image_paths)
    logger.info(f"  [Gemini] Análisis visual: {total} fotos...")

    if total <= BATCH_SIZE:
        # Cabe en un solo lote
        result = _gemini_batch(gemini_client, image_paths, GEMINI_GLOBAL_PROMPT,
                               gemini_model, logger)
        n_tags = len(result.get('foto_tags', []))
        n_project_tags = len(result.get('tags_proyecto', []))
        logger.info(f"  [Gemini] OK: {n_tags} fotos taggeadas, "
                   f"{n_project_tags} tags de proyecto")
        return result

    # Múltiples lotes
    logger.info(f"  [Gemini] Dividiendo en lotes de {BATCH_SIZE}...")
    all_foto_tags = []
    all_tags_proyecto = set()
    combined_ratings = {'foto_heroica': '', 'fotos_principales': [], 'fotos_apoyo': []}

    for i in range(0, total, BATCH_SIZE):
        batch = image_paths[i:i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(f"  [Gemini] Lote {batch_num}/{total_batches}: {len(batch)} fotos...")

        result = _gemini_batch(gemini_client, batch, GEMINI_GLOBAL_PROMPT,
                               gemini_model, logger)
        if not result:
            logger.warning(f"  [Gemini] Lote {batch_num} sin resultados, continuando...")
            continue

        # Acumular foto_tags
        all_foto_tags.extend(result.get('foto_tags', []))

        # Acumular tags de proyecto (unión)
        for tag in result.get('tags_proyecto', []):
            all_tags_proyecto.add(tag)

        # Acumular ratings
        ratings = result.get('ratings', {})
        if ratings.get('foto_heroica') and not combined_ratings['foto_heroica']:
            combined_ratings['foto_heroica'] = ratings['foto_heroica']
        combined_ratings['fotos_principales'].extend(ratings.get('fotos_principales', []))
        combined_ratings['fotos_apoyo'].extend(ratings.get('fotos_apoyo', []))

    logger.info(f"  [Gemini] OK total: {len(all_foto_tags)} fotos taggeadas, "
               f"{len(all_tags_proyecto)} tags de proyecto")

    return {
        'tags_proyecto': list(all_tags_proyecto),
        'ratings': combined_ratings,
        'foto_tags': all_foto_tags
    }


def analyze_with_claude(claude_client, image_paths: List[Path],
                        claude_model: str, logger: logging.Logger) -> dict:
    """
    Envía las mejores fotos a Claude para generar descripción editorial.
    Máximo 10 fotos para no exceder tokens.
    """
    paths = image_paths[:10]
    logger.info(f"  [Claude] Descripción editorial: {len(paths)} fotos...")

    # Construir payload
    content = []
    for p in paths:
        try:
            data = image_to_base64(p)
            content.append({
                'type': 'image',
                'source': {
                    'type': 'base64',
                    'media_type': 'image/jpeg',
                    'data': data
                }
            })
            content.append({
                'type': 'text',
                'text': f'[Foto: {p.name}]'
            })
        except Exception as e:
            logger.warning(f"  No se pudo adjuntar {p.name}: {e}")

    content.append({'type': 'text', 'text': CLAUDE_EDITORIAL_PROMPT})

    for attempt in range(3):
        try:
            if attempt > 0:
                logger.warning(f"  [Claude] Reintento {attempt + 1}...")

            response = claude_client.messages.create(
                model=claude_model,
                max_tokens=4000,
                messages=[{'role': 'user', 'content': content}]
            )

            raw = response.content[0].text.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'\s*```$', '', raw)
            result = json.loads(raw)

            desc = result.get('descripcion', '')
            word_count = len(desc.split())
            logger.info(f"  [Claude] OK: descripción {word_count} palabras")
            return result

        except Exception as e:
            logger.error(f"  [Claude] Error (intento {attempt + 1}): {e}")

    return {}


# =============================================================================
# PIPELINE PRINCIPAL
# =============================================================================

def analyze_folder(folder_path: str, config: dict, script_dir: Path,
                   logger: logging.Logger) -> dict:
    """
    Pipeline completo de análisis:
    1. Lee imágenes de baja/
    2. Extrae metadatos EXIF (web, año)
    3. Gemini: análisis visual global
    4. Selecciona mejores fotos según ratings de Gemini
    5. Claude: descripción editorial con las mejores
    6. Devuelve JSON combinado
    """
    target_folder = Path(folder_path)
    folder_name = target_folder.name
    baja_folder = target_folder / "baja"

    logger.info("=" * 60)
    logger.info(f"Analizando carpeta: {folder_name}")
    logger.info("=" * 60)

    # Verificar que existe baja/
    if not baja_folder.exists():
        logger.error(f"No se encontró la carpeta baja/ en {target_folder}")
        return {"ok": False, "message": f"No se encontró la carpeta baja/ en '{folder_name}'."}

    # Obtener imágenes
    image_paths = get_image_files(baja_folder)
    if not image_paths:
        logger.error(f"No se encontraron imágenes en baja/")
        return {"ok": False, "message": f"No se encontraron imágenes en baja/ de '{folder_name}'."}

    logger.info(f"  {len(image_paths)} imágenes encontradas en baja/")

    # Extraer metadatos EXIF
    alta_folder = target_folder / "alta"
    exif_source = alta_folder if alta_folder.exists() else baja_folder
    exif_data = read_exif_metadata(exif_source, logger)

    # --- PASO 1: Gemini — Análisis visual global ---
    ai_config = config.get('ai', {})
    gemini_key = ai_config.get('gemini_api_key') or os.environ.get('GEMINI_API_KEY', '')
    gemini_model = ai_config.get('gemini_model', 'gemini-2.0-flash')

    if not gemini_key:
        logger.error("GEMINI_API_KEY no configurada")
        return {"ok": False, "message": "API key de Gemini no configurada."}

    gemini = get_gemini_client(gemini_key)
    gemini_result = analyze_with_gemini(gemini, image_paths, gemini_model, logger)

    if not gemini_result:
        logger.error("Gemini no devolvió resultados")
        return {"ok": False, "message": "Error en el análisis visual con Gemini."}

    # --- Seleccionar mejores fotos para Claude ---
    ratings_data = gemini_result.get('ratings', {})
    heroica = ratings_data.get('foto_heroica', '')
    principales = ratings_data.get('fotos_principales', [])

    # Ordenar: heroica primero, luego principales, luego el resto
    best_stems = set()
    if heroica:
        best_stems.add(Path(heroica).stem)
    for f in principales:
        best_stems.add(Path(f).stem)

    best_paths = [p for p in image_paths if p.stem in best_stems]
    other_paths = [p for p in image_paths if p.stem not in best_stems]
    claude_paths = (best_paths + other_paths)[:10]

    # --- PASO 2: Claude — Descripción editorial ---
    claude_key = ai_config.get('claude_api_key') or os.environ.get('ANTHROPIC_API_KEY', '')
    claude_model = ai_config.get('claude_model', 'claude-sonnet-4-20250514')

    if not claude_key:
        logger.error("ANTHROPIC_API_KEY no configurada")
        return {"ok": False, "message": "API key de Claude no configurada."}

    claude = get_claude_client(claude_key)
    claude_result = analyze_with_claude(claude, claude_paths, claude_model, logger)

    # --- Construir resultado final ---
    # Asignar rating a cada foto
    foto_tags = gemini_result.get('foto_tags', [])
    for ft in foto_tags:
        fname = ft.get('filename', '')
        stem = Path(fname).stem
        if heroica and (fname == heroica or stem == Path(heroica).stem):
            ft['rating'] = 'heroica'
        elif any(stem == Path(f).stem or fname == f for f in principales):
            ft['rating'] = 'principal'
        else:
            ft['rating'] = 'apoyo'

    result = {
        "ok": True,
        "titulo": folder_name,
        "descripcion": claude_result.get('descripcion', ''),
        "tags": gemini_result.get('tags_proyecto', []),
        "web": exif_data.get('web', ''),
        "anio": exif_data.get('anio', ''),
        "foto_tags": foto_tags
    }

    logger.info(f"  Análisis completado: {len(foto_tags)} fotos, "
               f"{len(result['tags'])} tags proyecto")

    return result


# =============================================================================
# PROGRAMA PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Analizador IA de fotos de arquitectura para Synology NAS'
    )
    parser.add_argument(
        '--config', '-c',
        default='config.json',
        help='Ruta al archivo de configuración (default: config.json)'
    )
    parser.add_argument(
        '--folder', '-f',
        required=True,
        help='Carpeta a analizar (ruta absoluta o relativa a homes_base)'
    )

    args = parser.parse_args()

    # Determinar directorio del script
    script_dir = Path(__file__).parent.resolve()

    # Cargar configuración
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = script_dir / config_path

    if not config_path.exists():
        print(f"ERROR: No se encuentra el archivo de configuración: {config_path}")
        sys.exit(1)

    config = load_config(config_path)
    logger = setup_logging(config, script_dir)

    # Resolver ruta de la carpeta
    folder_path = Path(args.folder)
    if not folder_path.is_absolute():
        homes_base = Path(config['paths']['homes_base'])
        folder_path = homes_base / args.folder

    if not folder_path.exists():
        summary = {
            "ok": False,
            "message": f"No se encontró la carpeta '{args.folder}'."
        }
        print(f"##AI_RESULT## {json.dumps(summary, ensure_ascii=False)}")
        sys.exit(1)

    # Ejecutar análisis
    result = analyze_folder(str(folder_path), config, script_dir, logger)

    # Imprimir resultado para que el servicio Node lo capture
    print(f"##AI_RESULT## {json.dumps(result, ensure_ascii=False)}")

    if not result.get('ok', False):
        sys.exit(1)

    logger.info("AI Analyzer finalizado")


if __name__ == '__main__':
    main()
