import { useEffect, useRef } from "preact/hooks";

/** Time spent with the passage on screen and the app in view. Nothing shows it to the reader. */
export const useReadingClock = (running: boolean) => {
  const clock = useRef({ total: 0, since: 0 });
  useEffect(() => {
    if (!running) return;
    const start = () => (clock.current.since = performance.now());
    const stop = () => {
      if (clock.current.since > 0) clock.current.total += performance.now() - clock.current.since;
      clock.current.since = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [running]);
  return () => clock.current.total;
};
