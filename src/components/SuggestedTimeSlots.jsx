/**
 * SuggestedTimeSlots.jsx
 * ----------------------
 * Renders the 2-3 candidate slots produced by utils/scheduling.js inside
 * the Add Activity modal (spec section 24, "Smart Schedule Recommendation").
 * The top-ranked slot gets the Sandy Amber "BEST MATCH" badge. Clicking
 * "Apply" hands the chosen date/time back up to the modal, which is the
 * "Decision-Making" cognitive-process pattern from the PRD: a few good
 * options plus Apply / Edit / Keep, rather than asking the user to
 * calculate a free slot themselves.
 */
import { Star, Clock } from 'lucide-react';
import { formatTime12 } from '../utils/dateUtils';
import { WORKLOAD_LABEL } from '../utils/workloadUtils';

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SuggestedTimeSlots({ suggestions, onApply, selectedKey }) {
  if (!suggestions.length) {
    return (
      <p className="text-sm text-navy/50 italic">
        No open slot found before the deadline — try shortening the duration or picking a later deadline.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {suggestions.map((s) => {
        const key = `${s.dateKey}-${s.startTime}`;
        const isSelected = key === selectedKey;
        return (
          <div
            key={key}
            className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-colors ${
              s.isBestMatch
                ? 'border-amber bg-amber/10'
                : isSelected
                ? 'border-current bg-current/5'
                : 'border-navy/10 bg-white/60'
            }`}
          >
            <div>
              {s.isBestMatch && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-1">
                  <Star size={11} fill="currentColor" /> Best Match
                </span>
              )}
              <p className="text-sm font-semibold text-navy">
                {DAY_LABELS[s.date.getDay()]} · {s.date.getDate()}/{s.date.getMonth() + 1}
              </p>
              <p className="text-xs text-navy/60 flex items-center gap-1 mt-0.5">
                <Clock size={12} />
                {formatTime12(s.startTime)} — {formatTime12(s.endTime)}
              </p>
              <p className="text-[11px] text-navy/50 mt-1">Workload: {WORKLOAD_LABEL[s.workloadLevel]}</p>
            </div>
            <button
              onClick={() => onApply(s)}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-lg shrink-0 transition-colors ${
                isSelected ? 'bg-current text-cream' : 'bg-navy text-cream hover:bg-navy-600'
              }`}
            >
              {isSelected ? 'Selected' : 'Apply'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
