/**
 * Sidebar.jsx
 * -----------
 * Left-hand app navigation. Renders the TimeWise wordmark, the five main
 * nav links, a "Weekly Progress" snapshot, and a user profile footer.
 *
 * Two independent responsive behaviors live here:
 *  - Mobile (< md): off-canvas drawer. Controlled by the `open`/`onClose`
 *    props, which App.jsx owns (it renders the hamburger button and the
 *    dark backdrop). Sidebar itself has no button to open on mobile —
 *    that's intentional, App.jsx is the one with the hamburger.
 *  - Desktop (>= md): a collapsible "tiny rail" mode, self-contained via
 *    the local `collapsed` state and the chevron button in the top-right
 *    corner of the aside.
 */
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Clock3, LayoutDashboard, CalendarDays, ListChecks, LineChart, Settings,
  User, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useActivities } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { getWeekDays } from '../utils/dateUtils';
import { getWeeklyStats } from '../utils/workloadUtils';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/insights', label: 'Insights', icon: LineChart },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open = false, onClose }) {
  const { activities } = useActivities();
  const { settings, weekStartsOn } = useSettings();
  const stats = getWeeklyStats(activities, getWeekDays(new Date(), weekStartsOn), settings.maxWorkloadPerDay);
  const [collapsed, setCollapsed] = useState(false); // desktop-only "tiny rail" mode

  return (
    <>
      {/* Dark backdrop behind the drawer on mobile; tapping it closes the sidebar. */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-sidebar/50 md:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 bg-sidebar text-onSidebar flex flex-col
          transform transition-all duration-200 ease-out
          md:sticky md:top-0 md:h-screen md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
          ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Desktop-only collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:flex absolute -right-3 top-8 h-6 w-6 items-center justify-center
            rounded-full bg-sidebar border border-onSidebar/20 text-onSidebar/70 hover:text-onSidebar"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo / wordmark */}
        <div className={`px-6 py-7 flex items-center gap-2 border-b border-onSidebar/10 ${collapsed ? 'md:justify-center' : ''}`}>
          <Clock3 size={22} className="text-sidebarActiveIcon shrink-0" />
          {!collapsed && <span className="font-serif text-xl tracking-wide">TimeWise</span>}
        </div>

        {/* Primary navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  collapsed ? 'md:justify-center md:px-0' : ''
                } ${
                  isActive
                    ? 'bg-sidebarActive text-sidebarActiveIcon'
                    : 'text-sidebarInactive hover:bg-onSidebar/10 hover:text-onSidebar'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Weekly progress snapshot */}
        {!collapsed && (
          <div className="mx-4 mb-4 rounded-xl border border-onSidebar/10 bg-onSidebar/5 p-4">
            <p className="text-xs uppercase tracking-wider text-onSidebar/60 mb-2">Weekly Progress</p>
            <div className="flex items-end justify-between">
              <span className="font-serif text-2xl text-sidebarActiveIcon">{stats.completion}%</span>
              <span className="text-xs text-onSidebar/60">{stats.hoursCompleted}h / {stats.hoursPlanned}h</span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-onSidebar/10 overflow-hidden">
              <div className="h-full bg-sidebarActiveIcon rounded-full transition-all" style={{ width: `${stats.completion}%` }} />
            </div>
          </div>
        )}

        {/* User profile footer */}
        <div className={`px-4 py-4 border-t border-onSidebar/10 flex items-center gap-3 ${collapsed ? 'md:justify-center' : ''}`}>
          <div className="h-9 w-9 rounded-full bg-sidebarActive flex items-center justify-center shrink-0">
            <User size={16} className="text-sidebarActiveIcon" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{settings.name}</p>
              <p className="text-xs text-onSidebar/50 truncate">student@campus.edu</p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
