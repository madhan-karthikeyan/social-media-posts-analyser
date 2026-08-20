export type Platform = 'linkedin' | 'instagram' | 'x' | 'upload';

export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'PRIVATE_OR_LOGIN_REQUIRED'
  | 'POST_NOT_FOUND'
  | 'PUBLIC_IMAGE_UNAVAILABLE'
  | 'NO_PUBLIC_MEDIA'
  | 'NO_PUBLIC_METADATA'
  | 'UNSUPPORTED_MEDIA'
  | 'IMAGE_TOO_LARGE'
  | 'INVALID_IMAGE'
  | 'FETCH_TIMEOUT'
  | 'SSRF_BLOCKED'
  | 'AI_QUOTA_EXCEEDED'
  | 'AI_TIMEOUT'
  | 'AI_UPSTREAM_ERROR'
  | 'AI_INVALID_OUTPUT'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE';

export type Readability = 'good' | 'needs_improvement' | 'unclear';
export type Confidence = 'high' | 'medium' | 'low';

export interface ImageMetadata {
  contentType: string;
  width: number;
  height: number;
  bytes: number;
}

export interface PublicContext {
  caption: string | null;
  altText: string | null;
  authorLabel: string | null;
}

export interface AccessibilityReport {
  alt_text: string;
  readability: Readability;
  contrast_observation: string;
  text_density_observation: string;
}

export interface AnalysisReport {
  summary: string;
  visual_strengths: string[];
  improvement_opportunities: string[];
  accessibility: AccessibilityReport;
  caption_recommendation: string;
  call_to_action: string;
  confidence: Confidence;
  limitations: string[];
}

export interface AnalyzeRequest {
  url: string;
}

export interface AnalysisData {
  sourceType: string;
  platform: string;
  canonicalPostUrl: string;
  mediaType: string;
  image?: ImageMetadata;
  publicContext: PublicContext;
  analysis: AnalysisReport;
  warnings?: string[];
}

export interface SuccessResponse {
  ok: true;
  requestId: string;
  data: AnalysisData;
}

export interface ErrorResponse {
  ok: false;
  requestId: string;
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
  };
}

export type AnalyzeResponse = SuccessResponse | ErrorResponse;

export type InputMode = 'url' | 'upload';

export type UIState =
  | { type: 'INITIAL' }
  | { type: 'LOADING'; source: string }
  | { type: 'SUCCESS'; data: SuccessResponse['data']; source: string }
  | { type: 'ERROR'; error: ErrorResponse['error']; source: string; requestId: string };
