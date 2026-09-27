/**
 * PriorityBadge.jsx
 * -----------------
 * Small reusable pill that shows an activity's priority. Deliberately
 * pairs a color with an ICON + TEXT LABEL (never color alone), per the
 * spec's accessibility rule that important info must not depend only on
 * color (section 32) and the "attention" cognitive-process goal.
 */
import { Flame, CircleDot, Minus } from 'lucide-react';

const CONFIG = {
  // Fixed (theme-invariant) chocolate chip — the strongest, most "serious"
  // tone available, reserved for the highest urgency level, same brand
  // color as the sidebar so it reads as "most emphasis" in both themes.
  high: { label: 'HIGH', icon: Flame, className: 'bg-sidebar text-onSidebar' },
  medium: { label: 'MEDIUM', icon: CircleDot, className: 'bg-primary text-onAccent' },
  low: { label: 'LOW', icon: Minus, className: 'bg-secondary/20 text-textPrimary' },
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
