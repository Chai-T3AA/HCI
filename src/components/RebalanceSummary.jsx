/**
 * RebalanceSummary.jsx
 * --------------------
 * Result panel shown right after "Rebalance Week" (CalendarHeader) runs —
 * see utils/scheduling.js's rebalanceWeek for what actually decides the
 * moves. Purely a report of what already happened (the moves are already
 * applied by the time this renders); this just tells the user what moved,
 * to where, and flags anything that only fit "tight" or couldn't be placed
 * at all, so a silent reshuffle of their schedule is never actually silent.
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, X, Shuffle } from 'lucide-react';
import { fromDateKey, formatTime12, DAY_SHORT } from '../utils/dateUtils';

function shortDayLabel(dateKey) {
  return DAY_SHORT[fromDateKey(dateKey).getDay()];
}

// No result needs to be dismissed by hand every single time — that's just
// friction (see: "i dont want to click x every single time"). EVERY result
// now auto-dismisses after a buffer, with a visible countdown (same idea as
// YouTube's "Up next in 5…4…3" — tell the person it's about to happen
// before it happens, don't just vanish on them). A result with actual
// moves/unplaced items gets a longer buffer than "already balanced" (more
// to read), and hovering the panel pauses the countdown so reading it
// doesn't turn into a race against the clock. The X is still there for
// "close it right now, I'm done."
const AUTO_DISMISS_SECONDS = { empty: 8, withContent: 15 };

export default function RebalanceSummary({ result, onClose }) {
  const nothingToDo = Boolean(result) && result.moves.length === 0 && result.unplaced.length === 0;
  const [secondsLeft, setSecondsLeft] = useState(AUTO_DISMISS_SECONDS.empty);
  const [paused, setPaused] = useState(false);

  // A fresh result (new object reference each time Rebalance Week runs)
  // always restarts the countdown from the full buffer, unpaused.
  useEffect(() => {
    if (!result) return;
    setSecondsLeft(nothingToDo ? AUTO_DISMISS_SECONDS.empty : AUTO_DISMISS_SECONDS.withContent);
    setPaused(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  useEffect(() => {
    if (!result || paused) return undefined;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          onClose();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [result, paused, onClose]);

  if (!result) return null;
  const { moves, unplaced } = result;

  return (
    <div
      className="mb-4 rounded-xl2 border border-border bg-surface/70 shadow-soft p-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shuffle size={16} className="text-primary shrink-0" />
          <h3 className="font-serif text-base text-textPrimary">
            {nothingToDo
              ? 'Your week is already balanced'
              : `Rebalanced ${moves.length} ${moves.length === 1 ? 'activity' : 'activities'}`}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-textSecondary/60 tabular-nums" title="Hover this panel to pause the countdown">
            {paused ? 'Paused' : `Closing in ${secondsLeft}s…`}
          </span>
          <button onClick={onClose} className="text-textSecondary/75 hover:text-textPrimary" aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      </div>

      {nothingToDo && (
        <p className="text-xs text-textSecondary/75 mt-2">
          Nothing needed to move — your movable work (anything not marked "Fixed time") is already spread within
          your overwork threshold and sleep target.
        </p>
      )}

      {moves.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {moves.map((m) => (
            <li key={m.id} className="text-xs text-textPrimary/90 flex items-start gap-1.5">
              {m.tight ? (
                <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" />
              )}
              <span>
                <span className="font-medium">{m.name}</span>: {shortDayLabel(m.fromDate)} {formatTime12(m.fromTime)}{' '}
                → {shortDayLabel(m.toDate)} {formatTime12(m.toTime)}
                {m.tight && <span className="text-warning"> · tight fit</span>}
                {m.usedRestDay && m.restDayReason === 'weekday-full' && (
                  <span className="text-warning"> · moved to Sunday, no weekday had room</span>
                )}
                {m.usedRestDay && m.restDayReason === 'no-weekday-in-window' && (
                  <span className="text-warning"> · Sunday was the only day left to place this in</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {unplaced.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs font-medium text-danger mb-1">Couldn't fit {unplaced.length === 1 ? 'this' : 'these'}:</p>
          <ul className="space-y-1">
            {unplaced.map((u) => (
              <li key={u.id} className="text-xs text-textSecondary/90">
                <span className="font-medium text-textPrimary">{u.name}</span> — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
