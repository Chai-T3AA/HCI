/**
 * Sidebar.jsx
 * -----------
 * Left-hand app navigation (spec section 7). Renders the TimeWise wordmark,
 * the five main nav links, a compact "Weekly Progress" ring pulled live
 * from the shared activity data (so it's never stale), and a user profile
 * footer. Uses NavLink so the active route gets the Sandy Amber highlight
 * described in the spec ("subtle selected/highlighted states").
 */
import { NavLink } from 'react-router-dom';
import { Clock3, LayoutDashboard, CalendarDays, ListChecks, LineChart, Settings, User } from 'lucide-react';
import { useActivities } from '../context/ActivityContext';
import { getWeekDays } from '../utils/dateUtils';
import { getWeeklyStats } from '../utils/workloadUtils';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/insights', label: 'Insights', icon: LineChart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activities } = useActivities();
  const stats = getWeeklyStats(activities, getWeekDays(new Date()));

  return (
    <aside className="w-64 shrink-0 bg-navy text-cream flex flex-col h-screen sticky top-0">
      {/* Logo / wordmark */}
      <div className="px-6 py-7 flex items-center gap-2 border-b border-cream/10">
        <Clock3 size={22} className="text-amber" />
        <span className="font-serif text-xl tracking-wide">TimeWise</span>
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-amber/20 text-amber border border-amber/40'
                  : 'text-cream/80 hover:bg-cream/10 hover:text-cream'
              }`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Weekly progress snapshot */}
      <div className="mx-4 mb-4 rounded-xl border border-cream/10 bg-cream/5 p-4">
        <p className="text-xs uppercase tracking-wider text-cream/60 mb-2">Weekly Progress</p>
        <div className="flex items-end justify-between">
          <span className="font-serif text-2xl text-amber">{stats.completion}%</span>
          <span className="text-xs text-cream/60">{stats.hoursCompleted}h / {stats.hoursPlanned}h</span>
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-cream/10 overflow-hidden">
          <div className="h-full bg-amber rounded-full transition-all" style={{ width: `${stats.completion}%` }} />
        </div>
      </div>

      {/* User profile footer */}
      <div className="px-4 py-4 border-t border-cream/10 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-amber/20 border border-amber/40 flex items-center justify-center">
          <User size={16} className="text-amber" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">Student</p>
          <p className="text-xs text-cream/50 truncate">student@campus.edu</p>
        </div>
      </div>
    </aside>
  );
}
