# Frontend Audit — Social Media Content Analyzer

Date: 2026-08-20
Scope: `frontend/` (React 19 + TanStack Router v1 + Tailwind CSS v4 + lucide-react), with the backend API contract cross-referenced (`backend/main.py`, `models.py`, `services/url_service.py`, `services/groq_service.py`).

## Verified facts

- Single route `/` (`src/App.tsx`); all view state (INITIAL / LOADING / SUCCESS / ERROR) lives in `useState` inside `IndexRoute` (`src/routes/index.tsx`).
- Backend exposes one endpoint `POST /api/analyze` handling URL (JSON) and file (multipart) paths.
- `npm run lint` and `npm run build` pass clean.
- Test assets (`test_assets/sample_image.jpg`, `sample_document.pdf`) and Playwright + Chromium are available for runtime verification.

---

## Critical

### C1 — Timeout leaves the app stuck in LOADING forever

- **Location:** `src/routes/index.tsx:82-118` (`doFetchUrl`) and `:121-158` (`doFetchFile`)
- **Why it is a problem:** The 45 s (URL) / 60 s (file) timeout calls `controller.abort()`. `analyzePost`/`analyzeFile` convert the resulting `AbortError` into a *resolved* `FETCH_TIMEOUT` error response, but both `.then` handlers bail at `if (controller.signal.aborted) return;` **before setting any state**. The loading screen spins indefinitely; the only escape is a page reload.
- **Recommended fix:** Track a `timedOut` flag set by the timeout callback. Only swallow the aborted response when the abort came from a deliberate user reset (Clear / cancel); otherwise commit the `FETCH_TIMEOUT` error state.
- **Priority:** Critical

### C2 — No browser Back/Forward support at all

- **Location:** `src/App.tsx` (single route), `src/routes/index.tsx` (state machine in React state)
- **Why it is a problem:** Back exits the application entirely, Forward is dead, results cannot be revisited, and a refresh loses everything. Violates the mandatory backward/forward navigation requirement.
- **Recommended fix:** Mirror only the *restorable* view into the URL with TanStack Router search params: `/?view=results` for results. LOADING and ERROR stay off the URL (transient states must not create history entries). Lift workflow state into a root-level provider that survives route changes; mirror the result payload to `sessionStorage` so Back/Forward and refresh restore correctly. On success, `navigate({ search: { view: 'results' } })` (push). In-app back / "Analyze another post" `navigate('/')` (push), so Forward restores results. `beforeLoad` falls back to `/` when `view=results` has no payload.
- **Priority:** Critical

---

## High

### H1 — Split-brain file selection state

- **Location:** `src/components/FileUpload.tsx:34-48,99-103` vs `src/routes/index.tsx:58-80,121-158`
- **Why it is a problem:** FileUpload validates *type only* in its own local state; the parent validates type + size. A 30 MB file gets shown as selected by FileUpload while the parent reports "file too large" — contradictory UI, and Analyze refuses. `onFileSelect(null as unknown as File)` is an unsound cast.
- **Recommended fix:** Lift file state fully into the parent/root store; make FileUpload controlled; one validation pass reporting through one error channel; remove the casts.
- **Priority:** High

### H2 — Backend error codes `LOGIN_REQUIRED` / `ACCESS_DENIED` unmapped

- **Location:** `backend/services/url_service.py:138,145` → `src/components/ErrorView.tsx` / `src/types/api.ts`
- **Why it is a problem:** The two most common real failures (Instagram login redirect, X/IG 403) fall through to the generic `UNKNOWN_ERROR` card ("Something went wrong") with a raw technical message ("HTTP Status: 403") as primary copy. `NETWORK_ERROR` has a config but is missing from the `ErrorCode` union.
- **Recommended fix:** Add `LOGIN_REQUIRED`, `ACCESS_DENIED`, `NETWORK_ERROR` to the `ErrorCode` union and `ERROR_CONFIGS` with human copy and a "try uploading a screenshot" recovery path. Present the backend message only as small secondary technical detail.
- **Priority:** High

### H3 — User trapped while loading; no cancel

- **Location:** `src/components/LoadingView.tsx`, `src/routes/index.tsx`
- **Why it is a problem:** A mistaken submit forces up to 60 s of un-interruptible waiting; no Back, no Cancel, no user-facing abort.
- **Recommended fix:** Add a Cancel button in LoadingView (aborts the controller, returns to the form).
- **Priority:** High

### H4 — File-flow errors offer an "Edit URL" button

- **Location:** `src/components/ErrorView.tsx:306-315`, configs at `:214-233`
- **Why it is a problem:** `UNSUPPORTED_FILE_TYPE` / `FILE_TOO_LARGE` set `showEditUrl: true`, rendering "Edit URL" on a file error — nonsensical label for the upload flow.
- **Recommended fix:** Context-aware secondary action: "Edit URL" in URL mode, "Choose another file" in upload mode. At most one primary + one fallback action per error.
- **Priority:** High

### H5 — Redundant result-page actions

- **Location:** `src/components/ResultView.tsx:70-78,204-219`, `src/components/ActionButtons.tsx`
- **Why it is a problem:** "Back to Analyzer" (top), "Analyze another post", and "Clear" all call the same reset; the "Report Actions" card adds a redundant heading around the same buttons plus Copy/Download. Four exit paths with no hierarchy. `ActionButtons` carries dead `onRetry`/`onEditUrl` branches (unused in results).
- **Recommended fix:** One back arrow (history-backed), one primary "Analyze another post", one secondary group (Copy Report, Download JSON). Remove "Clear" and the heading from results internals.
- **Priority:** High

### H6 — `lnkd.in` short links rejected client-side

- **Location:** `src/utils/validation.ts:1-10`
- **Why it is a problem:** Backend explicitly supports `lnkd.in/...`; the client blocks it as "unsupported platform", so real mobile-pasted URLs fail before reaching the backend.
- **Recommended fix:** Add `lnkd.in` (and `www.lnkd.in`) to `SUPPORTED_HOSTNAMES`.
- **Priority:** High

### H7 — Fake staged loading messages

- **Location:** `src/components/LoadingView.tsx:3-27`
- **Why it is a problem:** "Validating URL… / Finding public image… / Checking image type… / Generating analysis…" cycle every 2.5 s with no backend progress signal; screen readers announce each phantom step; the cycle loops.
- **Recommended fix:** Single honest status message + indeterminate spinner; keep the stable skeleton card; only one `aria-live` region on the message.
- **Priority:** High

### H8 — Broken empty link for upload results

- **Location:** `src/components/PostMetadata.tsx:41-49`
- **Why it is a problem:** For file uploads `canonicalPostUrl` is `""`, rendering a clickable `<a href="">` with an empty label.
- **Recommended fix:** Render the link only when a URL exists; show "Uploaded file" for uploads.
- **Priority:** High

### H9 — No focus management or announcement on view change

- **Location:** `src/components/ErrorView.tsx`, `src/components/ResultView.tsx`
- **Why it is a problem:** After submit, focus is left on a control that unmounted (falls to `<body>`). Errors are never announced, and the results page has no `h1` — the first heading level is `h3`.
- **Recommended fix:** ErrorView: `role="alert"` + focus the card heading (`tabIndex={-1}`). ResultView: real `h1` ("Analysis complete"). Move focus deliberately on each state transition.
- **Priority:** High

### H10 — WCAG AA contrast failures

- **Location:** `src/index.css:9,11` (`--color-text-muted: #9ca3af` ≈ 2.8:1 at 12 px); `src/components/PostMetadata.tsx:17-24` (white text on Instagram `#e4405f` ≈ 3.2:1)
- **Why it is a problem:** Helper text, "Not available" italics, and the Instagram badge fail AA for small text.
- **Recommended fix:** Raise muted to ≈ `#5f6672` (≥ 4.5:1), keep a darker text-secondary for hierarchy. Platform chips: tinted background + brand-colored text (LinkedIn ≈ 5:1, Instagram ≈ 4.6:1), X in black.
- **Priority:** High

---

## Medium

### M1 — Duplicated constants and helpers

- **Location:** `ACCEPTED_TYPES` ×3 (`src/routes/index.tsx:11-12`, `src/components/FileUpload.tsx:4-13`, `src/services/api.ts:103-110`); `formatBytes` ×3 (`FileUpload.tsx`, `PostMetadata.tsx`, `utils/report.ts`); size limits ×2 (routes + api)
- **Why it is a problem:** Drift risk — adding a MIME type in one place silently breaks behavior elsewhere.
- **Recommended fix:** Single `src/constants.ts` (accepted types, extensions, max size) + shared `formatBytes`.
- **Priority:** Medium

### M2 — Error text causes layout shift

- **Location:** `src/components/UrlInput.tsx:36-44`, `src/components/FileUpload.tsx:176-180`
- **Why it is a problem:** The error `<p>` is inserted below the input, pushing the button row down and shifting the whole card.
- **Recommended fix:** Reserve a fixed-height error slot under each input so validation messages never move surrounding layout.
- **Priority:** Medium

### M3 — Dead props, dead code, unused tokens

- **Location:** `LandingView` `isLoading` prop (always `false`); `ActionButtons` unused branches; `utils/validation.ts:51-62` `getPlatformFromUrl` (unused); `public/icons.svg` (unused); CSS tokens `--radius-lg`, `--shadow-sm/md/lg`, `--color-info`, `--font-mono` (unused)
- **Why it is a problem:** Confusing surface area; invites misuse; tokens suggest a design system that does not exist.
- **Recommended fix:** Remove dead code; drop unused tokens from `@theme`.
- **Priority:** Medium

### M4 — Backend warnings never displayed

- **Location:** backend appends "image could not be downloaded" style warnings (`services/url_service.py:177-184`) → `data.warnings` (`types/api.ts:71`) is never rendered
- **Why it is a problem:** A post whose image failed to fetch still gets a caption-based analysis; the user is never told why there is no image review.
- **Recommended fix:** Render `warnings` as a muted note in PostMetadata.
- **Priority:** Medium

### M5 — `resetToInitial` focuses the URL input even in upload mode

- **Location:** `src/routes/index.tsx:24-33`
- **Why it is a problem:** After "Analyze another post" in upload mode, focus lands on an input that is not the active mode's control.
- **Recommended fix:** Focus the active mode's primary control (or the Analyze button).
- **Priority:** Medium

### M6 — CopyButton silently fails; timer not cleaned up

- **Location:** `src/components/CopyButton.tsx:13-21`
- **Why it is a problem:** Clipboard permission failures are invisible; the 2 s reset timer keeps running after unmount.
- **Recommended fix:** Clean up the timer on unmount; surface "Copy failed" on rejection.
- **Priority:** Medium

### M7 — `requestId` captured but never surfaced

- **Location:** `src/routes/index.tsx` stores `requestId` in ERROR state; `ErrorView` never shows it
- **Why it is a problem:** No way to reference a failed request when reporting an issue.
- **Recommended fix:** Small secondary "Reference <id>" line in the error card.
- **Priority:** Medium

### M8 — Loading `isFile` sniffed via string heuristic

- **Location:** `src/components/LoadingView.tsx:19` (`!url.startsWith('http')`)
- **Why it is a problem:** Fragile — a filename could legitimately start with "http".
- **Recommended fix:** Pass an explicit `mode` prop (`'url' | 'upload'`).
- **Priority:** Medium

### M9 — `document.title` is static

- **Location:** `index.html:8`
- **Why it is a problem:** Tab title never reflects state ("Analyzing…", "Analysis results").
- **Recommended fix:** Per-view title helper.
- **Priority:** Medium

---

## Low

### L1 — README is Vite boilerplate

- **Location:** `frontend/README.md`
- **Why it is a problem:** No useful project information.
- **Recommended fix:** Replace with a real project README (setup, scripts, API URL).
- **Priority:** Low

### L2 — Stacked micro-copy under the landing card

- **Location:** `src/components/LandingView.tsx:121-132` (PlatformBadges + info line + privacy line)
- **Why it is a problem:** Three stacked lines of helper text compete with the primary action.
- **Recommended fix:** Keep the info line, fold privacy into it; keep badges as the only separated row.
- **Priority:** Low

### L3 — No error boundary

- **Location:** `src/main.tsx`
- **Why it is a problem:** A render crash yields a white screen.
- **Recommended fix:** Minimal `ErrorBoundary` with a recoverable message.
- **Priority:** Low

### L4 — Download JSON revokes object URL immediately

- **Location:** `src/components/ResultView.tsx:58-66`
- **Why it is a problem:** Rarely, some browsers abort the download if the blob URL is revoked synchronously.
- **Recommended fix:** Append the anchor to the DOM and revoke inside `setTimeout` (or keep, given modern browsers).
- **Priority:** Low

---

## User journey notes

- **First-time user:** Landing states purpose, accepted inputs, and primary action clearly (heading + URL/file tabs + formats). Good.
- **Returning user:** "Analyze another post" works; input persists across Back when the C2 fix lands.
- **Mistake recovery:** URL validation errors and file errors are recoverable; "Edit URL" label is wrong for file errors (H4).
- **Unscrapeable URL:** Backend blocks (IG/X) fall to a generic error today (H2); screenshot fallback message is only visible in backend text.
- **Keyboard-only:** Upload dropzone is a real button and opens the picker; Enter submits; tab order works; error announcements missing (H9).
- **Browser Back/Forward:** Broken today (C2).

## Verification checklist (performed against the audit)

- [x] Source audit of all routes, components, services, utils, types, styles
- [x] Lint + production build pass
- [x] Backend contract cross-checked (error codes, warnings, media metadata)
- [ ] Live visual walkthrough (planned post-fix: Playwright, all states, 3 viewports)
- [ ] Back/Forward chains, refresh restore, cancel, timeout, keyboard-only (planned post-fix)

## Verification checklist (post-fix acceptance)

- [ ] Home flow works
- [ ] File upload works
- [ ] URL flow works
- [ ] Loading states work
- [ ] Error states work
- [ ] Retry works
- [ ] New analysis works
- [ ] Browser Back works
- [ ] Browser Forward works
- [ ] In-app navigation works
- [ ] No navigation loops
- [ ] No stale results
- [ ] Desktop layout works
- [ ] Mobile layout works
- [ ] Keyboard navigation works
- [ ] Theme is consistent
- [ ] Typography is consistent
- [ ] Spacing is consistent
- [ ] Buttons behave consistently
- [ ] No unnecessary AI visual gimmicks
- [ ] No unnecessary animations
- [ ] No unnecessary dependencies added
- [ ] Existing functionality still works