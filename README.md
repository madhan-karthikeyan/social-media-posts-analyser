# Social Media Content Analyzer 🚀

A production-ready, full-stack application for analyzing social media posts and media assets. The platform extracts content from public URLs (LinkedIn, X, Instagram) or direct file uploads (Images, PDFs) and leverages AI to provide actionable insights, accessibility audits, and engagement recommendations.

## 🌟 Key Features

### Robust Content Ingestion
- **URL Scraping**: Extracts OpenGraph, JSON-LD, and Twitter Card metadata from public LinkedIn, X (Twitter), and Instagram posts.
- **File Uploads**: Supports local image formats (JPEG, PNG, WebP, GIF) and PDF documents (up to 20 pages).
- **OCR Integration**: Automatically falls back to Tesseract OCR for text extraction on image-only posts or scanned PDFs.

### AI-Powered Insights
- **Content Analysis**: Utilizes **Groq LLM** (Llama-3) to analyze extracted text and visual contexts.
- **Engagement Audits**: Generates recommendations on tone, clarity, and visual hierarchy.
- **Accessibility Checks**: Provides actionable advice on Alt-text, contrast, and layout.

### Production-Grade Security
- **SSRF Hardening**: Rejects private/loopback IP address resolutions and enforces strict streaming size limits (20MB) to prevent Server-Side Request Forgery and memory exhaustion.
- **Prompt Injection Defense**: Untrusted user content and OCR text are sandboxed using `<untrusted_content>` XML boundaries to prevent LLM hijacking.
- **Data Integrity**: Validates actual file signatures (Magic Bytes) via `Pillow` and `PyMuPDF` instead of relying on client `Content-Type`.

### Seamless Frontend UX
- **TanStack Router**: Implements strict browser history synchronization without polluting `window.history` with un-restorable loading states.
- **Resilience**: Features abortable network requests, timeout fallbacks, and real-time loading UI.
- **Accessibility (WCAG)**: Compliant UI contrast ratios (4.5:1 minimum) and semantic HTML layouts.

---

## 🏗️ Architecture

The application is built as a **modular monolith** with clear separation of concerns.

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Routing**: `@tanstack/react-router` with strict search parameter typing.
- **Styling**: Vanilla CSS with customized, accessible CSS variables. No heavy utility frameworks.
- **State**: Centralized URL parameter state hydration backed by `sessionStorage` for seamless Forward/Back navigation.

### Backend
- **Framework**: FastAPI (Python)
- **Concurrency**: Heavy operations (Tesseract OCR, PyMuPDF, Groq API) are executed in `fastapi.concurrency.run_in_threadpool` to avoid blocking the ASGI event loop.
- **Scraping**: `httpx` + `BeautifulSoup4` with custom streaming request limits.
- **Analysis**: Groq Python SDK with bounded retries and timeout constraints.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (3.10+)
- Tesseract OCR (Must be installed on your system path)
- Groq API Key

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/madhan-karthikeyan/social-media-posts-analyser.git
   cd social-media-posts-analyser
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
   Create a `.env` file in the root directory (or inside `backend/`) and add:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   Run the development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   The application will be available at `http://localhost:5173`.

### Docker Deployment

For a production-ready, one-command deployment, use Docker Compose:

1. Create a `.env` file in the root directory with your `GROQ_API_KEY`.
2. Run the stack:
   ```bash
   docker-compose up --build -d
   ```
3. The frontend is accessible at `http://localhost:5173`, communicating with the backend at `http://localhost:8000`.

---

## 🧪 Testing

The backend includes a comprehensive `pytest` suite ensuring URL scraper resilience and correct mock routing.

```bash
cd backend
PYTHONPATH=. pytest
```

The frontend routing and components are statically analyzed via strict TypeScript validation:
```bash
cd frontend
npm run build
```

---

## 🔒 Security Posture & Hardening

During development, the following critical remediations were implemented:
1. **SSRF Limits**: Streaming `aiter_bytes` is utilized for image fetching to prevent malicious gigabyte-sized payloads from crashing the server.
2. **File Validations**: `client.get` and `upload` handlers strictly validate Magic Bytes (e.g., `%PDF-`). 
3. **Async Threading**: CPU-bound Python libraries (`PyMuPDF` and `pytesseract`) are offloaded to ThreadPools to ensure the FastAPI loop remains highly responsive under heavy traffic.
4. **Rate Limiting**: Global sliding-window IP rate limiting (10 requests / 10 minutes) protects the LLM endpoint from abuse.
