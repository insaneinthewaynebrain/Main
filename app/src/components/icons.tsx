const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function CalculatorIcon() {
  return (
    <svg {...base} width="26" height="26">
      <rect x="4.5" y="2.5" width="15" height="19" rx="3" />
      <rect x="7.5" y="5.5" width="9" height="4" rx="1" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth="2.6" />
    </svg>
  );
}

export function ShortlistIcon() {
  return (
    <svg {...base} width="26" height="26">
      <path d="M6 3.5h12a1.5 1.5 0 0 1 1.5 1.5v16l-7.5-4-7.5 4V5A1.5 1.5 0 0 1 6 3.5z" />
    </svg>
  );
}

export function StarIcon({ filled = false, size = 22 }: { filled?: boolean; size?: number }) {
  return (
    <svg {...base} width={size} height={size} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-2.9-5.4 2.9 1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg {...base} width="22" height="22">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function LinkIcon() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg {...base} width="18" height="18">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export function CameraIcon() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg {...base} width="20" height="20">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CompareIcon() {
  return (
    <svg {...base} width="20" height="20">
      <rect x="3.5" y="4.5" width="7" height="15" rx="1.5" />
      <rect x="13.5" y="4.5" width="7" height="15" rx="1.5" />
    </svg>
  );
}

export function CarIcon() {
  return (
    <svg {...base} width="40" height="40" strokeWidth="1.4">
      <path d="M3.5 15.5v-3l2-5a2 2 0 0 1 1.9-1.3h9.2a2 2 0 0 1 1.9 1.3l2 5v3a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1z" />
      <path d="M3.5 12.5h17" />
      <circle cx="7.5" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
    </svg>
  );
}
