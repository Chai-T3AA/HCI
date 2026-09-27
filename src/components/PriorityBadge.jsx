/**
 * PriorityBadge.jsx
 * -----------------
 * Small reusable pill that shows an activity's priority. Deliberately
 * pairs a color with an ICON + TEXT LABEL (never color alone), per the
 * spec's accessibility rule that important info must not depend only on
 * color (section 32) and the "attention" cognitive-process goal.
 */
import { Flame, CircleDot, Minus } from 'lucide-react';

// Fixed 3-step priority scale (priorityHigh/Medium/Low, tailwind.config.js)
// — one scale, the same in both themes, independent of primary/secondary so
// "how urgent is this" stays visually consistent regardless of light/dark.
const CONFIG = {
  high: { label: 'HIGH', icon: Flame, className: 'bg-priorityHigh text-onSidebar' },
  medium: { label: 'MEDIUM', icon: CircleDot, className: 'bg-priorityMedium text-onAccent' },
  low: { label: 'LOW', icon: Minus, className: 'bg-priorityLow text-onAccent' },
};

export default function PriorityBadge({ priority, size = 'sm' }) {
  const config = CONFIG[priority] ?? CONFIG.low;
  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ${sizeClasses} ${config.className}`}
    >
      <Icon size={size === 'sm' ? 10 : 12} strokeWidth={2.5} />
      {config.label}
    </span>
  );
}
