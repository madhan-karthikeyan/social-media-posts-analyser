interface AnalysisSectionProps {
  title: string;
  children: React.ReactNode;
}

export function AnalysisSection({ title, children }: AnalysisSectionProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
      {children}
    </div>
  );
}
