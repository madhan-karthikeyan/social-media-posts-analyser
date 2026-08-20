import { X } from 'lucide-react';
import type { InputMode } from '../types/api';

export function LoadingView({ 
  source, 
  mode, 
  onCancel 
}: { 
  source: string; 
  mode: InputMode;
  onCancel: () => void;
}) {
  return (
    <div className="fade-in mx-auto max-w-[720px]">
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-7">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
            <p
              aria-live="polite"
              className="text-sm font-medium text-[var(--color-accent)]"
            >
              Analyzing {mode === 'url' ? 'URL' : 'file'}...
            </p>
          </div>
          <button
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>

        <div className="mb-3 h-5 w-48 skeleton rounded" />

        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="flex-1 space-y-3">
            <div className="skeleton h-4 w-20 rounded" />
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-4 w-24 rounded" />
          </div>
          <div className="flex-1">
            <div className="skeleton aspect-[4/3] w-full rounded-[var(--radius-md)]" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-5/6 rounded" />
            <div className="skeleton h-3 w-4/6 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-32 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
          <div className="space-y-2">
            <div className="skeleton h-4 w-28 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-4/5 rounded" />
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--color-text-muted)] truncate">
        Analyzing: {source}
      </p>
    </div>
  );
}
