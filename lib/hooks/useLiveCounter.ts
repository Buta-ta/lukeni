import { useEffect, useState, useRef } from 'react';

interface CounterConfig {
  periodTotal: number;
  periodStartAt: string;
  startValue: number;
  periodType: 'day' | 'month' | 'year';
  decimals: number;
}

export function useLiveCounter(config: CounterConfig | null) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!config) {
      setValue(0);
      return;
    }

    const { periodTotal, periodStartAt, startValue, periodType, decimals } = config;

    // Calculer le nombre de secondes dans la période
    const secondsInPeriod =
      periodType === 'day'
        ? 86400 // 24 * 60 * 60
        : periodType === 'month'
        ? 2592000 // 30 * 86400
        : 31536000; // 365 * 86400

    // Calculer le taux par seconde (R)
    const ratePerSecond = periodTotal / secondsInPeriod;

    const periodStart = new Date(periodStartAt).getTime();

    const animate = () => {
      const now = Date.now();
      const elapsed = (now - periodStart) / 1000; // Temps écoulé en secondes

      // Calcul stateless : Vt = V0 + (elapsed * R)
      const currentValue = startValue + elapsed * ratePerSecond;

      // Plafonner à la valeur totale si on dépasse la période
      const maxValue = startValue + periodTotal;
      const finalValue = Math.min(currentValue, maxValue);

      // Arrondir selon les décimales configurées
      setValue(parseFloat(finalValue.toFixed(decimals)));

      rafRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [config]);

  return value;
}