import os
import io
import logging
import requests
from PIL import Image

logger = logging.getLogger(__name__)

def perform_ocr_on_image(image_bytes: bytes) -> str:
    """
    Extracts text from an image using the free OCR.space API.
    Compresses and downscales images to ensure they remain under the 1MB free tier limit.
    """
    api_key = os.getenv("OCR_KEY")
    if not api_key:
        logger.warning("OCR_KEY environment variable is not set. Skipping OCR extraction.")
        return ""

    try:
        # Load the image and process it to ensure it's under 1MB
        image = Image.open(io.BytesIO(image_bytes))
        
        # Downscale if the image is massive
        MAX_DIMENSION = 1600
        if max(image.width, image.height) > MAX_DIMENSION:
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
            
        # Convert to JPEG and compress to fit within 1MB
        output = io.BytesIO()
        image.convert("RGB").save(output, format="JPEG", quality=85)
        
        compressed_bytes = output.getvalue()
        
        # Fallback loop if it's still > 1MB (1,048,576 bytes)
        quality = 85
        while len(compressed_bytes) > 1000000 and quality > 20:
            quality -= 10
            output = io.BytesIO()
            image.convert("RGB").save(output, format="JPEG", quality=quality)
            compressed_bytes = output.getvalue()

        if len(compressed_bytes) > 1000000:
            logger.warning("Could not compress image below 1MB. OCR.space will likely reject it.")
            
        url = "https://api.ocr.space/parse/image"
        payload = {
            'apikey': api_key,
            'language': 'eng',
            'scale': 'true',
            'OCREngine': '2' # Engine 2 is better for document/receipt scanning
        }
        
        files = {
            'file': ('image.jpg', compressed_bytes, 'image/jpeg')
        }

        response = requests.post(url, data=payload, files=files, timeout=30)
        
        if response.status_code != 200:
            logger.error(f"OCR.space API Error: HTTP {response.status_code}")
            return ""
            
        data = response.json()
        if data.get('IsErroredOnProcessing'):
            logger.error(f"OCR.space Processing Error: {data.get('ErrorMessage')}")
            return ""
            
        parsed_results = data.get('ParsedResults', [])
        if not parsed_results:
            return ""
            
        extracted_text = parsed_results[0].get('ParsedText', '').strip()
        return extracted_text

    except requests.exceptions.RequestException as e:
        logger.warning(f"OCR.space network failure: {e}")
        return ""
    except Exception as e:
        logger.warning(f"OCR processing failed: {e}")
        return ""
