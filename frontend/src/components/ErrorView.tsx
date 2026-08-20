import {
  AlertTriangle,
  XCircle,
  Lock,
  SearchX,
  ImageOff,
  Film,
  Clock,
  ShieldAlert,
  Brain,
  Bot,
  ServerCrash,
  WifiOff,
  RefreshCw,
  Pencil,
  Trash2,
  Shield,
} from 'lucide-react';
interface ErrorConfig {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
  title: string;
  message: string;
  secondary?: string;
  retryable: boolean;
  showEditUrl: boolean;
  showClear: boolean;
}

const ERROR_CONFIGS: Record<string, ErrorConfig> = {
  INVALID_URL: {
    icon: XCircle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Invalid URL',
    message: 'Enter a valid public LinkedIn, Instagram, or X post URL.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  UNSUPPORTED_PLATFORM: {
    icon: XCircle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Unsupported platform',
    message: 'This platform isn\'t supported. Please use a public LinkedIn, Instagram, or X post.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  PRIVATE_OR_LOGIN_REQUIRED: {
    icon: Lock,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Private post',
    message: 'This post cannot be accessed publicly. Private and login-required posts are not supported.',
    secondary: 'Do not enter your credentials. This application does not support social login.',
    retryable: false,
    showEditUrl: true,
    showClear: true,
  },
  POST_NOT_FOUND: {
    icon: SearchX,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Post not found',
    message: 'We couldn\'t find that public post. Check the URL and make sure the post still exists.',
    retryable: false,
    showEditUrl: true,
    showClear: true,
  },
  PUBLIC_IMAGE_UNAVAILABLE: {
    icon: ImageOff,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Image unavailable',
    message: 'We found the post, but its public image could not be retrieved.',
    retryable: true,
    showEditUrl: true,
    showClear: false,
  },
  NO_PUBLIC_MEDIA: {
    icon: SearchX,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'No Content Found',
    message: 'The file or link provided does not contain any extractable text or imagery.',
    retryable: false,
    showEditUrl: true,
    showClear: true,
  },
  NO_PUBLIC_METADATA: {
    icon: Lock,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Content Blocked',
    message: 'The platform blocked public access to this post. Please use a screenshot instead!',
    retryable: false,
    showEditUrl: true,
    showClear: true,
  },
  UNSUPPORTED_MEDIA: {
    icon: Film,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Unsupported media',
    message: 'This post contains unsupported media. Only a single still image is supported.',
    secondary: 'Videos, Reels, and carousels are not supported.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  IMAGE_TOO_LARGE: {
    icon: ImageOff,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Image too large',
    message: 'The image is too large to process.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  INVALID_IMAGE: {
    icon: ImageOff,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Invalid image',
    message: 'The post did not contain a valid supported image.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  FETCH_TIMEOUT: {
    icon: Clock,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Request timed out',
    message: 'The social post took too long to retrieve.',
    retryable: true,
    showEditUrl: true,
    showClear: false,
  },
  SSRF_BLOCKED: {
    icon: ShieldAlert,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'URL blocked',
    message: 'The requested URL was blocked for security reasons.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  AI_QUOTA_EXCEEDED: {
    icon: Brain,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'AI quota reached',
    message: 'AI analysis is temporarily unavailable because the available quota has been reached. Please try again later.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  AI_TIMEOUT: {
    icon: Clock,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'AI analysis timed out',
    message: 'The image was retrieved, but AI analysis took too long.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  AI_UPSTREAM_ERROR: {
    icon: Bot,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'AI service error',
    message: 'The AI service could not complete the analysis.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  AI_INVALID_OUTPUT: {
    icon: Bot,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Unexpected AI response',
    message: 'The analysis service returned an unexpected result.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  RATE_LIMITED: {
    icon: Shield,
    iconColor: 'text-[var(--color-warning)]',
    iconBg: 'bg-[var(--color-warning-bg)]',
    title: 'Rate limited',
    message: 'Too many requests were made in a short period. Please wait a moment and try again.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  INTERNAL_ERROR: {
    icon: ServerCrash,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Server error',
    message: 'Something went wrong while processing the request.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
  UNSUPPORTED_FILE_TYPE: {
    icon: XCircle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Unsupported file type',
    message: 'Unsupported file type. Please upload a JPG, PNG, WebP, GIF, or PDF.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  FILE_TOO_LARGE: {
    icon: XCircle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'File too large',
    message: 'The file is too large. Maximum size is 20 MB.',
    retryable: false,
    showEditUrl: true,
    showClear: false,
  },
  NETWORK_ERROR: {
    icon: WifiOff,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Connection failed',
    message: 'We couldn\'t connect to the analysis service.',
    secondary: 'Check your connection and try again.',
    retryable: true,
    showEditUrl: false,
    showClear: true,
  },
  UNKNOWN_ERROR: {
    icon: AlertTriangle,
    iconColor: 'text-[var(--color-error)]',
    iconBg: 'bg-[var(--color-error-bg)]',
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
    retryable: true,
    showEditUrl: false,
    showClear: false,
  },
};

interface ErrorViewProps {
  code: string;
  message: string;
  retryable: boolean;
  onRetry: () => void;
  onEditUrl: () => void;
  onClear: () => void;
  inputMode?: 'url' | 'upload';
}

export function ErrorView({ code, message, retryable, onRetry, onEditUrl, onClear, inputMode }: ErrorViewProps) {
  const config = ERROR_CONFIGS[code] ?? ERROR_CONFIGS['UNKNOWN_ERROR'];
  const Icon = config.icon;

  return (
    <div className="fade-in mx-auto max-w-[600px]">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${config.iconBg}`}
          >
            <Icon className={`h-7 w-7 ${config.iconColor}`} strokeWidth={1.8} />
          </div>

          <h2 className="mb-2 text-lg font-semibold text-[var(--color-text)]">
            {config.title}
          </h2>

          <p className="mb-1 max-w-sm text-[15px] text-[var(--color-text-secondary)]">
            {message || config.message}
          </p>

          {config.secondary && (
            <p className="mb-1 max-w-sm text-sm text-[var(--color-text-muted)]">
              {config.secondary}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          {retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
          {(config.showEditUrl || (!retryable && !config.showEditUrl && !config.showClear)) && (
            <button
              type="button"
              onClick={onEditUrl}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              <Pencil className="h-4 w-4" />
              {inputMode === 'upload' ? 'Choose another file' : 'Edit URL'}
            </button>
          )}
          {config.showClear && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
