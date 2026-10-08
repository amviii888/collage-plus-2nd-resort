'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, addMonths, subMonths } from 'date-fns';

export interface CalendarProps {
  className?: string;
  classNames?: Record<string, string>;
  selected?: Date | Date[];
  onSelect?: (date: Date | undefined) => void;
  onDayClick?: (date: Date) => void;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  showOutsideDays?: boolean;
  modifiersClassNames?: Record<string, string>;
  mode?: 'single' | 'multiple';
}

function Calendar({
  className,
  selected,
  onSelect,
  onDayClick,
  month: controlledMonth,
  onMonthChange,
  modifiersClassNames,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState<Date>(controlledMonth || new Date());
  const currentMonth = controlledMonth || internalMonth;

  const handlePrevMonth = () => {
    const prev = subMonths(currentMonth, 1);
    if (onMonthChange) onMonthChange(prev);
    else setInternalMonth(prev);
  };

  const handleNextMonth = () => {
    const next = addMonths(currentMonth, 1);
    if (onMonthChange) onMonthChange(next);
    else setInternalMonth(next);
  };

  const days = React.useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startOffset = React.useMemo(() => {
    return getDay(startOfMonth(currentMonth));
  }, [currentMonth]);

  const isSelected = (day: Date) => {
    if (!selected) return false;
    if (Array.isArray(selected)) {
      return selected.some(d => isSameDay(d, day));
    }
    return isSameDay(selected, day);
  };

  const handleDateClick = (day: Date) => {
    if (onDayClick) onDayClick(day);
    if (onSelect) onSelect(day);
  };

  const weekHeaders = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn('p-3 select-none', className)}>
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100 cursor-pointer')}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <span className="text-sm font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(buttonVariants({ variant: 'outline' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100 cursor-pointer')}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekHeaders.map((h, i) => (
          <span key={i} className="text-[11px] font-medium text-muted-foreground">
            {h}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`offset-${i}`} className="h-9 w-9" />
        ))}
        {days.map((day) => {
          const sel = isSelected(day);
          const today = isSameDay(day, new Date());
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDateClick(day)}
              className={cn(
                'h-9 w-9 rounded-xl text-sm font-medium transition-colors flex items-center justify-center cursor-pointer',
                sel 
                  ? (modifiersClassNames?.selected || 'bg-primary text-primary-foreground font-bold shadow-xs') 
                  : today 
                    ? 'bg-accent text-accent-foreground font-bold' 
                    : 'hover:bg-muted text-foreground'
              )}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
