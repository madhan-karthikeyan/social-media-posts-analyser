# Product Requirements Document: Social Media Content Analyzer

**Document status:** Implementation-ready specification  
**Version:** 1.0  
**Author:** Manus AI  
**Date:** 20 August 2026  
**Primary audience:** Software engineers, reviewers, QA engineers, and deployment owners

## 1. Product definition

The **Social Media Content Analyzer** is a web application that accepts a public post URL from **LinkedIn, Instagram, or X**, retrieves the post’s publicly exposed image and basic metadata, and uses a vision-capable Groq model to evaluate the image and available caption text. It returns structured, practical suggestions intended to improve visual clarity, accessibility, message comprehension, and engagement potential.

The application is deliberately constrained to **one image-type post at a time**. It must not download, extract frames from, transcribe, summarize, or analyze video. It must not require a user login to a social platform, a paid social-media API, a paid scraping provider, paid storage, a paid database, or paid hosting.

The product is a lightweight assessment/demo application rather than a social publishing, scheduling, monitoring, or analytics platform. Its purpose ends when it presents an analysis result and permits the user to copy or download the result locally.

> **Core promise:** Paste a public LinkedIn, Instagram, or X post URL, and receive a concise, structured image-post improvement report without uploading the post to a paid service or requiring a social-platform login.

## 2. Goals and non-goals

### 2.1 Goals

The first release must provide a reliable end-to-end flow from URL validation through image retrieval, image-type enforcement, Groq analysis, and readable results. It must be deployable for **$0 total monetary cost**, assuming the operator uses free account tiers and supplies a valid Groq API key within its free usage allowance. The user interface must make unsupported URLs and video posts understandable rather than silently failing. The codebase must be suitable for a public GitHub repository and a free hosted deployment.

The analyzer must produce recommendations that are grounded in the retrieved post content. It must distinguish facts observed in the image from suggestions and must avoid inventing unavailable metrics such as impressions, likes, reach, or audience demographics.

### 2.2 Non-goals

The release must not support video posts, carousels or multi-image galleries, Stories, Reels, live streams, private posts, authenticated content, post publishing, account connection, social-platform analytics, engagement prediction with numeric guarantees, automated commenting, content scheduling, bulk URL processing, user profiles, payments, subscriptions, or a persistent history database.

The original assessment PDF mentions generic PDF and scanned-document uploads. Those capabilities are **out of scope for this product** because the governing requirements specify a social-post URL workflow and image-type posts only. PDF upload, OCR of arbitrary documents, and document parsing must not be added unless a future requirement explicitly changes the scope.

## 3. Users and primary use cases

The primary user is a content creator, marketer, recruiter, founder, or candidate who wants a quick qualitative review of an image post before publishing or republishing it. The user may understand social content but does not want to inspect platform-specific metadata manually.

The primary use case is: the user opens the site, pastes a public post URL, submits it, waits for analysis, and reviews actionable recommendations. Secondary use cases are retrying a failed request, copying the report, downloading a local JSON report, and starting a new analysis.

## 4. Supported input contract

The only required user input is a single URL in a text field. The URL must use `https://` and belong to an allowed public-post URL pattern for LinkedIn, Instagram, or X. The application must normalize a trailing slash and remove a fragment before validation, but it must not follow arbitrary user-supplied redirects without revalidating the final destination.

| Input category | Required behavior | Examples |
| --- | --- | --- |
| LinkedIn public post | Accept recognized public post URLs, such as `/posts/`, `/feed/update/`, or an equivalent supported public post route. | `https://www.linkedin.com/posts/example_activity-123...` |
| Instagram public post | Accept recognized post URLs under `/p/`. A URL under `/reel/` or `/tv/` must be rejected as video/unsupported media. | `https://www.instagram.com/p/ABC123/` |
| X public post | Accept recognized status URLs under `/status/`. | `https://x.com/example/status/1234567890` or `https://twitter.com/example/status/1234567890` |
| Direct image URL | Reject in the user-facing product because the requested input is a social URL. Direct image handling may exist as an internal backend test fixture only. | `https://cdn.example.com/post.jpg` |
| Video post | Reject before AI analysis. Detection must use platform route signals, metadata, content type, and/or file signature. | Instagram `/reel/`, video MIME type, MP4/WebM bytes |
| Private or login-gated post | Reject with a public-access error. The app must not request or store credentials. | Any page that returns a login wall or lacks an accessible image |
| PDF, document, audio, archive, or arbitrary file | Reject as unsupported input. | `.pdf`, `.docx`, `.mp3`, `.zip` |
| Malformed, non-HTTPS, or unrelated URL | Reject with an inline validation error. | `example.com`, `javascript:...`, `file:///...` |

The application supports **one image** per request. If a platform exposes multiple images or a carousel, the backend must return `UNSUPPORTED_MEDIA` unless the implementation explicitly selects exactly one image and the UI clearly states that behavior. The required v1 behavior is rejection of carousels and multi-image posts to avoid ambiguity.

## 5. Social URL handling and platform adapters

The backend must implement an explicit `PlatformAdapter` interface with one adapter each for LinkedIn, Instagram, and X. Adapters are responsible for URL recognition, canonicalization, safe page retrieval, metadata extraction, and platform-specific classification. They must not require private APIs or unofficial paid proxy services.

For v1, the adapter may retrieve the public HTML document using a server-side HTTP client and inspect standard metadata such as `og:image`, `og:type`, `og:description`, `twitter:image`, `twitter:description`, `description`, and JSON-LD where present. Metadata is a discovery mechanism, not a guarantee: the adapter must validate the discovered image by fetching it and checking its actual response headers and file signature.

The backend must follow at most **three redirects** for the post page and at most **three redirects** for the discovered image. It must reject a redirect that resolves to a private-network address, localhost, a non-HTTPS URL, a host outside the expected image-fetch policy, or a non-image response. The final URL must be treated as untrusted data and must be revalidated after every redirect.

The request must use a short timeout, a bounded response body, and a normal browser-like `User-Agent` that identifies the application. It must not bypass robots controls, CAPTCHAs, authentication, access controls, or platform security. If a platform changes its HTML or blocks server-side retrieval, the expected behavior is a clear `PUBLIC_IMAGE_UNAVAILABLE` error rather than an attempt to circumvent the block.

| Adapter output | Type | Meaning |
| --- | --- | --- |
| `platform` | enum | `linkedin`, `instagram`, or `x` |
| `canonicalPostUrl` | string | Normalized public URL used for display and diagnostics |
| `mediaType` | enum | `image`, `video`, `carousel`, `unknown` |
| `imageUrl` | string or null | Publicly exposed candidate image URL |
| `caption` | string or null | Publicly exposed caption/description, length-limited before AI use |
| `altText` | string or null | Publicly exposed alternative text, if available |
| `authorLabel` | string or null | Public display name only, if publicly exposed |
| `retrievalWarnings` | string[] | Non-fatal metadata limitations |

No author handle, caption, or image URL may be assumed to exist. The system must show `Not available publicly` for absent values and must never fabricate them.

## 6. User experience and flows

### 6.1 Landing flow

The landing page must explain the product in one sentence, display the supported platforms, state that only public image posts are supported, and state that videos, private posts, carousels, and direct image URLs are unsupported. The page must contain a labeled URL field, a primary **Analyze post** button, a **Clear** button, and a short privacy note saying that the application does not request social login credentials and does not retain analysis history by design.

### 6.2 Successful analysis flow

The user pastes a URL. Client-side validation checks basic URL syntax and HTTPS. The client sends the URL to the backend. The backend recognizes the platform, retrieves public metadata, classifies the media, fetches and validates exactly one image, and calls Groq. The frontend displays a loading state with the current stage: `Validating URL`, `Finding public image`, `Checking image type`, or `Generating analysis`.

On success, the result page displays the platform badge, canonical URL, image preview, caption availability, and an analysis report. The report must include a summary, visual strengths, improvement opportunities, accessibility observations, caption recommendations, a suggested call to action, and a disclaimer that the recommendations are qualitative and are not guaranteed engagement outcomes.

### 6.3 Rejection flow

If the URL is invalid, unsupported, private, inaccessible, multi-image, or video, the application must stop before the Groq call whenever possible. The page must preserve the submitted URL, show a human-readable error, identify the correction, and provide a retry or clear action. The UI must not expose stack traces, API keys, raw HTML, internal hostnames, or provider credentials.

### 6.4 New-analysis flow

The user can select **Analyze another post**. The application clears the current result and resets transient state. No previous URL, image, caption, or analysis is persisted to a database or browser storage by default. A user may manually download a report to their own device.

## 7. Functional requirements

| ID | Requirement | Priority | Verification |
| --- | --- | --- | --- |
| FR-001 | The application shall accept one URL through a text input and a submit button. | Must | UI test |
| FR-002 | The application shall accept only HTTPS URLs from LinkedIn, Instagram, or X public-post routes. | Must | Unit/integration tests |
| FR-003 | The application shall identify the platform using hostname and route validation, not user-entered platform selection alone. | Must | Unit tests |
| FR-004 | The application shall retrieve only publicly exposed post metadata and shall not require social login. | Must | Integration test/manual verification |
| FR-005 | The application shall detect and reject videos before AI analysis. | Must | Tests with `/reel/`, video HTML, MP4/WebM fixtures |
| FR-006 | The application shall reject carousels and multi-image posts in v1. | Must | Fixture test |
| FR-007 | The application shall fetch and validate the image’s MIME type, file signature, byte size, and dimensions. | Must | Security/integration test |
| FR-008 | The application shall permit only JPEG, PNG, WebP, and GIF still images; animated GIFs shall be rejected unless animation is explicitly disabled and the bytes are proven still. | Must | Unit test |
| FR-009 | The application shall enforce a configurable maximum image size of 20 MB, matching the documented Groq vision image URL limit. [1] | Must | Boundary test |
| FR-010 | The application shall enforce a lower application limit of 8 MB before base64 encoding to control memory and request cost. | Must | Boundary test |
| FR-011 | The application shall call Groq only from the backend. | Must | Code review/security test |
| FR-012 | The application shall send the image and bounded caption/context to a vision-capable model and request structured output. | Must | Mocked API test |
| FR-013 | The application shall validate the AI response against a server-side schema before returning it. | Must | Contract test |
| FR-014 | The application shall render loading, success, validation-error, unsupported-media, upstream-failure, quota, and timeout states. | Must | UI tests |
| FR-015 | The application shall provide copy-to-clipboard and local JSON download controls. | Should | UI test |
| FR-016 | The application shall not persist user URLs, images, captions, or reports in a database. | Must | Architecture review |
| FR-017 | The application shall return a correlation ID for support/debugging without including sensitive content. | Should | API test |
| FR-018 | The application shall provide a README documenting local setup, free deployment, environment variables, limitations, and tests. | Must | Repository review |

## 8. Image handling and analysis output requirements

The AI report must be useful but bounded. The backend must request JSON with this logical schema and reject any response that cannot be parsed and validated.

```json
{
  "summary": "string, maximum 500 characters",
  "visual_strengths": ["string, maximum 5 items, each maximum 240 characters"],
  "improvement_opportunities": ["string, maximum 7 items, each maximum 300 characters"],
  "accessibility": {
    "alt_text": "string, maximum 300 characters",
    "readability": "good|needs_improvement|unclear",
    "contrast_observation": "string, maximum 240 characters",
    "text_density_observation": "string, maximum 240 characters"
  },
  "caption_recommendation": "string, maximum 800 characters",
  "call_to_action": "string, maximum 240 characters",
  "confidence": "high|medium|low",
  "limitations": ["string, maximum 4 items, each maximum 240 characters"]
}
```

The prompt must explicitly instruct the model to analyze only the supplied image and public caption, identify uncertainty, avoid claims about platform algorithms or guaranteed performance, avoid sensitive-attribute inference, and return the schema only. The server must truncate public caption and metadata to a documented limit, for example 4,000 Unicode characters, before sending them to Groq.

The report must not infer protected or highly sensitive personal characteristics, identify private individuals, provide facial recognition, or make claims about a person’s identity, health, political affiliation, religion, or other sensitive attribute. It may describe visible design properties such as color contrast, layout, text legibility, subject placement, and apparent call-to-action clarity.

## 9. Groq AI integration

The backend shall use Groq’s OpenAI-compatible endpoint at `https://api.groq.com/openai/v1` with `GROQ_API_KEY` stored only as a deployment secret. The official Groq overview documents this base URL and compatible client pattern. [1] The v1 implementation shall use the official Groq SDK or an OpenAI-compatible SDK/server client, pinned to a tested version.

The required vision model is configurable through `GROQ_VISION_MODEL`, with the documented default `qwen/qwen3.6-27b`. Groq’s vision documentation states that this model accepts text and image inputs, supports JSON mode, supports up to five images per request, and has a 20 MB image-URL request limit. [2] The product sends one image only, leaving no ambiguity about multi-image behavior.

Because the official model page labels `qwen/qwen3.6-27b` as a preview model and notes that preview models may be discontinued, the model ID must be an environment variable, the README must document how to change it, and a startup health check must not fail merely because the model-list endpoint is unavailable. [3] A model change is a deployment configuration change followed by the automated contract test suite; it is not a user-facing setting.

The initial call should use Chat Completions because the official vision guide gives a direct image-plus-text example and JSON mode example for the vision model. [2] The request must set a low or moderate temperature, a bounded `max_completion_tokens`, `stream: false`, and JSON mode. If the chosen model/provider configuration supports JSON Schema reliably, the implementation may use schema-constrained structured output; otherwise it must use JSON mode plus strict server-side validation. The Responses API may be used only after verifying the configured vision model and SDK behavior, since the official page identifies Responses API as beta. [4]

The backend must make one Groq request per successful image retrieval. It must not retry automatically on validation errors, unsupported media, 4xx errors, or 429 errors. It may perform one retry for a transient 5xx or network timeout with exponential backoff and jitter, subject to a maximum request budget of two attempts total. The client must receive a stable error code when the free quota is exhausted.

| AI setting | Required value or rule |
| --- | --- |
| API base URL | `https://api.groq.com/openai/v1` |
| API key | `GROQ_API_KEY`; server-side secret only |
| Model | `GROQ_VISION_MODEL`, default `qwen/qwen3.6-27b` |
| Input | One validated still image plus bounded public caption/context |
| Output | JSON object conforming to the application schema |
| Temperature | Configurable; default `0.2` for consistent recommendations |
| Completion limit | Configurable; default 1,200 tokens |
| Timeout | Backend request timeout, default 45 seconds |
| Retry budget | One retry only for transient upstream failure |
| Logging | Metadata only; never image bytes, caption contents, or API key |

Groq rate limits are organization-level. The official rate-limit documentation describes RPM, RPD, TPM, and TPD limits, documents HTTP 429 behavior, and says that current exact limits can vary by organization. [5] The backend must map 429 responses to `AI_QUOTA_EXCEEDED`, honor `retry-after` when present for diagnostics, and display a non-technical message asking the user to retry later. The application must not promise unlimited free usage.

## 10. API requirements

The backend shall expose a small JSON API. CORS must allow only the deployed frontend origin and local development origin. All endpoints must return JSON with a stable envelope.

### 10.1 `POST /api/analyze`

Request:

```json
{
  "url": "https://www.instagram.com/p/ABC123/"
}
```

The URL field is required, must be a string, and must be limited to 2,048 characters. The server must apply schema validation before any network request.

Success response, HTTP 200:

```json
{
  "ok": true,
  "requestId": "uuid",
  "data": {
    "platform": "instagram",
    "canonicalPostUrl": "https://www.instagram.com/p/ABC123/",
    "mediaType": "image",
    "image": {
      "contentType": "image/jpeg",
      "width": 1080,
      "height": 1350,
      "bytes": 182736
    },
    "publicContext": {
      "caption": "string or null",
      "altText": "string or null",
      "authorLabel": "string or null"
    },
    "analysis": { "summary": "...", "visual_strengths": [], "improvement_opportunities": [], "accessibility": {}, "caption_recommendation": "...", "call_to_action": "...", "confidence": "medium", "limitations": [] }
  }
}
```

The success response must not return the downloaded image bytes or the discovered image URL unless there is a clear privacy and security reason to do so. The frontend should display the image only through a short-lived server-mediated preview endpoint or, preferably, use a sanitized public image URL returned only when safe. The simpler v1 choice is to display no image preview when returning the image would increase privacy or SSRF exposure; however, the preferred implementation returns a short-lived, non-persistent preview token backed by an in-memory response if the hosting platform supports it.

Error response:

```json
{
  "ok": false,
  "requestId": "uuid",
  "error": {
    "code": "UNSUPPORTED_MEDIA",
    "message": "This post appears to contain video. Only a single still image post is supported.",
    "retryable": false
  }
}
```

Required error codes are `INVALID_URL`, `UNSUPPORTED_PLATFORM`, `PRIVATE_OR_LOGIN_REQUIRED`, `POST_NOT_FOUND`, `PUBLIC_IMAGE_UNAVAILABLE`, `UNSUPPORTED_MEDIA`, `IMAGE_TOO_LARGE`, `INVALID_IMAGE`, `FETCH_TIMEOUT`, `SSRF_BLOCKED`, `AI_QUOTA_EXCEEDED`, `AI_TIMEOUT`, `AI_UPSTREAM_ERROR`, `AI_INVALID_OUTPUT`, `RATE_LIMITED`, and `INTERNAL_ERROR`.

### 10.2 `GET /api/health`

The endpoint shall return HTTP 200 with `{ "ok": true, "service": "social-media-content-analyzer" }` when the process is alive. It must not call Groq, crawl social platforms, or reveal secret configuration. A separate protected or deployment-only smoke test may verify the AI configuration.

## 11. Frontend requirements

The frontend shall be a responsive single-page application that works on current Chrome, Firefox, Safari, and Edge desktop and mobile layouts. The page must meet WCAG 2.2 AA-oriented practices: visible labels, keyboard operation, focus states, semantic headings, sufficient contrast, alt text for meaningful images, `aria-live` status for loading and errors, and no color-only meaning.

The URL field must show a platform hint after valid parsing and must not submit on an empty or malformed value. The analyze button must be disabled while a request is in progress. The UI must display a determinate sequence of status labels but must not claim that an image was retrieved until the backend confirms it.

The results view must be readable without horizontal scrolling. It must use sections or cards titled **Summary**, **What works**, **What to improve**, **Accessibility**, **Caption suggestion**, **Suggested call to action**, and **Limitations**. The user must be able to copy the full report as plain text and download a JSON file generated locally in the browser. No analytics SDK, advertising SDK, third-party font, or externally hosted JavaScript dependency may be required for the application to function.

## 12. Backend requirements

The backend must be stateless. It shall store no user account data, no request history, no uploaded image, no caption, and no AI report in a database or object store. Temporary bytes must exist only in process memory for the duration of the request and must be released after completion. The implementation must document that serverless provider logs can have provider-specific retention and must configure application logs to avoid content.

The fetch layer must limit response size while streaming, reject unsupported content types before buffering whenever possible, verify magic bytes using a trusted library or deterministic signatures, normalize image orientation if needed, and enforce pixel-dimension limits such as a maximum of 20 megapixels to reduce decompression-bomb risk. It must reject SVG because SVG can contain active or external content. It must reject animated images unless the implementation can prove that only a single still frame is used without treating the post as video.

The backend must isolate platform fetching from AI calling. The pipeline is: validate request; identify platform; retrieve public HTML; classify post media; extract candidate metadata; validate candidate image; bound and encode image; call Groq; validate output; redact logs; return response.

## 13. Security and privacy requirements

The Groq key must be provisioned as a server-side environment secret and must never appear in frontend JavaScript, HTML, source maps, Git history, API responses, or logs. The repository must include `.env.example` with variable names only and must use a secret-scanning check in CI.

SSRF protection is mandatory. The fetcher must allow only HTTPS, resolve DNS, reject loopback, link-local, multicast, private IPv4 and IPv6 ranges, metadata service addresses, localhost names, and non-public redirects. It must re-check the resolved destination at connection time where the platform permits. It must not fetch arbitrary URLs supplied as image URLs without applying the same policy.

The API must enforce a per-IP application limit, such as 10 analysis submissions per 10 minutes, with a memory-only implementation in v1. If the free host does not guarantee shared memory across instances, the limit is best-effort and must be described as such. The backend must enforce request-body limits, URL length limits, timeouts, concurrency limits, and an overall analysis deadline.

The application must use HTTPS in deployment, set security headers including Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a restrictive permissions policy, and avoid rendering model output as unsanitized HTML. User-provided and model-provided strings must be rendered as text. The application must not ask for social credentials, access tokens, or browser cookies.

## 14. Zero-cost requirements and deployment

The total required cost must be **$0**. The implementation must not depend on a paid plan, trial that expires into billing, paid API, paid proxy, paid database, paid object storage, paid monitoring, paid DNS, paid domain, paid email, or paid CI service. The user may optionally use a free Groq account/API allowance; any billing setup that is required by a provider is disallowed for the required deployment.

The recommended architecture is a static frontend deployed on **Cloudflare Pages free tier** and a stateless **Cloudflare Worker free tier** API, with no D1 database, R2 bucket, KV namespace, queue, or other paid/add-on service. If the selected Cloudflare account or current free-tier policy requires a paid feature, deployment must stop and the README must select another genuinely free alternative rather than silently introducing cost. The public URL may use the provider’s free subdomain; purchasing a custom domain is explicitly optional and not part of acceptance.

| Layer | Recommended zero-cost choice | Required cost behavior |
| --- | --- | --- |
| Source control | GitHub Free public repository | No paid repository features required |
| Frontend | React + TypeScript + Vite, deployed to Cloudflare Pages free tier | Static assets only |
| API | TypeScript Cloudflare Worker on free tier | Stateless; no paid add-ons |
| Database | None | No persistence required |
| File storage | None | Images held in memory only during request |
| AI | Groq free allowance with `GROQ_API_KEY` | Must handle quota exhaustion gracefully; never assume unlimited free calls |
| CI | GitHub Actions free allowance for a public repository, or local commands | Build/test must remain possible without paid minutes |
| Domain/TLS | Provider free subdomain and managed HTTPS | Custom domain not required |

A critical operational constraint is that **Groq is not a guarantee of unlimited free production capacity**. The product requirement is zero monetary cost, not unlimited usage. The deployed README must state the current free-plan assumptions, provide a clear quota error, and never request automatic billing or paid upgrades. Exact provider quotas must be checked at deployment time against the official documentation and account settings. [5]

The production build must define these environment variables only on the server side: `GROQ_API_KEY`, `GROQ_VISION_MODEL`, `ALLOWED_ORIGINS`, `MAX_IMAGE_BYTES`, `REQUEST_TIMEOUT_MS`, and `LOG_LEVEL`. The frontend may receive only a public API base URL.

## 15. Recommended technology stack

| Concern | Technology | Rationale |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Small, maintainable static bundle with strong typing |
| Styling | Plain CSS or Tailwind CSS compiled at build time | No runtime service or external dependency required |
| Backend | TypeScript Cloudflare Worker | Server-side secret handling and free stateless edge execution |
| Validation | Zod or equivalent bundled schema library | Shared request/response validation |
| HTML metadata | Lightweight HTML parser | Extract Open Graph, Twitter Card, and JSON-LD metadata |
| Image validation | `sharp` where supported, or a Worker-compatible image parser/signature validator | MIME, dimensions, and decompression safety checks |
| AI client | Groq SDK or OpenAI-compatible client | Matches official Groq API pattern |
| Testing | Vitest, Testing Library, and API fixture tests | Unit, component, and contract coverage without paid services |
| Formatting/linting | ESLint and Prettier | Consistent production-quality code |
| Hosting | Cloudflare Pages + Workers free tier | No required database or paid infrastructure |

The developer must confirm Worker-compatible image libraries before implementation. If a library cannot run in the target free runtime, the fallback is to validate magic bytes, MIME, byte size, and dimensions using a compatible pure-JavaScript parser; the product must not add a paid image-processing API.

## 16. Error handling and observability

Every failure must produce a stable internal error code and a safe user message. The frontend must distinguish errors that are actionable by the user from transient errors that merit retry. Provider details may be recorded in a server-only diagnostic field but must not be returned to the client.

| Condition | HTTP status | Error code | User action |
| --- | ---: | --- | --- |
| Invalid or unsupported URL | 400 | `INVALID_URL` or `UNSUPPORTED_PLATFORM` | Paste a public LinkedIn, Instagram, or X post URL |
| Login/private post | 403 | `PRIVATE_OR_LOGIN_REQUIRED` | Make the post public; no login is supported |
| Video, carousel, or non-image | 415 | `UNSUPPORTED_MEDIA` | Use a single still-image post |
| Image too large or invalid | 413/415 | `IMAGE_TOO_LARGE` or `INVALID_IMAGE` | Use a supported still image under the limit |
| Source timeout/unavailable | 502/504 | `PUBLIC_IMAGE_UNAVAILABLE` or `FETCH_TIMEOUT` | Retry later or verify public availability |
| Application rate limit | 429 | `RATE_LIMITED` | Wait and retry |
| Groq quota | 429 | `AI_QUOTA_EXCEEDED` | Retry after quota reset; no paid upgrade required |
| Groq timeout/failure | 502/504 | `AI_TIMEOUT` or `AI_UPSTREAM_ERROR` | Retry once later |
| Invalid model output | 502 | `AI_INVALID_OUTPUT` | Retry; report a non-sensitive request ID |
| Unexpected server error | 500 | `INTERNAL_ERROR` | Retry and provide request ID if needed |

The server may log request ID, timestamp, platform, outcome code, elapsed milliseconds, response status, and byte counts. It must never log raw URLs if URLs may contain query tokens, image bytes, captions, model prompts, model responses, cookies, authorization headers, or secrets. A deployment health check must verify only process liveness; an optional smoke test may run against a fixed public fixture and must be disabled or protected in production.

## 17. Testing requirements

The project must include automated tests for URL recognition and canonicalization across valid and invalid LinkedIn, Instagram, and X URLs. Tests must cover non-HTTPS URLs, lookalike domains, URL fragments, query strings, unsupported routes, and malicious schemes.

The fetch and media pipeline must be tested with fixtures for a valid JPEG, PNG, WebP, malformed bytes, oversized response, wrong MIME type, MP4 video, WebM video, animated GIF, SVG, redirect chain, private IP redirect, login wall, missing `og:image`, multiple images, and timeout. Tests must prove that video fixtures do not reach the AI client.

The AI integration must use a mocked Groq client in ordinary CI tests. Contract tests must verify the exact request shape, server-side secret usage, one-image limit, bounded prompt, timeout, retry budget, 429 mapping, malformed JSON handling, and schema validation. At least one opt-in manual smoke test may use a real Groq key and a fixed public image fixture; it must not run automatically in a way that consumes quota on every pull request.

The frontend must test empty submission, invalid URL, loading transitions, each major error state, success rendering, keyboard access, copy behavior, local JSON download, and reset behavior. The production build must pass type checking, linting, unit tests, and a deployment preview smoke test.

The CI pipeline must fail on type errors, lint errors, test failures, secrets detected in tracked files, or a frontend bundle that accidentally contains `GROQ_API_KEY` or server-only configuration names.

## 18. Acceptance criteria

The product is accepted only if all of the following conditions are met.

| ID | Acceptance criterion |
| --- | --- |
| AC-001 | A reviewer can open the public free-hosted URL and use the application without a paid account, application login, or social login. |
| AC-002 | A valid publicly accessible single-image post URL from LinkedIn, Instagram, and X reaches a result or a documented provider-specific public-availability error without crashing. |
| AC-003 | A video URL, including an Instagram Reel URL, is rejected with `UNSUPPORTED_MEDIA` and causes zero Groq calls. |
| AC-004 | A carousel or multi-image post is rejected or handled exactly according to the documented v1 rule; the required v1 rule is rejection. |
| AC-005 | A private/login-gated post is rejected without requesting credentials or bypassing access controls. |
| AC-006 | The backend verifies the downloaded object as a supported still image and enforces size, dimension, timeout, redirect, and SSRF controls. |
| AC-007 | The Groq key is absent from frontend assets, browser network responses, logs, and Git history. |
| AC-008 | A successful analysis renders all required report sections and clearly labels unavailable public metadata. |
| AC-009 | The server validates the AI output and safely handles malformed JSON, quota errors, timeouts, and upstream failures. |
| AC-010 | No persistent database, object storage, paid API, paid hosting, paid proxy, paid monitoring, or paid domain is required. |
| AC-011 | The repository contains setup instructions, free deployment instructions, environment-variable documentation, limitations, architecture notes, test instructions, and the requested brief approach write-up of no more than 200 words. |
| AC-012 | The automated test suite covers the required platform, media, security, API, frontend, and error scenarios and passes in a clean checkout. |

## 19. Definition of done

The feature is done when the source code is committed to a public GitHub repository, the free deployment succeeds from a clean checkout, the public URL serves the frontend over HTTPS, the API is reachable from that frontend with correctly restricted CORS, and the complete happy path works with a public image post fixture.

Done also requires that all Must requirements and acceptance criteria pass; the README accurately states unsupported content and free-tier limitations; secrets are configured only in the deployment environment; no paid dependency is necessary; no video path invokes the AI provider; the repository contains automated tests and CI checks; and a reviewer can reproduce local setup and deployment without making product or architecture decisions that this PRD leaves unspecified.

## 20. Suggested repository structure

```text
social-media-content-analyzer/
├── apps/
│   ├── web/                 # React/Vite frontend
│   └── api/                 # Worker/API entrypoint
├── packages/
│   ├── contracts/           # Request, response, and error schemas
│   ├── platform-adapters/   # LinkedIn, Instagram, and X adapters
│   └── analysis/             # Prompt and AI response validation
├── fixtures/                 # Sanitized HTML/image/video test fixtures
├── tests/                    # Cross-package integration tests
├── .github/workflows/ci.yml
├── .env.example
├── README.md
├── package.json
└── PRD.md
```

## 21. References

[1]: https://console.groq.com/docs/overview "Groq Documentation: Overview"

[2]: https://console.groq.com/docs/vision "Groq Documentation: Images and Vision"

[3]: https://console.groq.com/docs/models "Groq Documentation: Supported Models"

[4]: https://console.groq.com/docs/responses-api "Groq Documentation: Responses API"

[5]: https://console.groq.com/docs/rate-limits "Groq Documentation: Rate Limits"

[6]: /home/ubuntu/upload/CopyofSocialMediaContentAnalyzer-Assignment2(5)(1)-1.pdf "Supplied technical assessment assignment"
