import {
  CheckCircle,
  AlertCircle,
  Accessibility,
  MousePointerClick,
  Gauge,
  AlertTriangle,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';
import type { SuccessResponse } from '../types/api';
import { PostMetadata } from './PostMetadata';
import { AnalysisSection } from './AnalysisSection';
import { CopyButton } from './CopyButton';
import { ActionButtons } from './ActionButtons';
import { formatReportAsText } from '../utils/report';

type AnalysisData = SuccessResponse['data'];

interface ResultViewProps {
  data: AnalysisData;
  onAnalyzeAnother: () => void;
  onClear: () => void;
}

function ConfidenceIndicator({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    high: { bg: 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]', text: 'text-[var(--color-success)]', label: 'High' },
    medium: { bg: 'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]', text: 'text-[var(--color-warning)]', label: 'Medium' },
    low: { bg: 'bg-[var(--color-error-bg)] border-[var(--color-error-border)]', text: 'text-[var(--color-error)]', label: 'Low' },
  };
  const c = colors[level] ?? colors.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>
      <Gauge className="h-3 w-3" />
      {c.label} confidence
    </span>
  );
}

function ReadabilityBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    good: { bg: 'bg-[var(--color-success-bg)]', text: 'text-[var(--color-success)]', label: 'Good' },
    needs_improvement: { bg: 'bg-[var(--color-warning-bg)]', text: 'text-[var(--color-warning)]', label: 'Needs improvement' },
    unclear: { bg: 'bg-[var(--color-error-bg)]', text: 'text-[var(--color-error)]', label: 'Unclear' },
  };
  const c = colors[level] ?? colors.unclear;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function ResultView({ data, onAnalyzeAnother, onClear }: ResultViewProps) {
  const reportText = formatReportAsText(data);

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'social-media-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in mx-auto max-w-[720px] space-y-4">
      <div className="flex items-center">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Analyzer
        </button>
      </div>

      <PostMetadata data={data} />

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <AnalysisSection title="Summary">
          <p className="text-[15px] leading-relaxed text-[var(--color-text)]">
            {data.analysis.summary}
          </p>
        </AnalysisSection>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <AnalysisSection title="What Works">
            <ul className="space-y-2">
              {data.analysis.visual_strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" strokeWidth={2} />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </AnalysisSection>
        </div>

        <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <AnalysisSection title="What To Improve">
            <ul className="space-y-2">
              {data.analysis.improvement_opportunities.map((o, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" strokeWidth={2} />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </AnalysisSection>
        </div>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <AnalysisSection title="Accessibility">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                <Accessibility className="h-3.5 w-3.5" />
                Alt Text
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {data.analysis.accessibility.alt_text || (
                  <span className="italic text-[var(--color-text-muted)]">Not provided</span>
                )}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Readability
              </div>
              <ReadabilityBadge level={data.analysis.accessibility.readability} />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Contrast
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {data.analysis.accessibility.contrast_observation}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Text Density
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {data.analysis.accessibility.text_density_observation}
              </p>
            </div>
          </div>
        </AnalysisSection>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex items-center justify-between">
          <AnalysisSection title="Caption Suggestion">
            <></>
          </AnalysisSection>
          <CopyButton text={data.analysis.caption_recommendation} label="Copy caption" />
        </div>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {data.analysis.caption_recommendation}
        </p>
      </div>

      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <AnalysisSection title="Suggested Call to Action">
          <div className="flex items-start gap-2">
            <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <p className="text-[15px] text-[var(--color-text-secondary)]">
              {data.analysis.call_to_action}
            </p>
          </div>
        </AnalysisSection>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
          <AnalysisSection title="Confidence">
            <ConfidenceIndicator level={data.analysis.confidence} />
          </AnalysisSection>
        </div>

        {data.analysis.limitations.length > 0 && (
          <div className="flex-1 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-5">
            <AnalysisSection title="Limitations">
              <ul className="space-y-1.5">
                {data.analysis.limitations.map((l, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </AnalysisSection>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-[var(--color-accent)]" />
            Report Actions
          </h3>
          <CopyButton text={reportText} label="Copy Report" />
        </div>
        <ActionButtons
          onAnalyzeAnother={onAnalyzeAnother}
          onClear={onClear}
          showAnalyzeAnother={true}
          showDownloadJson={true}
          onDownloadJson={handleDownloadJson}
        />
      </div>
    </div>
  );
}
