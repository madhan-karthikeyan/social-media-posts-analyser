# Lovable AI Prompt: Social Media Content Analyzer Frontend (Drag & Drop Edition)

## Role

You are an expert frontend engineer specializing in React, Vite, TypeScript, Tailwind CSS, modern UI design, accessibility, and production-quality user experience.

You are building **ONLY the frontend** for a web application called **Social Media Content Analyzer**.

The backend is a separate Python FastAPI application and will be implemented independently.

**Do not implement, mock, simulate, replace, or redesign the backend.**

---

# 1. Project Overview

## Application

A single-page application where users can **drag and drop an Image or PDF**, or **paste a public social media post URL (LinkedIn, Instagram, X)**, to receive an AI-powered content improvement report.

## Core Promise

Provide a seamless, no-login required way to analyze visual content (Images/PDFs or Social Media Links). Support both direct Drag-and-Drop file uploads and public post URL analysis.

## Target Audience

* Content creators
* Marketers
* Recruiters

## Design Direction

Create a clean, modern, professional interface.

Use:

* Tailwind CSS
* Responsive design
* Subtle shadows and restrained glassmorphism where appropriate
* Professional, slightly vibrant but predominantly clean color palette
* Strong visual hierarchy
* Smooth, restrained transitions

The result should feel like a polished production application rather than a generic dashboard.

---

# 2. Strict Scope

The frontend supports:

* **[ONLY]** Direct drag-and-drop file uploads for Images (JPEG, PNG, WebP) and PDFs.

The frontend must clearly communicate:

* Videos, Instagram Reels, and Carousels are unsupported.
* Maximum file size is 20MB.

Do NOT add:

* Social Media URL Inputs (this is explicitly excluded from the current phase).
* User authentication, Supabase, Firebase, a database, persistent history, payments, or analytics.
* Mock backend data or fake analysis results.
* Direct Groq calls from the browser.

---

# 3. Tech Stack

Use:

* React + TypeScript + Vite
* Tailwind CSS
* Lucide React

Keep dependencies minimal. Do not use heavy external UI libraries.

---

# 4. Initial / Landing Page

The initial page must contain:

## Hero & Upload Zone

* Application name and a one-sentence product description.
* **A massive, visually prominent Drag-and-Drop Zone**. This is the primary and only interaction. 
  - Text: "Drag & drop an Image or PDF here, or click to browse."
  - Highlight state when a file is dragged over.
* **Supported Formats**: Clearly state: "Supports JPEG, PNG, WebP, and PDF (Max 20MB)."

## Actions

Primary: **Analyze Content** (Disabled until a file is selected)
Secondary: **Clear**

---

# 5. Application State Model & Error Handling

Implement all states deliberately (Loading, Success, File Too Large, Invalid File Type, Backend Unreachable, Rate Limit, etc.).
- Prevent uncaught exceptions and infinite spinners.
- If a user uploads a `.mp4`, show an immediate frontend validation error: "Videos are unsupported. Please upload a still image or PDF."
- If the file is >20MB, show: "File is too large. Maximum size is 20MB."
- During loading, cycle through status messages: `Uploading...`, `Extracting text & OCR...`, `Generating AI analysis...`.

---

# 6. Backend API Contract (CRITICAL)

The backend exposes a single endpoint that accepts `multipart/form-data`. **You must not send JSON for the analysis request.**

### `POST /api/analyze`

**Request Payload (FormData):**
- Append the `File` object to the FormData under the key `file`.

Example Fetch Call:
```javascript
const formData = new FormData();
if (selectedFile) {
  formData.append('file', selectedFile);
}

const response = await fetch(`${VITE_API_URL}/analyze`, {
  method: 'POST',
  body: formData, // Notice: No Content-Type header is set manually (browser sets it with boundaries)
});
```

**Success Response (HTTP 200):**
```json
{
  "ok": true,
  "requestId": "uuid",
  "data": {
    "sourceType": "file",
    "mediaType": "image", // or 'pdf'
    "image": {
      "contentType": "image/jpeg",
      "bytes": 182736
    },
    "publicContext": {
      "caption": null
    },
    "analysis": {
      "summary": "...",
      "visual_strengths": ["..."],
      "improvement_opportunities": ["..."],
      "accessibility": {
        "alt_text": "...",
        "readability": "good",
        "contrast_observation": "...",
        "text_density_observation": "..."
      },
      "caption_recommendation": "...",
      "call_to_action": "...",
      "confidence": "high",
      "limitations": ["..."]
    }
  }
}
```

**Error Response (HTTP 4xx/5xx):**
```json
{
  "ok": false,
  "requestId": "uuid",
  "error": {
    "code": "IMAGE_TOO_LARGE",
    "message": "The file is too large to process.",
    "retryable": false
  }
}
```

---

# 7. Result Layout and UX

The success view should visually separate:
1. **File Information**: Show the file name and size.
2. **Analysis Report**: Use cards, sections, dividers to make the report scannable. Prioritize: Summary -> What to improve -> What works -> Accessibility -> Caption/CTA.
3. **Actions**: Include "Copy Report", "Download JSON", and "Analyze Another".

---

# 8. Constraints & Deliverable

Generate the complete frontend implementation. 
- Do NOT implement the backend. 
- Create a dedicated API service (`src/services/api.ts`) that correctly constructs and sends the `FormData`.
- Make it accessible (WCAG 2.2 AA) and responsive (Mobile-first).
- The final result should feel complete even when the backend request fails. Every meaningful user action and failure condition must have an intentional, understandable UI state.
