import { useState, useEffect, useRef } from 'react';

interface UseTimerOptions {
  expiresAt: string | null;
  onExpire?: () => void;
  isEnabled?: boolean;
}

export function useTimer({ expiresAt, onExpire, isEnabled = true }: UseTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!expiresAt) return null;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!expiresAt || !isEnabled) {
      setRemainingSeconds(null);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      const rem = calculateRemaining();
      setRemainingSeconds(rem);

      if (rem <= 0) {
        clearInterval(interval);
        if (onExpireRef.current) {
          onExpireRef.current();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, isEnabled]);

  return { remainingSeconds };
}
