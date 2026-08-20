import type { AnalyzeResponse, ErrorResponse } from '../types/api';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';

function buildError(
  code: string,
  message: string,
  retryable: boolean
): ErrorResponse {
  return {
    ok: false,
    requestId: crypto.randomUUID(),
    error: { code: code as ErrorResponse['error']['code'], message, retryable },
  };
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

async function parseJsonResponse(res: Response): Promise<AnalyzeResponse> {
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return buildError('INTERNAL_ERROR', 'Something went wrong while processing the request.', true);
  }

  if (!json || typeof json !== 'object') {
    return buildError('INTERNAL_ERROR', 'Something went wrong while processing the request.', true);
  }

  const obj = json as Record<string, unknown>;

  if (obj['ok'] === true && obj['data']) {
    return json as AnalyzeResponse;
  }

  if (obj['ok'] === false && obj['error']) {
    const err = obj['error'] as Record<string, unknown>;
    const code = typeof err['code'] === 'string' ? err['code'] : 'INTERNAL_ERROR';
    const message = typeof err['message'] === 'string' ? err['message'] : 'An unexpected error occurred.';
    const retryable = typeof err['retryable'] === 'boolean' ? err['retryable'] : false;
    return {
      ok: false,
      requestId: typeof obj['requestId'] === 'string' ? obj['requestId'] : '',
      error: { code: code as ErrorResponse['error']['code'], message, retryable },
    };
  }

  switch (res.status) {
    case 400:
      return buildError('INVALID_URL', 'Enter a valid public LinkedIn, Instagram, or X post URL.', false);
    case 403:
      return buildError('PRIVATE_OR_LOGIN_REQUIRED', 'This post cannot be accessed publicly. Private and login-required posts are not supported.', false);
    case 404:
      return buildError('POST_NOT_FOUND', 'We couldn\'t find that public post. Check the URL and make sure the post still exists.', false);
    case 413:
      return buildError('IMAGE_TOO_LARGE', 'The image is too large to process.', false);
    case 415:
      return buildError('UNSUPPORTED_MEDIA', 'This post contains unsupported media. Only a single still image is supported.', false);
    case 429:
      return buildError('RATE_LIMITED', 'Too many requests were made in a short period. Please wait a moment and try again.', true);
    case 502:
      return buildError('AI_UPSTREAM_ERROR', 'The AI service could not complete the analysis.', true);
    case 504:
      return buildError('FETCH_TIMEOUT', 'The social post took too long to retrieve.', true);
    default:
      return buildError('INTERNAL_ERROR', 'Something went wrong while processing the request.', true);
  }
}

export async function analyzePost(
  url: string,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal,
    });
  } catch (err: unknown) {
    if (isAbortError(err)) {
      return buildError('FETCH_TIMEOUT', 'The request was cancelled.', false);
    }
    return buildError(
      'INTERNAL_ERROR',
      'We couldn\'t connect to the analysis service. Check your connection and try again.',
      true
    );
  }

  return parseJsonResponse(res);
}

export async function analyzeFile(
  file: File,
  signal?: AbortSignal
): Promise<AnalyzeResponse> {
  const MAX_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return buildError('FILE_TOO_LARGE', 'The file is too large. Maximum size is 20 MB.', false);
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return buildError('UNSUPPORTED_FILE_TYPE', 'Unsupported file type. Please upload a JPG, PNG, WebP, GIF, or PDF.', false);
  }

  const formData = new FormData();
  formData.append('file', file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (err: unknown) {
    if (isAbortError(err)) {
      return buildError('FETCH_TIMEOUT', 'The request was cancelled.', false);
    }
    return buildError(
      'INTERNAL_ERROR',
      'We couldn\'t connect to the analysis service. Check your connection and try again.',
      true
    );
  }

  return parseJsonResponse(res);
}
