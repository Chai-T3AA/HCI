/**
 * DashboardCard.jsx
 * -----------------
 * One of the four summary tiles at the top of the Dashboard (Total Tasks,
 * Hours Planned, Upcoming Deadlines, Weekly Completion — spec section 8).
 * Purely presentational: the page decides the numbers, this just lays
 * them out consistently.
 */
export default function DashboardCard({ label, value, suffix, icon: Icon, accent = 'textPrimary' }) {
  const accentClasses = {
    textPrimary: 'text-textPrimary bg-textPrimary/5',
    accent: 'text-accent bg-accent/15',
    primary: 'text-primary bg-primary/15',
    secondary: 'text-secondary bg-secondary/15',
  }[accent];

  return (
    <div className="bg-surface/70 border border-border rounded-xl2 p-5 shadow-soft flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-wider text-textSecondary/75 mb-1">{label}</p>
        <p className="font-serif text-3xl text-textPrimary">
          {value}
          {suffix && <span className="text-lg font-sans font-medium text-textSecondary/90 ml-1">{suffix}</span>}
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
