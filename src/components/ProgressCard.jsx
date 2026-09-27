/**
 * ProgressCard.jsx
 * ----------------
 * Small labeled stat block reused on the Insights page (e.g. "Weekly
 * Completion 68%", "Total Planned 27 hours"). Kept generic so Insights can
 * build its whole grid from one component.
 */
export default function ProgressCard({ label, value, hint, accent = 'textPrimary' }) {
  const accentText = { textPrimary: 'text-textPrimary', accent: 'text-accent', primary: 'text-primary', secondary: 'text-secondary' }[accent];

  return (
    <div className="bg-surface/70 border border-border rounded-xl2 p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-textSecondary/75 mb-1">{label}</p>
      <p className={`font-serif text-3xl ${accentText}`}>{value}</p>
      {hint && <p className="text-xs text-textSecondary/75 mt-1">{hint}</p>}
    </div>
  );
}
