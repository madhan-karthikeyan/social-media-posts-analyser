export function PlatformBadges() {
  const platforms = [
    { name: 'LinkedIn', color: '#0a66c2' },
    { name: 'Instagram', color: '#e4405f' },
    { name: 'X', color: '#000000' },
  ];

  return (
    <div className="flex items-center gap-2">
      {platforms.map((p) => (
        <span
          key={p.name}
          className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
        >
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}
        </span>
      ))}
    </div>
  );
}
