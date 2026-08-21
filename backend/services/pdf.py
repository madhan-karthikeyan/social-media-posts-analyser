import fitz  # PyMuPDF
import logging
import pymupdf4llm
from services.ocr import perform_ocr_on_image

logger = logging.getLogger(__name__)

MAX_PDF_PAGES = 20
MAX_TEXT_LENGTH = 4000

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extracts text from a PDF file using PyMuPDF4LLM Markdown parsing combined with
    page-by-page OCR screening for embedded images and scanned text.
    """
    combined_parts = []
    
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        if len(doc) > MAX_PDF_PAGES:
            doc.delete_pages(from_page=MAX_PDF_PAGES, to_page=len(doc) - 1)
            
        md_text = pymupdf4llm.to_markdown(doc)
        if md_text and md_text.strip():
            combined_parts.append("### Structured Markdown Content from PDF:\n" + md_text.strip())

        ocr_texts = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            # If the page has very little real text, assume it's a scan and OCR it
            if len(text.strip()) < 50:
                pix = page.get_pixmap(dpi=150)
                image_bytes = pix.tobytes("png")
                ocr_result = perform_ocr_on_image(image_bytes)
                if ocr_result and len(ocr_result.strip()) > 10:
                    ocr_texts.append(f"--- Page {page_num + 1} OCR Text ---\n{ocr_result.strip()}")
                    
        if ocr_texts:
            combined_parts.append("### OCR Extracted Text from Scanned Pages:\n" + "\n\n".join(ocr_texts))
            
        doc.close()
    except Exception as e:
        logger.error(f"PDF Extraction Error: {e}")
        
    final_text = "\n\n".join(combined_parts)
    if not final_text.strip():
        raise ValueError("The uploaded PDF contains no extractable text or readable scanned content.")
        
    if len(final_text) > MAX_TEXT_LENGTH:
        final_text = final_text[:MAX_TEXT_LENGTH] + "\n\n[TRUNCATED: PDF content exceeded analysis limits]"

    return final_text
