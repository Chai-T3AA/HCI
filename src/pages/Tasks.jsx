/**
 * Tasks.jsx
 * ---------
 * Dedicated task list page (spec section 27): filterable by All / Upcoming
 * / Completed / High Priority, each row showing name, deadline, duration,
 * priority, category and status, with Edit / Delete / Mark Complete
 * actions. Reads and writes through the same ActivityContext as everything
 * else, so completing a task here updates the Dashboard and Insights too.
 */
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import ActivityCard from '../components/ActivityCard';
import AddActivityModal from '../components/AddActivityModal';
import { useActivities } from '../context/ActivityContext';
import { toDateKey } from '../utils/dateUtils';

const TABS = ['All Tasks', 'Upcoming', 'Completed', 'High Priority'];

export default function Tasks() {
  const { activities, deleteActivity, toggleComplete } = useActivities();
  const [tab, setTab] = useState('All Tasks');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const todayKey = toDateKey(new Date());

  const filtered = useMemo(() => {
    const sorted = [...activities].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    switch (tab) {
      case 'Upcoming':
        return sorted.filter((a) => !a.completed && a.date >= todayKey);
      case 'Completed':
        return sorted.filter((a) => a.completed);
      case 'High Priority':
        return sorted.filter((a) => a.priority === 'high');
      default:
        return sorted;
    }
  }, [activities, tab, todayKey]);

  function openEdit(activity) {
    setEditingActivity(activity);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-3xl text-textPrimary">Tasks</h1>
        <button
          onClick={() => {
            setEditingActivity(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-onAccent hover:bg-primary-600"
        >
          <Plus size={16} /> New Activity
        </button>
      </div>

      <div className="flex items-center gap-1 bg-surface/70 border border-border rounded-lg p-1 w-fit shadow-soft">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm font-medium px-4 py-2 rounded-md transition-colors ${
              tab === t ? 'bg-primary text-onAccent' : 'text-textSecondary/90 hover:text-textPrimary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-textSecondary/75 italic py-12 text-center">No tasks in this category yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtered.map((a) => (
            <ActivityCard key={a.id} activity={a} onToggleComplete={toggleComplete} onEdit={openEdit} onDelete={deleteActivity} />
          ))}
        </div>
      )}

      <AddActivityModal open={modalOpen} onClose={() => setModalOpen(false)} activityToEdit={editingActivity} />
    </div>
  );
}
