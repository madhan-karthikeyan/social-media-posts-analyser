import { RefreshCw, Pencil, Trash2, ArrowLeft, Download } from 'lucide-react';

interface ActionButtonsProps {
  onRetry?: () => void;
  onEditUrl?: () => void;
  onClear: () => void;
  onAnalyzeAnother: () => void;
  onDownloadJson?: () => void;
  showAnalyzeAnother?: boolean;
  showDownloadJson?: boolean;
}

export function ActionButtons({
  onRetry,
  onEditUrl,
  onClear,
  onAnalyzeAnother,
  onDownloadJson,
  showAnalyzeAnother = false,
  showDownloadJson = false,
}: ActionButtonsProps) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
      {showAnalyzeAnother && (
        <button
          type="button"
          onClick={onAnalyzeAnother}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Analyze another post
        </button>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      )}
      {onEditUrl && (
        <button
          type="button"
          onClick={onEditUrl}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <Pencil className="h-4 w-4" />
          Edit URL
        </button>
      )}
      <button
        type="button"
        onClick={onClear}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
      >
        <Trash2 className="h-4 w-4" />
        Clear
      </button>
      {showDownloadJson && onDownloadJson && (
        <button
          type="button"
          onClick={onDownloadJson}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)]"
        >
          <Download className="h-4 w-4" />
          Download JSON
        </button>
      )}
    </div>
  );
}
