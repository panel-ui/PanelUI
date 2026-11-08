'use client';

import { DayGrid, type DayCell, type DayLevel } from 'panelui-web/day-grid';

/** Minutes practised on each day of four weeks, oldest first, starting on a Monday. */
const MINUTES = [0, 20, 35, 45, 0, 60, 30, 15, 0, 50, 25, 40, 0, 0, 55, 70, 35, 20, 0, 45, 30, 65, 0, 25, 50, 15, 0, 40];

const levelOf = (minutes: number): DayLevel =>
  minutes === 0 ? 0 : minutes < 25 ? 1 : minutes < 45 ? 2 : minutes < 65 ? 3 : 4;

const START = new Date(2026, 8, 7);
const dayOf = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' });

const CELLS: DayCell[] = MINUTES.map((minutes, index) => {
  const date = new Date(START);
  date.setDate(START.getDate() + index);
  return {
    level: levelOf(minutes),
    label: minutes === 0 ? `${dayOf.format(date)}, sin práctica` : `${dayOf.format(date)}, ${minutes} min`,
  };
});

// A week to a column, so the names run down the side of the grid.
const WEEKDAYS = ['L', '', 'X', '', 'V', '', 'D'];

export default function DayGridLocalized() {
  return (
    <div className="flex w-full max-w-64 flex-col gap-3">
      <div className="flex gap-2">
        <DayGrid.Weekdays labels={WEEKDAYS} />
        <DayGrid
          cells={CELLS}
          rows={7}
          color="success"
          label="Práctica"
          summary={({ active, total }) => `Práctica: ${active} de ${total} días con actividad.`}
        />
      </div>
      <DayGrid.Legend color="success" className="self-end" less="Menos" more="Más" />
    </div>
  );
}
