/**
 * ProgressCard.jsx
 * ----------------
 * Small labeled stat block reused on the Insights page (e.g. "Weekly
 * Completion 68%", "Total Planned 27 hours"). Kept generic so Insights can
 * build its whole grid from one component.
 */
export default function ProgressCard({ label, value, hint, accent = 'navy' }) {
  const accentText = { navy: 'text-navy', amber: 'text-amber-700', current: 'text-current', haze: 'text-haze' }[accent];

  return (
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-navy/50 mb-1">{label}</p>
      <p className={`font-serif text-3xl ${accentText}`}>{value}</p>
      {hint && <p className="text-xs text-navy/50 mt-1">{hint}</p>}
    </div>
  );
}
