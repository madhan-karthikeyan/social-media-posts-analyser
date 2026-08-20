import { Search, Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-accent)]">
            <Search className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text)]">
            Content Analyzer
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
          <Shield className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">No login required</span>
        </div>
      </div>
    </header>
  );
}
