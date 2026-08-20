import { RefreshCw, Pencil, Trash2, ArrowLeft, Download } from 'lucide-react';
import { motion } from 'framer-motion';

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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onAnalyzeAnother}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Analyze another post
        </motion.button>
      )}
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onRetry}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-colors hover:bg-[var(--color-accent-hover)]"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </motion.button>
      )}
      {onEditUrl && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onEditUrl}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]"
        >
          <Pencil className="h-4 w-4" />
          Edit URL
        </motion.button>
      )}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="button"
        onClick={onClear}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error)] hover:border-[var(--color-error-border)]"
      >
        <Trash2 className="h-4 w-4" />
        Clear
      </motion.button>
      {showDownloadJson && onDownloadJson && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onDownloadJson}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]"
        >
          <Download className="h-4 w-4" />
          Download JSON
        </motion.button>
      )}
    </div>
  );
}
