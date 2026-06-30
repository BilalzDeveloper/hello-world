// Inline stroke-based icons (24x24 viewBox), copied 1:1 from the design's SVG
// paths so the recreation stays pixel-faithful without adding an icon-library dependency.

const base = (size, stroke) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
  stroke, strokeLinecap: 'round', strokeLinejoin: 'round',
});

export function StorefrontIcon({ size = 17, stroke = '#fff', width = 1.8 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M4 9h16l-1-5H5L4 9z" />
      <path d="M5 9v11h14V9" />
      <path d="M9.5 20v-6h5v6" />
    </svg>
  );
}

export function SearchIcon({ size = 15, stroke = 'currentColor', width = 1.9 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function BellIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function HomeIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.7V20h13V9.7" />
    </svg>
  );
}

export function ClipboardCheckIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <rect x="6" y="4.5" width="12" height="16.5" rx="2" />
      <path d="M9 4.5V3.2h6v1.3" />
      <path d="m9.4 12.6 1.9 1.9 3.4-3.9" />
    </svg>
  );
}

export function StarIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M12 3.2l1.9 5.4 5.6.2-4.4 3.4 1.6 5.4L12 14.8l-4.7 2.8 1.6-5.4L4.5 8.8l5.6-.2z" />
    </svg>
  );
}

export function BoxIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M4 9h16l-1.2-5H5.2L4 9z" />
      <path d="M5 9v11h14V9" />
      <path d="M9.5 20v-5.5h5V20" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 15, stroke = 'currentColor', width = 2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ size = 12, stroke = '#fff', width = 3.2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="m5 12 4.5 4.5L19 7" />
    </svg>
  );
}

export function AlertCircleIcon({ size = 14, stroke = 'currentColor', width = 2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16v.2" />
    </svg>
  );
}

export function PhotoIcon({ size = 26, stroke = '#b5b5b5', width = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m21 16-5-5L5 20" />
    </svg>
  );
}

export function SparkleIcon({ size = 13, fill = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="M12 2l1.9 5.4L19 9l-5.1 1.6L12 16l-1.9-5.4L5 9l5.1-1.6z" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, stroke = '#9a9a9a', width = 2.2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function XIcon({ size = 13, stroke = 'currentColor', width = 2.4 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 22, stroke = '#fff', width = 2.2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 22, stroke = '#fff', width = 2.2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function ExpandIcon({ size = 16, stroke = '#fff', width = 2 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
    </svg>
  );
}

export function SortIcon({ size = 15, stroke = '#8a8a8a', width = 1.8 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <path d="M4 7h13M4 12h9M4 17h5" />
      <path d="m17 14 3 3 3-3" />
      <path d="M20 17V8" />
    </svg>
  );
}

export function UsersIcon({ size = 20, stroke = 'currentColor', width = 1.8 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.2 2.5-5.3 5.5-5.3s5.5 2.1 5.5 5.3" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.8c2.1.6 3.5 2.3 3.5 4.4" />
    </svg>
  );
}

export function GearIcon({ size = 18, stroke = 'currentColor', width = 1.7 }) {
  return (
    <svg {...base(size, stroke)} strokeWidth={width}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.4 7.4 0 0 0 0-3l1.9-1.5-2-3.4-2.2.7a7.4 7.4 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.3a7.4 7.4 0 0 0-2.6 1.5l-2.2-.7-2 3.4 1.9 1.5a7.4 7.4 0 0 0 0 3l-1.9 1.5 2 3.4 2.2-.7a7.4 7.4 0 0 0 2.6 1.5l.5 2.3h4l.5-2.3a7.4 7.4 0 0 0 2.6-1.5l2.2.7 2-3.4z" />
    </svg>
  );
}
