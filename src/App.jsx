/**
 * App.jsx
 * -------
 * Application shell: wraps everything in the ActivityProvider (so the
 * whole app shares one activity data source), sets up client-side routing
 * for the five main pages, and lays out the fixed Sidebar next to a
 * scrollable main content area.
 */
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActivityProvider } from './context/ActivityContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

export default function App() {
  return (
    <ActivityProvider>
      <HashRouter>
        <div className="flex min-h-screen bg-cream">
          <Sidebar />
          <main className="flex-1 p-8 overflow-x-hidden">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </ActivityProvider>
  );
}
