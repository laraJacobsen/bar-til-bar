'use client';

import { useEffect, useState } from 'react';

// Derives the current slot and countdown from the event schedule — no Firestore
// write needed. Slot advances automatically when time crosses the boundary.
// Shows a "Move!" warning for the last 10 minutes of each stop.
// Single source of truth for "which stop are we on" across the whole app.
export function useSchedule(
  startMs: number | null,
  endMs: number | null,
  numSlots: number,
): { slot: number; countdown: string; isWarning: boolean; remainingMs: number } {
  const [state, setState] = useState({ slot: 0, countdown: '', isWarning: false, remainingMs: 0 });

  useEffect(() => {
    if (!startMs || !endMs || numSlots === 0) return;
    const msPerSlot = (endMs - startMs) / numSlots;
    const WARNING_MS = 10 * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const slot = Math.min(Math.max(0, Math.floor((now - startMs) / msPerSlot)), numSlots - 1);
      const remaining = Math.max(0, startMs + (slot + 1) * msPerSlot - now);
      const isWarning = remaining <= WARNING_MS;
      const m = Math.floor(remaining / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
      setState({
        slot,
        countdown: remaining === 0 ? 'Time to move!' : isWarning ? `Move! ${timeStr}` : timeStr,
        isWarning,
        remainingMs: remaining,
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startMs, endMs, numSlots]);

  return state;
}
