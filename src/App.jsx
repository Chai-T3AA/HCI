/**
 * App.jsx
 * -------
 * Application shell: ActivityProvider + routing + layout. Owns the
 * mobile sidebar's open/closed state and renders the hamburger button
 * that toggles it — Sidebar.jsx only renders the drawer itself, it has
 * no way to open itself on mobile without this.
 */
import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Menu, Clock3 } from 'lucide-react';
import { ActivityProvider } from './context/ActivityContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ActivityProvider>
      <HashRouter>
        <div className="flex min-h-screen bg-cream">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 min-w-0 flex flex-col">
            {/* Mobile-only top bar: hidden at md+ since the static sidebar is always visible there */}
            <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-navy/10 bg-cream sticky top-0 z-20">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-navy hover:bg-navy/5"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <Clock3 size={18} className="text-amber" />
              <span className="font-serif text-lg text-navy">TimeWise</span>
            </header>

            <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </ActivityProvider>
  );
}