import { ExternalLink, Image } from 'lucide-react';
import type { SuccessResponse } from '../types/api';

type PostData = SuccessResponse['data'];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function capitalize(s?: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function platformColor(platform: string): { bg: string, text: string } {
  switch (platform) {
    case 'linkedin': return { bg: '#e0f0ff', text: '#004b8b' };
    case 'instagram': return { bg: '#fce3e7', text: '#a31535' };
    case 'x': return { bg: '#e5e7eb', text: '#000000' };
    default: return { bg: '#f3f4f6', text: '#374151' };
  }
}

export function PostMetadata({ data }: { data: PostData }) {
  const pColor = platformColor(data.platform);
  
  return (
    <div className="fade-in rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: pColor.bg, color: pColor.text }}
          >
            {capitalize(data.platform)}
          </span>
          <span className="text-sm font-medium text-[var(--color-text)]">
            Analysis complete
          </span>
        </div>
        {data.canonicalPostUrl ? (
          <a
            href={data.canonicalPostUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[300px]">{data.canonicalPostUrl}</span>
          </a>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
            <span className="truncate max-w-[300px]">Uploaded file</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Post Context
          </h3>
          <div className="space-y-1.5 text-sm">
            <div>
              <span className="text-[var(--color-text-muted)]">Author: </span>
              <span className="font-medium text-[var(--color-text)]">
                {data.publicContext.authorLabel ?? (
                  <span className="italic text-[var(--color-text-muted)]">Not available publicly</span>
                )}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-text-muted)]">Caption: </span>
              <span className="text-[var(--color-text-secondary)]">
                {data.publicContext.caption ? (
                  <span className="line-clamp-3">{data.publicContext.caption}</span>
                ) : (
                  <span className="italic text-[var(--color-text-muted)]">Not available publicly</span>
                )}
              </span>
            </div>
            {data.publicContext.altText && (
              <div>
                <span className="text-[var(--color-text-muted)]">Alt text: </span>
                <span className="text-[var(--color-text-secondary)]">{data.publicContext.altText}</span>
              </div>
            )}
          </div>
        </div>

        {data.image && (
          <div className="flex-1 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Image Metadata
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <Image className="h-7 w-7 text-[var(--color-text-muted)]" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-medium text-[var(--color-text)]">
                  {data.image.contentType.split('/')[1]?.toUpperCase() ?? data.image.contentType}
                </div>
                {data.image.width > 0 && data.image.height > 0 && (
                  <div className="text-[var(--color-text-secondary)]">
                    {data.image.width} × {data.image.height}
                  </div>
                )}
                <div className="text-[var(--color-text-muted)]">
                  {formatBytes(data.image.bytes)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.warnings && data.warnings.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-md)] bg-[var(--color-warning-bg)] p-3 text-sm text-[var(--color-warning)]">
          <p className="font-semibold mb-1 flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 inline-block text-[var(--color-warning)] border border-current rounded-full text-center leading-3 font-bold">!</span>
            Extraction Warnings
          </p>
          <ul className="list-inside list-disc space-y-1 ml-6 text-xs">
            {data.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
