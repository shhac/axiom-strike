import { useEffect, useState } from "preact/hooks";

const HINT_SHOWS_MS = 2600;

/** A line of help that shows for a moment, for a tap on something that is not ready or not allowed. */
export const useHint = () => {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => setHint(null), HINT_SHOWS_MS);
    return () => clearTimeout(timer);
  }, [hint]);
  return { hint, say: setHint };
};
