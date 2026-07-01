'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { detectStandalone } from '@/lib/install';

const THRESHOLD = 80;
const MAX_PULL = 140;
const DAMPING = 0.5;

export function PullToRefresh() {
  const [enabled, setEnabled] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    setEnabled(detectStandalone());
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking.current || startY.current === null) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        pullRef.current = 0;
        setPullDistance(0);
        tracking.current = false;
        return;
      }
      const damped = Math.min(MAX_PULL, delta * DAMPING);
      pullRef.current = damped;
      setPullDistance(damped);
      if (window.scrollY === 0 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;
      tracking.current = false;
      startY.current = null;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(THRESHOLD);
        setTimeout(() => window.location.reload(), 400);
      } else {
        pullRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchCancel = () => {
      tracking.current = false;
      startY.current = null;
      pullRef.current = 0;
      setPullDistance(0);
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [enabled]);

  if (!enabled) return null;

  const progress = Math.min(1, pullDistance / THRESHOLD);
  const rotation = progress * 270;
  const opacity = Math.min(1, pullDistance / (THRESHOLD * 0.4));
  const ready = pullDistance >= THRESHOLD;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, pullDistance - 50)}px)`,
        opacity,
        transition: tracking.current ? 'none' : 'transform 250ms ease-out, opacity 250ms ease-out',
      }}
      aria-hidden
    >
      <div
        className="mt-2 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#14101c] shadow-[0_8px_20px_rgba(0,0,0,.5)]"
        style={{
          borderColor: ready ? 'rgba(255,90,168,.6)' : 'rgba(255,255,255,.1)',
          transition: 'border-color 150ms',
        }}
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? 'animate-spin text-[#ff5aa8]' : 'text-[#ff5aa8]'}`}
          style={{
            transform: refreshing ? undefined : `rotate(${rotation}deg)`,
            transition: tracking.current ? 'none' : 'transform 200ms ease-out',
          }}
        />
      </div>
    </div>
  );
}
