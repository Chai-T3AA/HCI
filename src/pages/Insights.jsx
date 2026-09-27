/**
 * Insights.jsx
 * ------------
 * Productivity insights page (spec section 28): weekly completion %,
 * hours planned/completed/remaining, busiest day, and freest day — all
 * derived from getWeeklyStats over the current week's activities so it
 * never drifts out of sync with the Calendar/Tasks/Dashboard.
 */
import ProgressCard from '../components/ProgressCard';
import WorkloadOverview from '../components/WorkloadOverview';
import { useActivities } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { getWeekDays, DAY_NAMES } from '../utils/dateUtils';
import { getWeeklyStats } from '../utils/workloadUtils';

export default function Insights() {
  const { activities } = useActivities();
  const { settings, weekStartsOn } = useSettings();
  const weekDays = getWeekDays(new Date(), weekStartsOn);
  const stats = getWeeklyStats(activities, weekDays, settings.maxWorkloadPerDay);

  const busiestLabel = stats.busiestDay && stats.busiestDay.hours > 0 ? DAY_NAMES[stats.busiestDay.date.getDay()] : '—';
  const freestLabel = stats.freestDay ? DAY_NAMES[stats.freestDay.date.getDay()] : '—';

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-textPrimary">Insights</h1>
      <p className="text-textSecondary/90 -mt-4">A quick read on how this week is going.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ProgressCard label="Weekly Completion" value={`${stats.completion}%`} accent="accent" />
        <ProgressCard label="Total Planned" value={`${stats.hoursPlanned}h`} accent="textPrimary" />
        <ProgressCard label="Completed" value={`${stats.hoursCompleted}h`} accent="primary" />
        <ProgressCard label="Remaining" value={`${stats.hoursRemaining}h`} accent="secondary" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ProgressCard label="Most Busy Day" value={busiestLabel} accent="textPrimary" hint={stats.busiestDay ? `${stats.busiestDay.hours}h scheduled` : undefined} />
        <ProgressCard label="Free Time" value={freestLabel} accent="secondary" hint={stats.freestDay ? `${stats.freestDay.hours}h scheduled` : undefined} />
      </div>

      <WorkloadOverview weekWorkload={stats.weekWorkload} />
    </div>
  );
}
