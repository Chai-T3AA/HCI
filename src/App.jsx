/**
 * App.jsx
 * -------
 * Application shell: wraps everything in the ActivityProvider (so the
 * whole app shares one activity data source), sets up client-side routing
 * for the five main pages, and lays out the Sidebar next to a scrollable
 * main content area.
 *
 * Mobile layout: below the `md` breakpoint, Sidebar renders as an
 * off-canvas drawer (see Sidebar.jsx) instead of a static column. This
 * component owns the open/closed state and the small top bar with the
 * hamburger button that toggles it, since that's app-shell chrome, not
 * something the Sidebar itself should know about.
 */
import { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Menu, Clock3 } from 'lucide-react';
import { ActivityProvider } from './context/ActivityContext';
import { SettingsProvider } from './context/SettingsContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Insights from './pages/Insights';
import Settings from './pages/Settings';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SettingsProvider>
    <ActivityProvider>
      <HashRouter>
        <div className="flex min-h-screen bg-background">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <div className="flex-1 min-w-0 flex flex-col">
            {/* Mobile-only top bar: hidden entirely at md+ since the static
                sidebar is always visible there and this bar would be redundant. */}
            <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-20">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 rounded-lg text-textPrimary hover:bg-textPrimary/5"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
              <Clock3 size={18} className="text-accent" />
              <span className="font-serif text-lg text-textPrimary">TimeWise</span>
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
    </SettingsProvider>
  );
}
