import React, { useState, useCallback } from 'react';

interface DiaryCalendarProps {
  selectedDate: string | null;
  markedDates: Set<string>;
  onSelectDate: (date: string) => void;
}

function DiaryCalendar({ selectedDate, markedDates, onSelectDate }: DiaryCalendarProps) {
  const today = new Date();
  const todayStr = formatDate(today);
  
  const initialDate = selectedDate ? new Date(selectedDate + 'T00:00:00') : today;
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const handlePrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleToday = useCallback(() => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(formatDate(now));
  }, [onSelectDate]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  
  // Previous month padding
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
  const paddingDays: { day: number; dateStr: string; isOtherMonth: boolean }[] = [];
  
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    paddingDays.push({
      day: d,
      dateStr: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isOtherMonth: true,
    });
  }

  // Current month days
  const currentDays: { day: number; dateStr: string; isOtherMonth: boolean }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    currentDays.push({
      day: d,
      dateStr: `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isOtherMonth: false,
    });
  }

  // Next month padding (fill to 42 cells = 6 rows)
  const totalCells = paddingDays.length + currentDays.length;
  const nextPadding: { day: number; dateStr: string; isOtherMonth: boolean }[] = [];
  const remaining = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  for (let d = 1; d <= remaining; d++) {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    nextPadding.push({
      day: d,
      dateStr: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      isOtherMonth: true,
    });
  }

  const allDays = [...paddingDays, ...currentDays, ...nextPadding];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Count entries this month
  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  let entryCount = 0;
  markedDates.forEach((d) => { if (d.startsWith(monthPrefix)) entryCount++; });

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button className="calendar-nav-btn" onClick={handlePrevMonth} title="Previous month">‹</button>
        <button className="calendar-title" onClick={handleToday} title="Go to today">
          {monthNames[viewMonth]} {viewYear}
        </button>
        <button className="calendar-nav-btn" onClick={handleNextMonth} title="Next month">›</button>
      </div>
      <div className="calendar-weekdays">
        {weekdays.map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {allDays.map((item) => {
          const classes = ['calendar-day'];
          if (item.isOtherMonth) classes.push('other-month');
          if (item.dateStr === todayStr) classes.push('today');
          if (item.dateStr === selectedDate) classes.push('selected');
          if (markedDates.has(item.dateStr)) classes.push('has-entry');
          return (
            <button
              key={item.dateStr}
              className={classes.join(' ')}
              onClick={() => onSelectDate(item.dateStr)}
            >
              {item.day}
            </button>
          );
        })}
      </div>
      {entryCount > 0 && (
        <div className="diary-entry-count">{entryCount} {entryCount === 1 ? 'entry' : 'entries'} this month</div>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default React.memo(DiaryCalendar);
