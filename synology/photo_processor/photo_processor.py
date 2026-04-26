#!/usr/bin/env python3
"""
Photo Processor v3 para Synology NAS
Procesa carpetas de fotos: mueve originales a alta/ y genera versiones baja/, baja_ma/, min/.
Acepta cualquier nombre de carpeta.

Autor: MockLab
Versión: 3.0.0
"""

import os
import sys
import json
import shutil
import logging
import argparse
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Tuple, Dict

try:
    from PIL import Image, ImageFilter, ImageDraw, ImageFont, ImageCms
except ImportError:
    print("ERROR: Pillow no está instalado. Ejecuta: python3 -m pip install --user Pillow")
    sys.exit(1)

try:
    from wand.image import Image as WandImage
    WAND_AVAILABLE = True
except ImportError:
    WAND_AVAILABLE = False


# =============================================================================
# CONFIGURACIÓN Y LOGGING
# =============================================================================

def load_config(config_path: str) -> dict:
    """Carga la configuración desde el archivo JSON."""
    with open(config_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def setup_logging(config: dict, script_dir: Path) -> logging.Logger:
    """Configura el sistema de logging."""
    log_file = script_dir / config['logging']['log_file']

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
# GESTIÓN DE ESTADO
# =============================================================================

class StateManager:
    """Gestiona el estado de carpetas procesadas y en espera."""

    def __init__(self, state_file: Path):
        self.state_file = state_file
        self.state = self._load_state()

    def _load_state(self) -> dict:
        """Carga el estado desde el archivo."""
        if self.state_file.exists():
            with open(self.state_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {
            'processed': {},
            'pending': {},
            'errors': {}
        }

    def save(self):
        """Guarda el estado en el archivo."""
        with open(self.state_file, 'w', encoding='utf-8') as f:
            json.dump(self.state, f, indent=2, default=str)

    def is_processed(self, folder_id: str) -> bool:
        """Verifica si una carpeta ya fue procesada."""
        return folder_id in self.state['processed']

    def mark_processed(self, folder_id: str):
        """Marca una carpeta como procesada."""
        self.state['processed'][folder_id] = datetime.now().isoformat()
        if folder_id in self.state['pending']:
            del self.state['pending'][folder_id]
        self.save()

    def update_pending(self, folder_id: str, last_modified: datetime):
        """Actualiza la última modificación de una carpeta pendiente."""
        self.state['pending'][folder_id] = last_modified.isoformat()
        self.save()

    def mark_error(self, folder_id: str, error_msg: str):
        """Registra un error en el procesamiento."""
        self.state['errors'][folder_id] = {
            'timestamp': datetime.now().isoformat(),
            'message': error_msg
        }
        self.save()


# =============================================================================
# DETECCIÓN DE CARPETAS
# =============================================================================

def get_folder_last_modified(folder_path: Path, extensions: List[str]) -> Optional[datetime]:
    """
    Obtiene la fecha de modificación más reciente de los archivos en una carpeta.
    """
    latest = None

    for file_path in folder_path.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in extensions:
            mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if latest is None or mtime > latest:
                latest = mtime

    return latest


def has_image_files(folder_path: Path, extensions: List[str]) -> bool:
    """Verifica si una carpeta contiene archivos de imagen directamente (no en subcarpetas)."""
    for item in folder_path.iterdir():
        if item.is_file() and item.suffix.lower() in extensions:
            return True
    return False


def find_folders_to_process(
    homes_base: Path,
    config: dict,
    state_manager: StateManager,
    inactivity_hours: int,
    logger: logging.Logger
) -> List[Path]:
    """
    Busca carpetas con imágenes listas para procesar.
    Estructura: homes_base/usuario/carpeta_cualquiera/fotos.jpg
    """
    ready_folders = []
    now = datetime.now()
    inactivity_threshold = timedelta(hours=inactivity_hours)

    all_extensions = config['file_extensions']['images']
    ignored_folders = config.get('ignored_folders', [])
    # Nombres reservados para subcarpetas generadas
    output_folders = {'alta', 'baja', 'baja_ma', 'min'}

    if not homes_base.exists():
        logger.error(f"La ruta base de homes no existe: {homes_base}")
        return []

    # Recorrer carpetas de usuarios
    for user_folder in homes_base.iterdir():
        if not user_folder.is_dir():
            continue

        if user_folder.name in ignored_folders or user_folder.name.startswith('.'):
            continue

        # Buscar carpetas dentro del usuario
        for target_folder in user_folder.iterdir():
            if not target_folder.is_dir():
                continue

            if target_folder.name.startswith('.') or target_folder.name in output_folders:
                continue

            folder_id = f"{user_folder.name}/{target_folder.name}"

            # Determinar dónde buscar imágenes: en alta/ si ya fue procesado, o en raíz
            alta_folder = target_folder / "alta"
            if alta_folder.exists():
                scan_folder = alta_folder
            elif has_image_files(target_folder, all_extensions):
                scan_folder = target_folder
            else:
                continue

            # Obtener última modificación
            last_modified = get_folder_last_modified(scan_folder, all_extensions)
            if last_modified is None:
                continue

            # Verificar si necesita procesamiento
            baja_folder = target_folder / "baja"
            needs_processing = False

            if not baja_folder.exists():
                needs_processing = True
            else:
                last_processed = state_manager.state['processed'].get(folder_id)
                if last_processed:
                    last_processed_dt = datetime.fromisoformat(last_processed)
                    if last_modified > last_processed_dt:
                        needs_processing = True
                        logger.debug(f"Cambios detectados en: {folder_id}")
                else:
                    needs_processing = True

            if not needs_processing:
                continue

            # Actualizar estado pendiente
            state_manager.update_pending(folder_id, last_modified)

            # Verificar si ha pasado suficiente tiempo de inactividad
            time_since_modified = now - last_modified
            if time_since_modified >= inactivity_threshold:
                logger.info(f"Carpeta lista para procesar: {folder_id} "
                           f"(última modificación: {last_modified})")
                ready_folders.append(target_folder)
            else:
                remaining = inactivity_threshold - time_since_modified
                logger.info(f"Carpeta pendiente: {folder_id} "
                           f"(esperar {remaining.seconds // 60} minutos más)")

    return ready_folders


# =============================================================================
# SINCRONIZACIÓN DE CARPETAS
# =============================================================================

def sync_folders(
    alta_folder: Path,
    baja_folder: Path,
    baja_ma_folder: Path,
    min_folder: Path,
    config: dict,
    script_dir: Path,
    logger: logging.Logger
) -> bool:
    """
    Sincroniza las carpetas baja/, baja_ma/ y min/ con alta/.
    - Elimina fotos que ya no existen en alta/
    - Añade fotos nuevas que faltan en baja/baja_ma/min/

    Returns:
        True si hubo cambios, False si todo estaba sincronizado
    """
    changes_made = False

    # Obtener archivos en cada carpeta
    alta_files = {f.stem: f for f in alta_folder.glob('*.jpg')}
    alta_files.update({f.stem: f for f in alta_folder.glob('*.JPG')})

    baja_files = {f.stem for f in baja_folder.glob('*.jpg')}
    baja_files.update({f.stem for f in baja_folder.glob('*.JPG')})

    baja_ma_files = {f.stem for f in baja_ma_folder.glob('*.jpg')}
    baja_ma_files.update({f.stem for f in baja_ma_folder.glob('*.JPG')})

    min_files = {f.stem for f in min_folder.glob('*.jpg')} if min_folder.exists() else set()
    min_files.update({f.stem for f in min_folder.glob('*.JPG')} if min_folder.exists() else set())

    alta_stems = set(alta_files.keys())

    # Crear carpeta min/ si no existe
    min_folder.mkdir(parents=True, exist_ok=True)

    # 1. Eliminar fotos que ya no existen en alta/
    for stem in baja_files - alta_stems:
        file_to_delete = baja_folder / f"{stem}.jpg"
        if file_to_delete.exists():
            file_to_delete.unlink()
            logger.info(f"  Eliminado de baja/: {stem}.jpg")
            changes_made = True

    for stem in baja_ma_files - alta_stems:
        file_to_delete = baja_ma_folder / f"{stem}.jpg"
        if file_to_delete.exists():
            file_to_delete.unlink()
            logger.info(f"  Eliminado de baja_ma/: {stem}.jpg")
            changes_made = True

    for stem in min_files - alta_stems:
        file_to_delete = min_folder / f"{stem}.jpg"
        if file_to_delete.exists():
            file_to_delete.unlink()
            logger.info(f"  Eliminado de min/: {stem}.jpg")
            changes_made = True

    # 2. Añadir fotos nuevas que faltan
    for stem in alta_stems - baja_files:
        alta_path = alta_files[stem]
        logger.info(f"  Nueva foto detectada: {stem}.jpg")

        img = load_image(alta_path, logger)
        if img is None:
            continue

        img_baja = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
        img_baja = apply_sharpening(img_baja, config)
        img_baja = convert_to_srgb(img_baja, logger)

        baja_output = baja_folder / f"{stem}.jpg"
        save_as_jpeg(img_baja, baja_output,
                    config['processing']['jpeg_quality_web'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)
        copy_metadata_with_exiftool(alta_path, baja_output, logger)
        logger.info(f"  Añadido a baja/: {stem}.jpg")
        changes_made = True

    for stem in alta_stems - baja_ma_files:
        alta_path = alta_files[stem]

        img = load_image(alta_path, logger)
        if img is None:
            continue

        img_baja_ma = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
        img_baja_ma = apply_sharpening(img_baja_ma, config)
        img_baja_ma = convert_to_srgb(img_baja_ma, logger)
        img_baja_ma = add_watermark(img_baja_ma, stem, config, script_dir, logger)

        baja_ma_output = baja_ma_folder / f"{stem}.jpg"
        save_as_jpeg(img_baja_ma, baja_ma_output,
                    config['processing']['jpeg_quality_web'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)
        copy_metadata_with_exiftool(alta_path, baja_ma_output, logger)
        logger.info(f"  Añadido a baja_ma/: {stem}.jpg")
        changes_made = True

    for stem in alta_stems - min_files:
        alta_path = alta_files[stem]

        img = load_image(alta_path, logger)
        if img is None:
            continue

        img_min = resize_to_long_edge(img.copy(), config['processing']['min_long_edge'])
        img_min = convert_to_srgb(img_min, logger)

        min_output = min_folder / f"{stem}.jpg"
        save_as_jpeg(img_min, min_output,
                    config['processing']['jpeg_quality_min'],
                    dpi=config['processing']['dpi_web'],
                    logger=logger)
        logger.info(f"  Añadido a min/: {stem}.jpg")
        changes_made = True

    return changes_made


# =============================================================================
# PROCESAMIENTO DE IMÁGENES
# =============================================================================

def get_image_files(folder: Path, extensions: List[str]) -> List[Path]:
    """Obtiene lista de archivos de imagen ordenados (solo nivel directo, no subcarpetas)."""
    files = []
    for ext in extensions:
        files.extend(folder.glob(f"*{ext}"))
        files.extend(folder.glob(f"*{ext.upper()}"))
    return sorted(files, key=lambda x: x.name.lower())


def load_image(file_path: Path, logger: logging.Logger) -> Optional[Image.Image]:
    """
    Carga una imagen desde cualquier formato soportado.
    """
    try:
        suffix = file_path.suffix.lower()

        if suffix == '.psd':
            if WAND_AVAILABLE:
                with WandImage(filename=str(file_path)) as wand_img:
                    wand_img.merge_layers('flatten')
                    png_blob = wand_img.make_blob('png')
                    from io import BytesIO
                    return Image.open(BytesIO(png_blob))
            else:
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
    """Aplica enfoque para pantalla."""
    sharpening = config['processing']['sharpening']
    return img.filter(ImageFilter.UnsharpMask(
        radius=sharpening['radius'],
        percent=sharpening['percent'],
        threshold=sharpening['threshold']
    ))


def resize_to_long_edge(img: Image.Image, long_edge: int) -> Image.Image:
    """Redimensiona la imagen para que el lado largo sea el especificado."""
    width, height = img.size

    if width >= height:
        new_width = long_edge
        new_height = int(height * (long_edge / width))
    else:
        new_height = long_edge
        new_width = int(width * (long_edge / height))

    return img.resize((new_width, new_height), Image.Resampling.LANCZOS)


def convert_to_srgb(img: Image.Image, logger: logging.Logger) -> Image.Image:
    """Convierte una imagen a espacio de color sRGB."""
    from io import BytesIO
    try:
        icc_profile = img.info.get('icc_profile')

        if icc_profile:
            srgb_profile = ImageCms.createProfile('sRGB')
            input_profile = ImageCms.ImageCmsProfile(BytesIO(icc_profile))
            img = ImageCms.profileToProfile(
                img, input_profile, srgb_profile,
                outputMode='RGB'
            )
        return img
    except Exception as e:
        logger.warning(f"No se pudo convertir perfil de color: {e}")
        return img


def add_watermark(
    img: Image.Image,
    ref: str,
    config: dict,
    script_dir: Path,
    logger: logging.Logger
) -> Image.Image:
    """Añade marca de agua a la imagen con sombra y tamaño proporcional a la diagonal."""
    try:
        watermark_config = config['watermark']

        import math
        diagonal = math.sqrt(img.width ** 2 + img.height ** 2)
        base_font_size = diagonal * watermark_config['font_size_percent'] / 100

        aspect_ratio = img.width / img.height
        if aspect_ratio < 1:
            correction = 1.25
        elif aspect_ratio <= 1.3:
            correction = 1.15
        elif aspect_ratio <= 1.6:
            correction = 1.0
        else:
            correction = 0.95

        font_size = int(base_font_size * correction)
        font_size = max(font_size, 10)

        font_path = script_dir / watermark_config['font']
        if font_path.exists():
            font = ImageFont.truetype(str(font_path), font_size)
        else:
            try:
                font = ImageFont.truetype(watermark_config['font'], font_size)
            except:
                logger.warning("Fuente no encontrada, usando fuente por defecto")
                font = ImageFont.load_default()

        line1 = watermark_config['line1_template']
        line2 = watermark_config['line2_template'].format(ref=ref)

        margin = int(img.width * watermark_config['margin_percent'] / 100)
        margin = max(margin, 10)

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

        shadow_opacity = int(255 * watermark_config['shadow_opacity'])
        shadow_color = tuple(watermark_config['shadow_color']) + (shadow_opacity,)
        text_opacity = int(255 * watermark_config['opacity'])
        text_color = tuple(watermark_config['color']) + (text_opacity,)
        shadow_offset = watermark_config['shadow_offset']

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


def save_as_jpeg(
    img: Image.Image,
    output_path: Path,
    quality: int,
    dpi: int = 72,
    logger: logging.Logger = None
):
    """Guarda la imagen como JPEG."""
    try:
        save_params = {
            'quality': quality,
            'optimize': True,
            'dpi': (dpi, dpi),
        }
        img.save(output_path, 'JPEG', **save_params)
    except Exception as e:
        if logger:
            logger.error(f"Error guardando imagen {output_path}: {e}")
        raise


def copy_metadata_with_exiftool(source_path: Path, dest_path: Path, logger: logging.Logger):
    """Copia todos los metadatos EXIF/IPTC de origen a destino usando exiftool."""
    try:
        cmd = [
            'perl', '/usr/local/bin/exiftool',
            '-TagsFromFile', str(source_path),
            '-all:all',
            '-overwrite_original',
            str(dest_path)
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning(f"Exiftool warning: {result.stderr}")
    except Exception as e:
        logger.error(f"Error copiando metadatos: {e}")


# =============================================================================
# PROCESAMIENTO DE CARPETA
# =============================================================================

def process_folder(
    target_folder: Path,
    config: dict,
    state_manager: StateManager,
    script_dir: Path,
    logger: logging.Logger
) -> bool:
    """
    Procesa una carpeta de fotos:
    - Primera vez: mueve originales a alta/, genera baja/, baja_ma/, min/
    - Ya procesado: sincroniza diferencias
    """
    folder_name = target_folder.name
    folder_id = f"{target_folder.parent.name}/{folder_name}"

    logger.info("=" * 60)
    logger.info(f"Procesando carpeta: {folder_id}")
    logger.info("=" * 60)

    try:
        # Carpetas de salida
        alta_folder = target_folder / "alta"
        baja_folder = target_folder / "baja"
        baja_ma_folder = target_folder / "baja_ma"
        min_folder = target_folder / "min"

        # Verificar si ya fue procesado (existe alta/ y baja/)
        already_processed = alta_folder.exists() and baja_folder.exists()

        if already_processed:
            # Modo sincronización: solo actualizar diferencias
            logger.info("Carpeta ya procesada, sincronizando cambios...")

            changes = sync_folders(
                alta_folder, baja_folder, baja_ma_folder, min_folder,
                config, script_dir, logger
            )

            if changes:
                logger.info(f"Sincronización completada con cambios: {folder_name}")
                msg = f"Carpeta '{folder_name}' sincronizada con nuevos cambios."
            else:
                logger.info(f"Sin cambios detectados: {folder_name}")
                msg = f"Carpeta '{folder_name}' sincronizada. Sin cambios nuevos."

            summary = {"ok": True, "message": msg}
            print(f"##SUMMARY## {json.dumps(summary)}")

            state_manager.mark_processed(folder_id)
            return True

        # --- Primera vez: procesamiento completo ---

        # Obtener imágenes de la raíz de la carpeta
        image_files = get_image_files(target_folder, config['file_extensions']['images'])

        if not image_files:
            logger.warning(f"No se encontraron imágenes en: {target_folder}")
            summary = {"ok": False, "message": f"No se encontraron imágenes en '{folder_name}'."}
            print(f"##SUMMARY## {json.dumps(summary)}")
            return False

        logger.info(f"Encontradas {len(image_files)} imágenes para procesar")

        # Crear carpetas de salida
        alta_folder.mkdir(parents=True, exist_ok=True)
        baja_folder.mkdir(parents=True, exist_ok=True)
        baja_ma_folder.mkdir(parents=True, exist_ok=True)
        min_folder.mkdir(parents=True, exist_ok=True)
        logger.info("Carpetas creadas: alta/, baja/, baja_ma/, min/")

        # Procesar cada imagen
        processed_count = 0
        for idx, img_path in enumerate(image_files, start=1):
            original_name = img_path.stem
            logger.info(f"Procesando imagen {idx}/{len(image_files)}: {img_path.name}")

            # Cargar imagen
            img = load_image(img_path, logger)
            if img is None:
                logger.error(f"No se pudo cargar: {img_path}")
                continue

            # 1. Mover/convertir original a alta/
            alta_output = alta_folder / f"{original_name}.jpg"
            original_was_jpg = img_path.suffix.lower() in ['.jpg', '.jpeg']

            if original_was_jpg:
                shutil.move(str(img_path), str(alta_output))
                logger.info(f"  -> alta/{alta_output.name} (movido)")
            else:
                # Convertir a JPG máxima calidad
                save_as_jpeg(img.copy(), alta_output,
                            config['processing']['jpeg_quality_high'],
                            dpi=config['processing']['dpi_high'],
                            logger=logger)
                copy_metadata_with_exiftool(img_path, alta_output, logger)
                img_path.unlink()
                logger.info(f"  -> alta/{alta_output.name} (convertido)")

            # 2. Versión baja (redimensionada, enfoque, sRGB)
            img_baja = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
            img_baja = apply_sharpening(img_baja, config)
            img_baja = convert_to_srgb(img_baja, logger)

            baja_output = baja_folder / f"{original_name}.jpg"
            save_as_jpeg(img_baja, baja_output,
                        config['processing']['jpeg_quality_web'],
                        dpi=config['processing']['dpi_web'],
                        logger=logger)
            copy_metadata_with_exiftool(alta_output, baja_output, logger)
            logger.info(f"  -> baja/{baja_output.name}")

            # 3. Versión baja con marca de agua
            img_baja_ma = resize_to_long_edge(img.copy(), config['processing']['web_long_edge'])
            img_baja_ma = apply_sharpening(img_baja_ma, config)
            img_baja_ma = convert_to_srgb(img_baja_ma, logger)
            img_baja_ma = add_watermark(img_baja_ma, original_name, config, script_dir, logger)

            baja_ma_output = baja_ma_folder / f"{original_name}.jpg"
            save_as_jpeg(img_baja_ma, baja_ma_output,
                        config['processing']['jpeg_quality_web'],
                        dpi=config['processing']['dpi_web'],
                        logger=logger)
            copy_metadata_with_exiftool(alta_output, baja_ma_output, logger)
            logger.info(f"  -> baja_ma/{baja_ma_output.name}")

            # 4. Versión miniatura
            img_min = resize_to_long_edge(img.copy(), config['processing']['min_long_edge'])
            img_min = convert_to_srgb(img_min, logger)

            min_output = min_folder / f"{original_name}.jpg"
            save_as_jpeg(img_min, min_output,
                        config['processing']['jpeg_quality_min'],
                        dpi=config['processing']['dpi_web'],
                        logger=logger)
            logger.info(f"  -> min/{min_output.name}")

            processed_count += 1

        # Marcar como procesado
        state_manager.mark_processed(folder_id)

        logger.info(f"Carpeta procesada exitosamente: {folder_name}")

        summary = {
            "ok": True,
            "message": f"Carpeta '{folder_name}' procesada correctamente. "
                       f"{processed_count} imágenes procesadas."
        }
        print(f"##SUMMARY## {json.dumps(summary)}")

        return True

    except Exception as e:
        logger.error(f"Error procesando carpeta {folder_name}: {e}")
        import traceback
        logger.error(traceback.format_exc())

        state_manager.mark_error(folder_id, str(e))

        summary = {
            "ok": False,
            "message": f"Error al procesar la carpeta '{folder_name}'. Revisa los logs para más detalles."
        }
        print(f"##SUMMARY## {json.dumps(summary)}")

        return False


# =============================================================================
# PROGRAMA PRINCIPAL
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Procesador de fotos v3 para Synology NAS'
    )
    parser.add_argument(
        '--config', '-c',
        default='config.json',
        help='Ruta al archivo de configuración (default: config.json)'
    )
    parser.add_argument(
        '--force', '-f',
        metavar='FOLDER',
        help='Forzar procesamiento de una carpeta específica (ruta relativa: usuario/carpeta)'
    )
    parser.add_argument(
        '--dry-run', '-n',
        action='store_true',
        help='Mostrar qué se procesaría sin hacer cambios'
    )
    parser.add_argument(
        '--status', '-s',
        action='store_true',
        help='Mostrar estado de carpetas pendientes y procesadas'
    )
    parser.add_argument(
        '--reset',
        metavar='FOLDER_ID',
        help='Reiniciar estado de una carpeta para reprocesar'
    )
    parser.add_argument(
        '--now', '--process-all',
        action='store_true',
        dest='now',
        help='Procesar todas las carpetas pendientes inmediatamente'
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

    # Configurar logging
    logger = setup_logging(config, script_dir)

    # Inicializar gestor de estado
    state_file = script_dir / config['logging']['state_file']
    state_manager = StateManager(state_file)

    logger.info("=" * 60)
    logger.info("Photo Processor v3 iniciado")
    logger.info(f"Configuración: {config_path}")
    logger.info("=" * 60)

    # Comando: mostrar estado
    if args.status:
        print("\n=== ESTADO DE CARPETAS ===\n")
        print("PROCESADAS:")
        for fid, timestamp in state_manager.state['processed'].items():
            print(f"  ✓ {fid} ({timestamp})")
        print("\nPENDIENTES:")
        for fid, timestamp in state_manager.state['pending'].items():
            print(f"  ⏳ {fid} (última modificación: {timestamp})")
        print("\nERRORES:")
        for fid, error in state_manager.state['errors'].items():
            print(f"  ✗ {fid}: {error['message']} ({error['timestamp']})")
        sys.exit(0)

    # Comando: reiniciar estado
    if args.reset:
        fid = args.reset
        if fid in state_manager.state['processed']:
            del state_manager.state['processed'][fid]
            state_manager.save()
            print(f"Estado reiniciado para: {fid}")
        else:
            print(f"Carpeta no encontrada en procesados: {fid}")
        sys.exit(0)

    # Buscar carpetas para procesar
    homes_base = Path(config['paths']['homes_base'])
    inactivity_hours = 0 if args.now else config['processing']['inactivity_hours']

    if args.now:
        logger.info("Modo inmediato: procesando todas las carpetas sin esperar")

    if args.force:
        # Procesar carpeta específica: --force "usuario/carpeta"
        logger.info(f"Modo forzado: buscando carpeta '{args.force}'")
        target_folder = homes_base / args.force

        if not target_folder.exists():
            logger.error(f"No se encontró la carpeta: {target_folder}")
            summary = {
                "ok": False,
                "message": f"No se encontró la carpeta '{args.force}'."
            }
            print(f"##SUMMARY## {json.dumps(summary)}")
            sys.exit(1)

        if args.dry_run:
            print(f"[DRY-RUN] Se procesaría: {target_folder}")
        else:
            process_folder(target_folder, config, state_manager, script_dir, logger)
    else:
        # Buscar todas las carpetas listas
        ready_folders = find_folders_to_process(
            homes_base, config, state_manager, inactivity_hours, logger
        )

        if not ready_folders:
            logger.info("No hay carpetas listas para procesar")
        else:
            logger.info(f"Carpetas listas para procesar: {len(ready_folders)}")

            for target_folder in ready_folders:
                if args.dry_run:
                    print(f"[DRY-RUN] Se procesaría: {target_folder}")
                else:
                    process_folder(target_folder, config, state_manager, script_dir, logger)

    logger.info("Photo Processor v3 finalizado")


if __name__ == '__main__':
    main()
