import type { RefObject } from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  disabled: boolean;
  error: string | null;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export function UrlInput({ value, onChange, onKeyDown, disabled, error, inputRef }: UrlInputProps) {
  return (
    <div className="w-full">
      <label
        htmlFor="url-input"
        className="mb-1.5 block text-sm font-medium text-[var(--color-text)]"
      >
        Post URL
      </label>
      <input
        ref={inputRef}
        id="url-input"
        type="url"
        autoComplete="url"
        spellCheck={false}
        placeholder="Paste a LinkedIn, Instagram, or X post URL…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? 'url-error' : undefined}
        className="h-12 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[15px] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] transition-colors focus:border-[var(--color-accent)] focus:ring-0 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      {error && (
        <p
          id="url-error"
          role="alert"
          className="mt-1.5 text-sm text-[var(--color-error)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
