import { useCallback, useRef } from "react";

export const useDebouncedCallback = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay],
  );
};
