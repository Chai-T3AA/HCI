/**
 * mockData.js
 * -----------
 * Realistic seed data so TimeWise isn't empty on first load (PRD section
 * 33 / spec section 33 "Mock Data"). This is ONLY used the very first time
 * the app runs on a browser (see ActivityContext) — after that, everything
 * the user does is persisted to localStorage and this file is never read
 * again.
 *
 * Dates are generated relative to "today" so the seed data always lands on
 * the current week no matter when you open the app.
 */
import { addDays, toDateKey } from '../utils/dateUtils';

function dateOffset(days) {
  return toDateKey(addDays(new Date(), days));
}

// Anchor to the most recent Monday so the mock week reads naturally.
const now = new Date();
const dayOfWeek = now.getDay();
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

function weekDate(mondayPlus) {
  return dateOffset(mondayOffset + mondayPlus);
}

export const CATEGORIES = ['University', 'Organization', 'Personal', 'Meeting', 'Health'];
export const PRIORITIES = ['high', 'medium', 'low'];

export const initialActivities = [
  {
    id: 'seed-1',
    name: 'Statistics Assignment',
    date: weekDate(1), // Tuesday
    startTime: '14:00',
    duration: 3,
    deadline: weekDate(2),
    priority: 'high',
    category: 'University',
    completed: false,
  },
  {
    id: 'seed-2',
    name: 'Database Project',
    date: weekDate(1), // Tuesday
    startTime: '19:00',
    duration: 2,
    deadline: weekDate(4),
    priority: 'medium',
    category: 'University',
    completed: false,
  },
  {
    id: 'seed-3',
    name: 'HCI Presentation',
    date: weekDate(2), // Wednesday
    startTime: '09:00',
    duration: 2,
    deadline: weekDate(2),
    priority: 'high',
    category: 'University',
    completed: false,
  },
  {
    id: 'seed-4',
    name: 'HIMSTAT Meeting',
    date: weekDate(2), // Wednesday
    startTime: '14:30',
    duration: 1.5,
    deadline: null,
    priority: 'medium',
    category: 'Organization',
    completed: false,
  },
  {
    id: 'seed-5',
    name: 'Gym',
    date: weekDate(0), // Monday
    startTime: '07:00',
    duration: 1,
    deadline: null,
    priority: 'low',
    category: 'Health',
    completed: true,
  },
  {
    id: 'seed-6',
    name: 'Study Session',
    date: weekDate(3), // Thursday
    startTime: '16:00',
    duration: 2,
    deadline: null,
    priority: 'low',
    category: 'Personal',
    completed: false,
  },
  {
    id: 'seed-7',
    name: 'Finance Assignment',
    date: weekDate(4), // Friday
    startTime: '10:00',
    duration: 2.5,
    deadline: weekDate(5),
    priority: 'medium',
    category: 'University',
    completed: false,
  },
  {
    id: 'seed-8',
    name: 'Weekly Org Sync',
    date: weekDate(0), // Monday
    startTime: '13:00',
    duration: 1,
    deadline: null,
    priority: 'low',
    category: 'Meeting',
    completed: true,
  },
];
