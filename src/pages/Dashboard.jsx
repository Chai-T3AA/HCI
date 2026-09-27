/**
 * Dashboard.jsx (Home)
 * --------------------
 * Landing page (spec section 8): a greeting, a week selector, four summary
 * tiles, a workload overview chart, and a preview of the Weekly Planner
 * (today's + this week's activities as cards). All numbers come from
 * getWeeklyStats/getWeekWorkload over the shared activity list, so this
 * page is always in sync with whatever was just added/edited elsewhere.
 */
import { useState } from 'react';
import { ListChecks, Clock4, AlertCircle, TrendingUp, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardCard from '../components/DashboardCard';
import WorkloadOverview from '../components/WorkloadOverview';
import PriorityBreakdown from '../components/PriorityBreakdown';
import ActivityCard from '../components/ActivityCard';
import AddActivityModal from '../components/AddActivityModal';
import ActivityDetails from '../components/ActivityDetails';
import { useActivities } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { addDays, getWeekDays, formatWeekRangeLong, DAY_NAMES, toDateKey } from '../utils/dateUtils';
import { getWeeklyStats } from '../utils/workloadUtils';

export default function Dashboard() {
  const { activities, deleteActivity, toggleComplete } = useActivities();
  const { settings, weekStartsOn } = useSettings();
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [detailsActivity, setDetailsActivity] = useState(null);

  const weekDays = getWeekDays(weekAnchor, weekStartsOn);
  const stats = getWeeklyStats(activities, weekDays, settings.maxWorkloadPerDay);
  const weekKeys = new Set(weekDays.map(toDateKey));
  const weekActivities = activities
    .filter((a) => weekKeys.has(a.date))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

  function openEdit(activity) {
    setDetailsActivity(null);
    setEditingActivity(activity);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header + week selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-textPrimary">Good morning, {settings.name}</h1>
          <p className="text-textSecondary/90 mt-1">Here's what your week looks like.</p>
        </div>

        <div className="flex items-center gap-2 bg-surface/70 border border-border rounded-lg px-3 py-2 shadow-soft">
          <button onClick={() => setWeekAnchor((d) => addDays(d, -7))} className="text-textSecondary/75 hover:text-textPrimary">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-textPrimary px-1 whitespace-nowrap">{formatWeekRangeLong(weekDays)}</span>
          <button onClick={() => setWeekAnchor((d) => addDays(d, 7))} className="text-textSecondary/75 hover:text-textPrimary">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setWeekAnchor(new Date())}
            className="ml-2 text-xs font-semibold px-2.5 py-1 rounded-md border border-border hover:bg-textPrimary/5"
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard label="Total Tasks" value={stats.totalTasks} icon={ListChecks} accent="textPrimary" />
        <DashboardCard label="Hours Planned" value={stats.hoursPlanned} suffix="h" icon={Clock4} accent="primary" />
        <DashboardCard label="Upcoming Deadlines" value={stats.upcomingDeadlines} icon={AlertCircle} accent="accent" />
        <DashboardCard label="Weekly Completion" value={stats.completion} suffix="%" icon={TrendingUp} accent="secondary" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* flex flex-col + the two cards below both being flex-1 is what
            closes the gap that used to sit under Workload Overview: this
            column now stretches to match the taller activities list on the
            right, and the two cards share that height instead of leaving
            empty cream space beneath a single fixed-height card. */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <WorkloadOverview weekWorkload={stats.weekWorkload} />
          <PriorityBreakdown activities={weekActivities} />
        </div>

        {/* Weekly planner preview */}
        <div className="lg:col-span-2 bg-surface/70 border border-border rounded-xl2 p-5 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg text-textPrimary">This Week's Activities</h3>
            <button
              onClick={() => {
                setEditingActivity(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-onAccent hover:bg-primary-600"
            >
              <Plus size={14} /> Add Activity
            </button>
          </div>

          {weekActivities.length === 0 ? (
            <p className="text-sm text-textSecondary/75 italic py-8 text-center">No activities scheduled this week yet.</p>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
              {weekDays.map((day) => {
                const dateKey = toDateKey(day);
                const dayActivities = weekActivities.filter((a) => a.date === dateKey);
                if (dayActivities.length === 0) return null;
                return (
                  <div key={dateKey}>
                    <p className="text-xs font-semibold text-textSecondary/75 uppercase tracking-wider mb-2">
                      {DAY_NAMES[day.getDay()]} · {day.getDate()}
                    </p>
                    <div className="space-y-2">
                      {dayActivities.map((a) => (
                        <ActivityCard
                          key={a.id}
                          activity={a}
                          onToggleComplete={toggleComplete}
                          onEdit={openEdit}
                          onDelete={deleteActivity}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddActivityModal open={modalOpen} onClose={() => setModalOpen(false)} activityToEdit={editingActivity} />
      <ActivityDetails
        activity={detailsActivity}
        onClose={() => setDetailsActivity(null)}
        onToggleComplete={toggleComplete}
        onEdit={openEdit}
        onDelete={(id) => {
          deleteActivity(id);
          setDetailsActivity(null);
        }}
      />
    </div>
  );
}
