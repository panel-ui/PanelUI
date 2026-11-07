'use client';

import { DayGrid, type DayCell, type DayLevel } from 'panelui-web/day-grid';

/** Minutes practised on each day of May 2026, which starts on a Friday. */
const MINUTES = [
  0, 25, 40, 0, 60, 45, 0, 30, 0, 55, 20, 0, 0, 35, 50, 0, 65, 25, 0, 40, 30, 0, 70, 45, 0, 20, 0,
  55, 35, 0, 25,
];

const levelOf = (minutes: number): DayLevel =>
  minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 45 ? 2 : minutes < 60 ? 3 : 4;

const START = new Date(2026, 4, 1);

const CELLS: DayCell[] = MINUTES.map((minutes, index) => {
  const day = new Date(START);
  day.setDate(START.getDate() + index);
  const date = day.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return {
    level: levelOf(minutes),
    label: minutes === 0 ? `${date}, nothing practised` : `${date}, ${minutes} minutes practised`,
  };
});

export default function DayGridOffset() {
  return (
    <div className="flex w-full max-w-sm gap-2">
      <DayGrid.Weekdays />
      {/* May 2026 starts on a Friday: four empty slots before the 1st. */}
      <DayGrid cells={CELLS} rows={7} offset={4} label="Minutes practised" />
    </div>
  );
}
