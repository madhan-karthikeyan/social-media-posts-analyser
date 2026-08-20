import pytesseract
from PIL import Image, ImageOps
import io

def perform_ocr_on_image(image_bytes: bytes) -> str:
    """
    Extracts text from an image using pytesseract.
    Downscales large images and fixes EXIF orientation for better OCR performance.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image)
        
        # Downscale if massive to save OCR CPU time
        MAX_DIMENSION = 1600
        if max(image.width, image.height) > MAX_DIMENSION:
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

        text = pytesseract.image_to_string(image)
        return text.strip()
    except pytesseract.TesseractNotFoundError:
        print("[Warning] Tesseract binary not found on system. Skipping local OCR extraction.")
        return ""
    except Exception as e:
        print(f"[Warning] OCR failed: {e}")
        return ""
