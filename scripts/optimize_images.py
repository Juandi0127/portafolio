"""
Optimiza imágenes para el portafolio: WebP, colores sRGB y sin metadatos
(las fotos del celular pueden traer la ubicación GPS; aquí se eliminan).

Uso:
    python scripts/optimize_images.py <imagen o PDF> <destino-sin-extensión> [--rotar 90]

Ejemplo (un certificado nuevo):
    python scripts/optimize_images.py "C:/Users/vaneg/Downloads/certificado.pdf" static/img/certs/hackaton-2027

Genera dos archivos:
    static/img/certs/hackaton-2027.webp      grande (máx. 1600 px), se abre en el visor
    static/img/certs/hackaton-2027-sm.webp   720 px de ancho, se usa en las tarjetas

Requiere Pillow (pip install pillow). Para PDF, además PyMuPDF (pip install pymupdf).
"""
import argparse
import io
from pathlib import Path

from PIL import Image, ImageCms, ImageOps

FULL_MAX = 1600
SMALL_WIDTH = 720


def _to_srgb(img, icc):
    """Las fotos de iPhone vienen en Display P3: sin convertir se verían apagadas."""
    if not icc:
        return img
    try:
        source = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        return ImageCms.profileToProfile(img, source, ImageCms.createProfile("sRGB"), outputMode=img.mode)
    except Exception:
        return img


def _open(src, rotate=0):
    src = Path(src)
    if src.suffix.lower() == ".pdf":
        try:
            import pymupdf as fitz
        except ImportError:
            import fitz
        page = fitz.open(src)[0]
        zoom = 2000 / max(page.rect.width, page.rect.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img, icc = Image.frombytes("RGB", (pix.width, pix.height), pix.samples), None
    else:
        img = Image.open(src)
        icc = img.info.get("icc_profile")
        img = ImageOps.exif_transpose(img)

    alpha = img.mode in ("RGBA", "LA", "PA") or (img.mode == "P" and "transparency" in img.info)
    img = _to_srgb(img.convert("RGBA" if alpha else "RGB"), icc)
    if rotate:
        img = img.rotate(rotate, expand=True)  # grados en sentido antihorario
    return img


def _save(img, path, quality):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=quality, method=6)
    return path.stat().st_size


def export(src, dest, *, rotate=0, full_max=FULL_MAX, small_width=SMALL_WIDTH,
           quality=80, small_quality=74, image=None):
    """Guarda <dest>.webp y <dest>-sm.webp. Devuelve [(ruta, (ancho, alto), bytes)]."""
    dest = Path(dest)
    img = image if image is not None else _open(src, rotate)
    results = []

    full = img.copy()
    full.thumbnail((full_max, full_max), Image.LANCZOS)
    path = dest.parent / f"{dest.name}.webp"
    results.append((path, full.size, _save(full, path, quality)))

    if small_width:
        width = min(small_width, img.width)
        small = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
        path = dest.parent / f"{dest.name}-sm.webp"
        results.append((path, small.size, _save(small, path, small_quality)))
    return results


def main():
    parser = argparse.ArgumentParser(description="Convierte una imagen (o PDF) a WebP optimizado.")
    parser.add_argument("imagen")
    parser.add_argument("destino", help="ruta sin extensión, p. ej. static/img/certs/mi-certificado")
    parser.add_argument("--rotar", type=int, default=0, help="grados en sentido antihorario: 90, 180 o 270")
    args = parser.parse_args()
    for path, size, nbytes in export(args.imagen, args.destino, rotate=args.rotar):
        print(f"OK  {path}  {size[0]}x{size[1]}  {nbytes // 1024} KB")


if __name__ == "__main__":
    main()
