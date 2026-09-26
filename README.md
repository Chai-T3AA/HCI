# TimeWise — Smart Weekly Planner

A functional React + Vite web app that helps university students see their
week, spot overloaded days, and get AI-style scheduling suggestions for new
tasks. Built to the TimeWise spec/PRD: navy/amber/cream editorial palette,
Playfair Display + Inter typography, and a real (not mocked) scheduling
engine.

## What the code actually does, file by file

```
src/
  context/ActivityContext.jsx   <- THE single source of truth for all activity/task
                                    data. Holds the array of activities in React state,
                                    mirrors it to localStorage on every change, and
                                    exposes addActivity/updateActivity/deleteActivity/
                                    toggleComplete/moveActivity via the useActivities()
                                    hook. Every page reads from and writes to this one
                                    place, which is why adding a task on the Calendar
                                    instantly shows up on the Dashboard, Tasks list and
                                    Insights page too — there's no manual "sync" step.

  utils/dateUtils.js            <- Pure date/time helpers (no external library): turns
                                    JS Dates into "YYYY-MM-DD" keys, builds the Mon-Sun
                                    array for a week, converts "14:30" <-> decimal hours
                                    for positioning things in the calendar grid, and
                                    formats human-readable labels like "Deadline tomorrow".

  utils/workloadUtils.js        <- Turns the raw activity list into the numbers the UI
                                    shows: total hours booked per day, a light/moderate/
                                    heavy label per day (the thresholds live in one
                                    constant, WORKLOAD_THRESHOLDS), and the weekly stats
                                    (tasks, hours planned/completed, completion %,
                                    upcoming deadlines, busiest/freest day).

  utils/scheduling.js           <- The "smart" engine. Two jobs:
                                      1. layoutDayActivities() figures out which
                                         activities on a day overlap in time and assigns
                                         them side-by-side columns instead of letting
                                         them cover each other.
                                      2. getSmartRecommendations() is the core Smart
                                         Schedule Recommendation feature: given a new
                                         task's duration/priority/deadline, it scans
                                         every day up to the deadline, finds free slots,
                                         scores each one (lighter days score better,
                                         sooner is nudged as better, high-priority tasks
                                         are allowed closer to their deadline), and
                                         returns the top 2-3 with the best one flagged
                                         isBestMatch — this is what powers the "BEST
                                         MATCH" badge in the Add Activity modal.

  components/                   <- Reusable UI pieces. The two worth knowing:
    AddActivityModal.jsx           The Add/Edit form. Every time you change duration,
                                    priority or deadline it re-runs
                                    getSmartRecommendations() live and shows the
                                    suggestions on the right; clicking "Apply" just fills
                                    in the date/time fields, it doesn't save anything
                                    until you click "Add Activity"/"Save Changes".
    CalendarGrid.jsx                The actual hour-by-hour time grid (7 AM-10 PM).
                                    Renders the current-time line, handles clicking an
                                    empty slot (opens Add Activity pre-filled), and
                                    handles native HTML5 drag-and-drop to move an
                                    activity to a new day/time (it snaps to 30-minute
                                    increments and calls moveActivity from the context).

  pages/                        <- One file per route (Dashboard/Calendar/Tasks/
                                    Insights/Settings). These mostly just call
                                    useActivities() + the utils above and hand the
                                    numbers to the components — almost no logic of their
                                    own lives here on purpose, so the same math can't
                                    drift out of sync between pages.

  App.jsx                       <- Wraps the whole app in <ActivityProvider>, sets up
                                    the 5 routes with react-router, and renders the
                                    fixed Sidebar next to the routed page content.
```

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
```

Data is stored entirely in the browser's `localStorage` (key
`timewise.activities.v1` for tasks, `timewise.settings.v1` for the Settings
page) — there is no backend. The first time it runs on a fresh browser it
seeds itself with realistic sample tasks from `src/data/mockData.js`; after
that, everything you add/edit/delete persists across reloads.
