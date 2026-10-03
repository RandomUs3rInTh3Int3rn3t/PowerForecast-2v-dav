import { useState, useEffect } from "react";

/**
 * Provides a shared, performant 1-second ticker timestamp.
 * Ticks only when enabled (e.g. when an active stopwatch circuit is running or timeline modal is open).
 */
export function useLiveTicker(enabled: boolean = true): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled]);

  return now;
}

/**
 * Formats elapsed milliseconds into HH:MM:SS
 */
export function formatElapsedHms(elapsedMs: number): string {
  if (elapsedMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
