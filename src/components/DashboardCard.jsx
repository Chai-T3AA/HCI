/**
 * DashboardCard.jsx
 * -----------------
 * One of the four summary tiles at the top of the Dashboard (Total Tasks,
 * Hours Planned, Upcoming Deadlines, Weekly Completion — spec section 8).
 * Purely presentational: the page decides the numbers, this just lays
 * them out consistently.
 */
export default function DashboardCard({ label, value, suffix, icon: Icon, accent = 'navy' }) {
  const accentClasses = {
    navy: 'text-navy bg-navy/5',
    amber: 'text-amber-700 bg-amber/15',
    current: 'text-current bg-current/10',
    haze: 'text-haze bg-haze/15',
  }[accent];

  return (
    <div className="bg-white/70 border border-navy/10 rounded-xl2 p-5 shadow-soft flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-navy/50 mb-1">{label}</p>
        <p className="font-serif text-3xl text-navy">
          {value}
          {suffix && <span className="text-lg font-sans font-medium text-navy/60 ml-1">{suffix}</span>}
        </p>
      </div>
      {Icon && (
        <div className={`h-11 w-11 rounded-full flex items-center justify-center ${accentClasses}`}>
          <Icon size={20} />
        </div>
      )}
    </div>
  );
}
