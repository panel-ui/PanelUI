'use client';

import { ScrollArea } from 'panelui-web/scroll-area';

const DAYS = [
  { day: 'Mon', high: 14, low: 7, sky: 'Showers' },
  { day: 'Tue', high: 12, low: 6, sky: 'Cloudy' },
  { day: 'Wed', high: 15, low: 8, sky: 'Bright spells' },
  { day: 'Thu', high: 17, low: 9, sky: 'Sunny' },
  { day: 'Fri', high: 16, low: 10, sky: 'Light rain' },
  { day: 'Sat', high: 13, low: 7, sky: 'Windy' },
  { day: 'Sun', high: 11, low: 5, sky: 'Heavy rain' },
  { day: 'Mon', high: 12, low: 4, sky: 'Frost, then sun' },
  { day: 'Tue', high: 14, low: 6, sky: 'Cloudy' },
  { day: 'Wed', high: 15, low: 8, sky: 'Sunny' },
];

export default function ScrollAreaHorizontal() {
  return (
    <ScrollArea orientation="horizontal" className="w-full max-w-md rounded-2xl border bg-background">
      <ul className="flex w-max gap-2 p-3">
        {DAYS.map((d, i) => (
          <li key={i} className="flex w-28 shrink-0 flex-col gap-2 rounded-xl bg-muted px-3 py-3">
            <span className="text-xs font-medium text-muted-foreground">{d.day}</span>
            <span className="text-lg font-semibold tabular-nums">
              {d.high}°<span className="ms-1 text-sm font-normal text-muted-foreground">{d.low}°</span>
            </span>
            <span className="text-xs text-muted-foreground">{d.sky}</span>
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
