import base64
import uuid
import time
import logging
from collections import defaultdict
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv

load_dotenv()

from models import (
    SuccessResponse,
    AnalysisData,
    ImageMetadata,
    PublicContext,
    ScrapingError,
    ErrorResponse,
    ErrorDetail
)
from services.ocr import perform_ocr_on_image
from services.pdf import extract_text_from_pdf
from services.groq_service import analyze_with_groq
from services.url_service import fetch_post_metadata_and_image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Social Media Post Content Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]

rate_limit_store = defaultdict(list)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.url.path == "/api/analyze":
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < 600]
        if len(rate_limit_store[client_ip]) >= 10:
            return JSONResponse(
                status_code=429,
                content={"ok": False, "requestId": "", "error": {"code": "RATE_LIMITED", "message": "Too many requests. Please try again later.", "retryable": True}}
            )
        rate_limit_store[client_ip].append(now)
    return await call_next(request)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content={"ok": False, "requestId": "", "error": {"code": "INTERNAL_ERROR", "message": "An unexpected server error occurred.", "retryable": True}}
    )

def verify_image_bytes(data: bytes):
    from io import BytesIO
    from PIL import Image
    with Image.open(BytesIO(data)) as img:
        img.verify()
        if img.format.lower() not in ['jpeg', 'png', 'webp', 'gif']:
            raise ValueError("Unsupported format")

@app.post("/api/analyze")
async def analyze(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    req_id = str(uuid.uuid4())
    content_type = request.headers.get("content-type", "")

    try:
        # PATH 1: Social Media URL Analysis (JSON Payload)
        if "application/json" in content_type:
            body = await request.json()
            url = body.get("url")
            if not url:
                raise HTTPException(status_code=400, detail="Missing 'url' field in request JSON.")

            platform, public_ctx, image_bytes, img_content_type, warnings = await fetch_post_metadata_and_image(url)

            extracted_text = ""
            image_b64 = ""
            image_metadata = None

            if image_bytes:
                extracted_text = await run_in_threadpool(perform_ocr_on_image, image_bytes)
                image_b64 = base64.b64encode(image_bytes).decode("utf-8")
                image_metadata = ImageMetadata(
                    contentType=img_content_type,
                    bytes=len(image_bytes)
                )

            if public_ctx.get("caption"):
                extracted_text = f"Post Caption:\n{public_ctx['caption']}\n\n" + extracted_text
            
            if not extracted_text and not image_b64:
                raise ScrapingError("NO_PUBLIC_MEDIA", "No analyzable text or image could be extracted.", platform)

            report = await run_in_threadpool(
                analyze_with_groq,
                image_base64=image_b64,
                content_type=img_content_type if image_bytes else "text/plain",
                extracted_text=extracted_text
            )

            return SuccessResponse(
                requestId=req_id,
                data=AnalysisData(
                    sourceType="url",
                    platform=platform,
                    canonicalPostUrl=url,
                    mediaType="image" if image_bytes else "text",
                    image=image_metadata,
                    publicContext=PublicContext(
                        authorLabel=public_ctx.get("authorLabel"),
                        caption=public_ctx.get("caption"),
                        altText=public_ctx.get("altText")
                    ),
                    analysis=report,
                    warnings=warnings
                )
            )

        # PATH 2: Direct File Upload (Multipart Form Data)
        elif file is not None:
            if file.content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=415,
                    detail=f"Unsupported media type: {file.content_type}. Allowed: {ALLOWED_MIME_TYPES}"
                )

            # Read file in chunks to prevent memory bomb
            file_bytes_arr = bytearray()
            while chunk := await file.read(1024 * 1024):
                file_bytes_arr.extend(chunk)
                if len(file_bytes_arr) > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File too large. Maximum size is 20MB.")
            file_bytes = bytes(file_bytes_arr)
            
            if len(file_bytes) == 0:
                raise HTTPException(status_code=400, detail="Uploaded file is empty.")

            image_b64 = ""
            extracted_text = ""

            if file.content_type == "application/pdf":
                if not file_bytes.startswith(b"%PDF"):
                    raise HTTPException(status_code=415, detail="Invalid PDF file structure.")
                extracted_text = await run_in_threadpool(extract_text_from_pdf, file_bytes)
            else:
                try:
                    await run_in_threadpool(verify_image_bytes, file_bytes)
                except Exception:
                    raise HTTPException(status_code=415, detail="Invalid or unsupported image file.")
                
                image_b64 = base64.b64encode(file_bytes).decode("utf-8")
                extracted_text = await run_in_threadpool(perform_ocr_on_image, file_bytes)

            report = await run_in_threadpool(
                analyze_with_groq,
                image_base64=image_b64,
                content_type=file.content_type,
                extracted_text=extracted_text
            )

            return SuccessResponse(
                requestId=req_id,
                data=AnalysisData(
                    sourceType="file",
                    platform="file",
                    canonicalPostUrl="",
                    mediaType="pdf" if file.content_type == "application/pdf" else "image",
                    image=ImageMetadata(
                        contentType=file.content_type,
                        bytes=len(file_bytes)
                    ),
                    publicContext=PublicContext(),
                    analysis=report,
                    warnings=[]
                )
            )

        else:
            raise HTTPException(status_code=400, detail="Must provide either a JSON payload with 'url' or a file upload.")

    except ScrapingError as se:
        return ErrorResponse(
            ok=False,
            requestId=req_id,
            error=ErrorDetail(code=se.code, message=se.message, retryable=se.code in ["RATE_LIMITED", "NETWORK_ERROR"])
        )
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
