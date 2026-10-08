
'use client';
import { useState, useEffect } from 'react';
import { differenceInSeconds } from 'date-fns';
import { useTranslation } from 'react-i18next';

type CountdownTimerProps = {
  endDate: string;
};

export function CountdownTimer({ endDate }: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const end = new Date(endDate);
      const totalSeconds = differenceInSeconds(end, now);

      if (totalSeconds <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(totalSeconds / (3600 * 24));
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = Math.floor(totalSeconds % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex space-x-4">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="text-4xl font-bold font-mono">{String(value).padStart(2, '0')}</div>
          <div className="text-xs uppercase text-muted-foreground">{t(`countdown.${unit}` as any)}</div>
        </div>
      ))}
    </div>
  );
}

    