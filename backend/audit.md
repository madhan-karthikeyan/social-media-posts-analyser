# Backend Audit Report — Social Media Content Analyzer

Date: 2026-08-20
Scope: `backend/` (FastAPI + Groq + OCR + PDF + URL scraping)

---

## 1. Actual execution trace (verified from code)

```
POST /api/analyze (main.py:39)
 ├─ PATH 1: content-type contains "application/json"
 │    request.json() → url string (main.py:49-53)
 │    fetch_post_metadata_and_image(url) — services/url_service.py:114
 │       normalize_url → detect_platform (regex) → httpx GET (follow_redirects=True, 15s)
 │       login-string check on final URL → status-code mapping → BeautifulSoup
 │       JSON-LD / OG-meta extraction → image download via same client
 │       returns 5-tuple (platform, dict, bytes|None, str, warnings)
 │    OCR on image bytes (sync, on event loop) → base64 → caption prepend (main.py:62-70)
 │    analyze_with_groq(image_b64, content_type, text) — services/groq_service.py:6 (sync)
 ├─ PATH 2: multipart file
 │    trusts file.content_type (main.py:101) → file.read() entire body → size check AFTER read (107-112)
 │    PDF → extract_text_from_pdf (services/pdf.py:7) — OCRs every page + markdown, sync
 │    image → base64 + OCR (sync)
 │    analyze_with_groq(...)
 └─ Response built inline; ScrapingError → ErrorResponse (HTTP 200!), HTTPException passthrough, ValueError → 400, Exception → 502 with str(e) (149-161)

Frontend contract (frontend/src/types/api.ts): envelope {ok, requestId, data|error{code,message,retryable}};
ErrorCode union of 20 codes; ImageMetadata requires width/height (backend does not send them).
```

---

## 2. Issues by severity

### Critical

#### C1 — No SSRF protection, unbounded redirects
- **File/location:** `services/url_service.py:132-171`
- **Current behavior:** `httpx.AsyncClient(follow_redirects=True)` fetches any page, and the image URL discovered in scraped HTML is fetched with the same client and no destination validation. Redirects followed up to the HTTPX default (20).
- **Why problematic:** The scraped HTML is attacker-influenced. A malicious/compromised post can point the backend at `http://169.254.169.254/...`, internal services, or localhost. Top security risk in the app (PRD §13 mandates SSRF protection; frontend even has an `SSRF_BLOCKED` code the backend never emits).
- **Recommended change:** SSRF-safe fetcher — HTTPS only; DNS-resolve + block loopback/private/link-local/multicast/reserved/metadata ranges; revalidate after each redirect (max 3); apply the same policy to image downloads.
- **Risk:** Security breach (metadata service / internal network access).
- **Priority:** P0

#### C2 — Prompt injection: untrusted content merged into instructions
- **File/location:** `services/groq_service.py:38-50`
- **Current behavior:** `"Extracted Text/Content from file:\n{extracted_text}"` — captions/OCR are concatenated inline with the system instructions.
- **Why problematic:** Source content (captions, OCR text, PDFs) can contain "ignore previous instructions" style payloads; the model has no boundary between instructions and material.
- **Recommended change:** Structured prompt with `<untrusted_source>` delimiters + explicit non-instruction declaration; strip control chars; sanitize text.
- **Risk:** Model hijack / data extraction.
- **Priority:** P0

#### C3 — LLM output accepted without real validation; failures misclassified
- **File/location:** `services/groq_service.py:79-88`, `main.py:149-161`
- **Current behavior:** `json.loads` + `AnalysisReport(**parsed_json)`. Any parse/validation failure is swallowed into `ValueError("Failed to analyze content with Groq")` → mapped to **HTTP 400** in main.py:158 → frontend shows "invalid URL". Provider outage/timeouts also become 400.
- **Why problematic:** Wrong classification (a dead provider is not a bad URL), no retry, no enum/length enforcement on `confidence`, `readability`, list sizes, no `AI_INVALID_OUTPUT` code.
- **Recommended change:** Explicit Groq timeout + bounded retry policy; map 429→`AI_QUOTA_EXCEEDED`, timeout→`AI_TIMEOUT`, 5xx/network→`AI_UPSTREAM_ERROR`, schema failures→`AI_INVALID_OUTPUT`; pydantic with `Field(max_length=…)`, `Literal` enums, min/max list lengths; prefer `response_format={"type":"json_schema"}` with json_object fallback.
- **Risk:** Wrong errors, no graceful degradation, hallucinated fields reach the frontend.
- **Priority:** P0

#### C4 — Blocking CPU work on the event loop
- **File/location:** `main.py:62,118,121`, `services/ocr.py:11-13`, `services/pdf.py:15-24`, `services/groq_service.py:62`
- **Current behavior:** Sync OCR, PDF rendering/OCR, and the sync Groq SDK call run directly inside the async route.
- **Why problematic:** A single request stalls the whole event loop; concurrent users serialize on each other. Under any load the app appears hung.
- **Recommended change:** `fastapi.concurrency.run_in_threadpool` (or `anyio.to_thread`) for OCR/PDF/Groq call.
- **Risk:** Reliability/throughput collapse.
- **Priority:** P0

#### C5 — File handling: trust + memory + no content validation
- **File/location:** `main.py:100-127`
- **Current behavior:** Client-supplied `file.content_type` decides the pipeline; `await file.read()` buffers the **entire** body in memory before the size check (a multi-GB upload is fully loaded); no magic-byte verification — a text file renamed `.pdf` or arbitrary bytes sent as `image/png` proceed to OCR/base64/Groq; decompression bombs not bounded (no pixel/dimension caps); SVG accepted via `image/svg+xml` in the URL flow.
- **Why problematic:** Memory exhaustion (DoS), garbage sent to paid LLM calls, no `INVALID_IMAGE`/`UNSUPPORTED_FILE_TYPE` path.
- **Recommended change:** Stream-read with cap; validate `%PDF` prefix and Pillow magic-bytes/format whitelist (JPEG/PNG/WEBP/GIF-still, reject SVG); enforce ≤20 MP and ≤20 MB; reject early with proper codes.
- **Risk:** Memory DoS + wasted LLM spend + corrupt analyses.
- **Priority:** P0

#### C6 — Internal error details exposed to clients; secrets-leak surface
- **File/location:** `main.py:160`
- **Current behavior:** `HTTPException(502, detail=f"Analysis engine error: {str(e)}")` returns raw exception text; `print()` used for all logging (no structured logging, no redaction policy).
- **Why problematic:** Stack traces / internal paths / provider details can reach the browser; PRD §13 requires no internal details in responses; logs must be redacted.
- **Recommended change:** Canonical error envelope via exception handlers; `logger.exception()` server-side only; redaction rules (no URLs with tokens, no image bytes, no prompts, no keys).
- **Risk:** Information disclosure.
- **Priority:** P0

### High

- **H1 — Instagram Reels accepted as analyzable** — `services/url_service.py:13` — `instagram\.com\/(p|reel)\/...` matches `/reel/` and the flow proceeds to fetch+LLM. PRD AC-003 requires video URLs rejected as `UNSUPPORTED_MEDIA` with **zero** Groq calls. Fix: reject reel/tv routes pre-fetch. Risk: spec violation + wasted LLM cost.
- **H2 — Route handler orchestrates the whole pipeline** — `main.py:39-147` — ~100 lines of extraction/business logic inside the route. Fix: thin route calling an `analysis` service that produces a canonical `SourceContent` model consumed by the LLM layer.
- **H3 — Error vocabulary diverges from the frontend contract** — `models.py:4-9`, `main.py:149-154` — Backend emits `LOGIN_REQUIRED`, `ACCESS_DENIED`, `NETWORK_ERROR`, `NO_PUBLIC_MEDIA`, `NO_PUBLIC_METADATA`; frontend expects `PRIVATE_OR_LOGIN_REQUIRED`, `PUBLIC_IMAGE_UNAVAILABLE`, `FETCH_TIMEOUT`, `SSRF_BLOCKED`, `AI_*`. `ScrapingError` responses return **HTTP 200** with `ok:false`. Fix: single error table mapping AppError → (status, code, retryable); align codes to frontend union.
- **H4 — No rate limiting, no concurrency cap, unbounded JSON body** — `main.py:49-53` — `request.json()` unbounded; PRD §13 requires per-IP 10 requests/10 min (memory-only). Fix: in-memory sliding-window rate limiter + semaphore + 16 KB JSON cap.
- **H5 — PDF pipeline inefficiency + temp-file leak + empty-content risk** — `services/pdf.py` — Every page is OCR-rendered at 150 DPI *and* markdown-extracted (duplicated prompt content); `NamedTemporaryFile(delete=False)` leaks on failure (no `finally`); zero-text PDFs still reach the LLM → confident analysis of nothing. Fix: text-layer-first per page, OCR only scanned pages, pass the open `fitz.Document` to `pymupdf4llm` (no temp file), page-count cap, raise `CONTENT_EMPTY`.
- **H6 — Image pipeline lacks validation/preprocessing** — `services/ocr.py` — No dimension limits (decompression bombs), no EXIF orientation handling, no resize-for-OCR, no magic-byte validation of downloaded URL images, SVG not rejected, URL image shares the 15 s page-fetch budget. Fix: `ImageOps.exif_transpose`, ≤20 MP check, resize-to-1600 px for OCR, PIL-format whitelist, separate image-download timeout + size cap.
- **H7 — URL validation gaps** — `services/url_service.py:11-27` — `http://` accepted (PRD: HTTPS only); no 2048-char length limit; `lnkd.in` shortlinks redirect without final-URL revalidation; HTML/image response sizes unbounded; `"login" in response.url` substring check gives false positives/negatives. Fix: scheme+length validation, response-size caps, redirect revalidation (tie-in with C1).
- **H8 — CORS wildcard + credentials; not config-driven** — `main.py:26-32` — Fix: `ALLOWED_ORIGINS` env-driven (PRD §10).
- **H9 — Unbounded caption/extracted text to the LLM** — `main.py:69-79` — Caption prepended unbounded; PRD §8 caps source text at 4,000 chars. Fix: bound + intelligent truncation, dedupe caption/OCR overlap.
- **H10 — No `/api/health`** — PRD §10.2 requires it. Also no `.env.example`, no `.gitignore` at repo root (root `.env` with `GROQ_API_KEY` currently unprotected).

### Medium

- **M1 — Prompt quality** (`groq_service.py:17-36`): unstructured, no platform context, no analysis criteria (hook/clarity/CTA/hashtag/visual-text), "be concise so JSON closes" hack, `confidence` undefined. Fix: structured prompt builder (ROLE/TASK/INPUT/CRITERIA/CONSTRAINTS/OUTPUT/QUALITY) with untrusted boundary, confidence rubric, explicit no-fabrication rules.
- **M2 — Groq client per request** (`groq_service.py:14`): module-level client; explicit timeout; honor `Retry-After` for 429.
- **M3 — `ImageMetadata` missing `width`/`height`** (`models.py:30-32`) while frontend renders them (`PostMetadata.tsx:98`). Add from Pillow.
- **M4 — `platform="file"` vs frontend union `'upload'`** — align to the frontend contract.
- **M5 — Dead/duplicate code**: `AnalysisUrlRequest` unused (`models.py:11`); duplicate `from typing import Optional` (`main.py:3,37`); requirements lists both `dotenv` and `python-dotenv` (conflicting packages).
- **M6 — No structured logging/timings** — no request lifecycle logs (`request_received`, `content_extracted`, `llm_ms`, …), no redaction policy.
- **M7 — Tests cover only `url_service`** — no tests for main, Groq, OCR, PDF, error mapping, or full pipeline; `test_assets/` unused.
- **M8 — Unpinned requirements** — no reproducible builds; Dockerfile uses unpinned deps.
- **M9 — `extract_author` og:title fallback** returns the full title when the " on X:" pattern misses (`url_service.py:53-65`).
- **M10 — Carousel/JSON-LD multi-image** silently picks the first — should emit a warning.
- **M11 — OCR** has no preprocessing, no language config, no low-confidence signal.
- **M12 — Context budget**: `max_tokens=4096` for a small schema; no `max_completion_tokens` config; text length unbounded (H9). Make configurable.

### Low

- L1: Inconsistent naming — `fetch_post_metadata_and_image` returns a raw 5-tuple; replace with a typed result.
- L2: `print()` vs `logging` (folded into M6).
- L3: `normalize_url` strips query params (acceptable for these platforms; keep, document).
- L4: No docstrings/comments consistency pass.
- L5: No `.env.example`/README env documentation (folded into H10).

---

## 3. Planned fixes (implementation order)

| Phase | Work |
|---|---|
| **0. Foundation** | `config.py` (typed env settings w/ defaults + fail-fast on missing key), `errors.py` (AppError + status/code/retryable table), structured logging setup, `.gitignore` + `.env.example` at root |
| **1. Security** | SSRF-safe fetcher (DNS/private-range/redirect revalidation/HTTPS/size caps), magic-byte validation (Pillow whitelist + `%PDF`), pixel/size limits, per-IP rate limiter + semaphore, JSON body cap, CORS from config |
| **2. Canonical model + service layer** | Enums + constrained `AnalysisReport`/`SourceContent` models; thin route → `analysis_service` (URL path + upload path both produce `SourceContent`) |
| **3. Extraction hardening** | `url_service` (reel/tv rejection, https/length validation, typed result, bounded extraction), `image_service` (transpose/resize/validate/OCR-in-threadpool), `pdf_service` (text-layer-first, OCR-only-scanned, no temp file, page cap, `CONTENT_EMPTY`) |
| **4. LLM layer** | `llm_client.py` (module-level client, 45 s timeout, 1 bounded retry on transient 5xx/timeout only, 429→`AI_QUOTA_EXCEEDED` + `Retry-After`, `json_schema` primary → `json_object` fallback, pydantic-validated output, redacted logging); `prompts.py` (structured, untrusted boundary, criteria, confidence rubric, ≤4000-char source) |
| **5. API layer** | Error envelope everywhere (no bare `{"detail":…}`), aligned error codes, `/api/health`, request-id + timing middleware |
| **6. Ops** | Pin requirements, remove `dotenv`, Dockerfile tidy, README/env docs |
| **7. Tests** | Unit: url/image/pdf/llm (mocked Groq incl. invalid JSON, missing fields, 429, timeout, retry-once), error mapping; Integration: full pipeline (mocked scraper + mocked LLM), file uploads (valid/corrupt/oversized/renamed), video-URL rejection, rate limit; use `test_assets/`; zero network/live-API dependencies |
| **8. Verification** | Run full pytest suite; walk the §47 checklist (timeouts, bounded retries, schema validation, injection boundary, source/generated separation, no secrets in logs, temp cleanup, contract vs `frontend/src/types/api.ts`, naming consistency, no dead code); manual smoke with mocked providers |

## 4. Deliberate non-goals (no over-engineering)

- No Redis/cache/DB/queues — the app is stateless by design (PRD §12); in-memory rate limiting only.
- No new heavy dependencies; no classes for their own sake — LLM layer stays a small client wrapper, adapters stay functions.
- No numeric engagement scores — the product deliberately returns qualitative analysis only.

## 5. Decisions confirmed with the user

1. **Keep and harden PDF upload support** (assignment + frontend require it; PRD §2.2 conflict resolved in favor of the working feature).
2. **Keep bounded OCR + vision image** for image inputs (deterministic transcription + text fallback; bound OCR text to ~3000 chars).
3. **`json_schema` structured output with `json_object` fallback** (fallback if the configured model rejects schema mode).
