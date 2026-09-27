/**
 * Calendar.jsx
 * ------------
 * Route wrapper for the Calendar feature. All the real logic lives in the
 * WeeklyCalendar component (state, views, modals) — this page just gives
 * it a full-height container so the time grid can scroll independently of
 * the rest of the app shell.
 */
import WeeklyCalendar from '../components/WeeklyCalendar';

export default function Calendar() {
  return (
    <div className="h-[calc(100vh-4rem)] bg-surface/70 border border-border rounded-xl2 shadow-soft p-5 flex flex-col">
      <WeeklyCalendar />
    </div>
  );
}
