interface Props<T extends string> {
  tabs: { id: T; label: string; badge?: string }[];
  active: T;
  onChange: (id: T) => void;
}

/** Pill-style section switcher that sticks to the top while scrolling. */
export default function SectionTabs<T extends string>({ tabs, active, onChange }: Props<T>) {
  return (
    <nav className="section-tabs" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={active === t.id ? 'on' : ''}
          aria-current={active === t.id ? 'true' : undefined}
          onClick={() => onChange(t.id)}
        >
          {t.badge && <span className={`tab-dot tab-dot--${t.badge}`} aria-hidden="true" />}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
