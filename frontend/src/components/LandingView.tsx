import { Search, Info, Link, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { UrlInput } from './UrlInput';
import { FileUpload } from './FileUpload';
import { PlatformBadges } from './PlatformBadges';
import type { InputMode } from '../types/api';
import type { RefObject } from 'react';

interface LandingViewProps {
  url: string;
  onUrlChange: (url: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onAnalyze: () => void;
  onClear: () => void;
  validationError: string | null;
  isLoading: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputMode: InputMode;
  onInputModeChange: (mode: 'url' | 'upload') => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  fileError: string | null;
}

export function LandingView({
  url,
  onUrlChange,
  onKeyDown,
  onAnalyze,
  onClear,
  validationError,
  isLoading,
  inputRef,
  inputMode,
  onInputModeChange,
  selectedFile,
  onFileSelect,
  fileError,
}: LandingViewProps) {
  const canSubmit = inputMode === 'url' ? !!url.trim() : !!selectedFile;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-8 text-center sm:mb-10">
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
          Analyze any public social image post
        </h1>
        <p className="mx-auto max-w-lg text-[15px] text-[var(--color-text-secondary)]">
          Get AI-powered improvement recommendations for LinkedIn, Instagram, and X image posts.
        </p>
      </div>

      <div className="mx-auto max-w-[720px]">
        <div className="glass-card rounded-[var(--radius-xl)] overflow-hidden sm:p-7 p-5">
          <div className="mb-4 flex rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] p-1 backdrop-blur-md">
            <button
              type="button"
              onClick={() => onInputModeChange('upload')}
              disabled={isLoading}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-all ${
                inputMode === 'upload'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              } disabled:opacity-50`}
            >
              <Upload className="h-4 w-4" />
              Upload file
            </button>
            <button
              type="button"
              onClick={() => onInputModeChange('url')}
              disabled={isLoading}
              className={`flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition-all ${
                inputMode === 'url'
                  ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
              } disabled:opacity-50`}
            >
              <Link className="h-4 w-4" />
              Paste URL
            </button>
          </div>

          {inputMode === 'upload' ? (
            <FileUpload
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              disabled={isLoading}
              error={fileError}
            />
          ) : (
            <UrlInput
              value={url}
              onChange={onUrlChange}
              onKeyDown={onKeyDown}
              disabled={isLoading}
              error={validationError}
              inputRef={inputRef}
            />
          )}

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onAnalyze}
              disabled={isLoading || !canSubmit}
              className="inline-flex h-11 w-full sm:flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Analyzing…' : 'Analyze post'}
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={isLoading || (!url && !selectedFile)}
              className="inline-flex h-11 w-full sm:w-auto items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 sm:mt-6 sm:flex-row sm:justify-center sm:gap-5">
          <PlatformBadges />
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>Public image posts only. No video, carousels, or direct image URLs.</span>
        </div>

        <p className="mt-3 text-center text-xs text-[var(--color-text-muted)]">
          No login required. We do not store your data.
        </p>
      </div>
    </motion.div>
  );
}
