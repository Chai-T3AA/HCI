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
import { useMemo, useState } from 'react';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
import MonthView from './MonthView';
import AddActivityModal from './AddActivityModal';
import ActivityDetails from './ActivityDetails';
import { useActivities } from '../context/ActivityContext';
import { addDays, getWeekDays, formatWeekRange, toDateKey } from '../utils/dateUtils';

export default function WeeklyCalendar() {
  const { activities, deleteActivity, toggleComplete, moveActivity } = useActivities();

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
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || a.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [activities, search, priorityFilter]);

  const daysToShow = view === 'day' ? [currentDate] : getWeekDays(currentDate);
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
        <MonthView
          monthDate={currentDate}
          activities={filtered}
          onSelectDay={(day) => {
            setCurrentDate(day);
            setView('day');
          }}
          onEventClick={setDetailsActivity}
        />
      ) : (
        <CalendarGrid
          days={daysToShow}
          activities={filtered}
          onSlotClick={(dateKey, startTime) => openAddModal(dateKey, startTime)}
          onEventClick={setDetailsActivity}
          onMoveActivity={(id, date, startTime) => moveActivity(id, { date, startTime })}
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
