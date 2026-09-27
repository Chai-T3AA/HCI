/**
 * WeeklyCalendar.jsx
 * ------------------
 * The full Calendar feature, wired together: owns the current date, the
 * active view (day/week/month), search text and priority filter, and the
 * open/closed state of the Add/Edit/Details modals. Delegates rendering to
 * CalendarHeader + CalendarGrid/MonthView, and delegates all data reads
 * and writes to the shared ActivityContext (so every change here — add,
 * edit, delete, complete, drag-to-move — is immediately reflected on the
 * Dashboard, Tasks and Insights pages too).
 */
import { useMemo, useRef, useState } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import MonthView from './MonthView';
import AddActivityModal from './AddActivityModal';
import ActivityDetails from './ActivityDetails';
import { useActivities } from '../context/ActivityContext';
import { useSettings } from '../context/SettingsContext';
import { addDays, getWeekDays, formatWeekRange, toDateKey } from '../utils/dateUtils';

// How far (px) a touch has to travel horizontally, and how much more
// horizontal than vertical movement it needs, before it counts as a
// deliberate "swipe to change week/day" gesture rather than an attempt to
// scroll the grid vertically or just a stray finger wobble.
const SWIPE_THRESHOLD_PX = 60;

export default function WeeklyCalendar() {
  const { activities, deleteActivity, toggleComplete, moveActivity } = useActivities();
  const { settings, weekStartsOn } = useSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'day' | 'week' | 'month'
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [defaultDate, setDefaultDate] = useState(null);
  const [defaultStartTime, setDefaultStartTime] = useState(null);
  const [detailsActivity, setDetailsActivity] = useState(null);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (!settings.showCompletedOnCalendar && a.completed) return false;
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [activities, search, priorityFilter, settings.showCompletedOnCalendar]);

  const daysToShow = view === 'day' ? [currentDate] : getWeekDays(currentDate, weekStartsOn);
  const rangeLabel = view === 'day'
    ? currentDate.toDateString()
    : view === 'week'
    ? formatWeekRange(daysToShow)
    : 'Click a day to jump to Day view';

  function step(direction) {
    const amount = view === 'day' ? 1 : view === 'week' ? 7 : 30;
    setCurrentDate((d) => addDays(d, direction * amount));
  }

  function openAddModal(dateKey, startTime) {
    setEditingActivity(null);
    setDefaultDate(dateKey ?? toDateKey(currentDate));
    setDefaultStartTime(startTime ?? null);
    setModalOpen(true);
  }

  function openEditModal(activity) {
    setDetailsActivity(null);
    setEditingActivity(activity);
    setDefaultDate(activity.date);
    setDefaultStartTime(null);
    setModalOpen(true);
  }

  // --- Mobile swipe-to-navigate (Month view only) ---
  // Week/Day view now handle their own edge-swipe inside CalendarGrid,
  // because they have their own horizontal scroll region (7 day-columns
  // don't fit a phone screen) and swiping needs to know that scroll
  // position to tell "scroll to see more of this week" apart from "swipe
  // to the next week" — see the long comment in CalendarGrid.jsx. Month
  // view has no such horizontal scroll (it's a static 7-column grid that
  // already fits), so its swipe-to-change-month stays simple, here.
  const touchStart = useRef(null); // { x, y } | null

  function handleTouchStart(e) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return; // not a horizontal swipe
    step(dx < 0 ? 1 : -1); // swipe left -> next, swipe right -> previous
  }

  return (
    <div className="flex flex-col h-full">
      <CalendarHeader
        currentDate={currentDate}
        rangeLabel={rangeLabel}
        view={view}
        onView={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setCurrentDate(new Date())}
        search={search}
        onSearch={setSearch}
        priorityFilter={priorityFilter}
        onPriorityFilter={setPriorityFilter}
        onAdd={() => openAddModal(toDateKey(currentDate))}
      />

      {view === 'month' ? (
        <div className="flex-1 min-h-0 flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <MonthView
            monthDate={currentDate}
            activities={filtered}
            weekStartsOn={weekStartsOn}
            onSelectDay={(day) => {
              setCurrentDate(day);
              setView('day');
            }}
            onEventClick={setDetailsActivity}
          />
        </div>
      ) : (
        <CalendarGrid
          days={daysToShow}
          activities={filtered}
          maxWorkloadPerDay={settings.maxWorkloadPerDay}
          onSlotClick={(dateKey, startTime) => openAddModal(dateKey, startTime)}
          onEventClick={setDetailsActivity}
          onMoveActivity={(id, date, startTime) => moveActivity(id, { date, startTime })}
          onSwipeWeek={step}
        />
      )}

      <AddActivityModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        activityToEdit={editingActivity}
        defaultDate={defaultDate}
        defaultStartTime={defaultStartTime}
      />

      <ActivityDetails
        activity={detailsActivity}
        onClose={() => setDetailsActivity(null)}
        onToggleComplete={(id) => {
          toggleComplete(id);
          setDetailsActivity(null);
        }}
        onEdit={openEditModal}
        onDelete={(id) => {
          deleteActivity(id);
          setDetailsActivity(null);
        }}
      />
    </div>
  );
}
