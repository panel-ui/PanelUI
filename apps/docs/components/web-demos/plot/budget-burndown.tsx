'use client';

import { useId, useState } from 'react';
import { linePath, Plot, usePlot, xOf, yOf } from 'panelui-web/plot';

const LIMIT = 900;
const TOTAL_DAYS = 30;
const SPENT = [
  0, 40, 40, 115, 160, 160, 245, 300, 300, 380, 455, 500, 590, 590, 690, 770, 860, 945, 945, 1040,
];

const TODAY = SPENT.length - 1;
const balanceOn = (day: number) => LIMIT - (SPENT[day] ?? 0);
const PROJECTED = LIMIT - ((SPENT[TODAY] ?? 0) / (TODAY + 1)) * TOTAL_DAYS;
/** The first day the balance is below zero. */
const OVERDRAWN = SPENT.findIndex((spent) => spent > LIMIT);

const DAYS = Array.from({ length: TOTAL_DAYS }, (_unused, day) => ({
  day: `Day ${day + 1}`,
  balance: day <= TODAY ? balanceOn(day) : null,
  ideal: LIMIT - (LIMIT * day) / (TOTAL_DAYS - 1),
  projection:
    day < TODAY ? null : balanceOn(TODAY) + ((PROJECTED - balanceOn(TODAY)) * (day - TODAY)) / (TOTAL_DAYS - 1 - TODAY),
  today: day === TODAY ? balanceOn(TODAY) : null,
}));

const BALANCES = DAYS.map(({ balance }) => balance);
const money = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(Math.round(value))}`;

/** The fill from the balance to zero, and the hatch over what is overdrawn. Under the marks. */
function ZeroFills() {
  const { plot, domainMin, domainMax } = usePlot();
  const hatch = useId();
  const x = (day: number) => xOf(day, TOTAL_DAYS, plot);
  const y = (value: number) => yOf(value, plot, domainMin, domainMax);
  const stepped = linePath(BALANCES, plot, domainMin, domainMax, 'step');
  return (
    <>
      <defs>
        <pattern id={hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line y2={6} stroke="var(--destructive)" strokeOpacity={0.55} strokeWidth={1.6} />
        </pattern>
      </defs>
      <path d={`${stepped} L${x(TODAY)},${y(0)} L${x(0)},${y(0)} Z`} fill="var(--foreground)" fillOpacity={0.07} />
      <path
        d={`M${x(OVERDRAWN)},${y(0)} L${x(OVERDRAWN)},${y(balanceOn(TODAY))} L${x(TODAY)},${y(balanceOn(TODAY))} L${x(TOTAL_DAYS - 1)},${y(PROJECTED)} L${x(TOTAL_DAYS - 1)},${y(0)} Z`}
        fill={`url(#${hatch})`}
      />
    </>
  );
}

/** The balance again in red, clipped to below zero. Over the marks. */
function BelowZero() {
  const { plot, domainMin, domainMax } = usePlot();
  const clip = useId();
  const zero = yOf(0, plot, domainMin, domainMax);
  return (
    <>
      <clipPath id={clip}>
        <rect x={plot.left} y={zero} width={plot.width} height={plot.top + plot.height - zero} />
      </clipPath>
      <path
        d={linePath(BALANCES, plot, domainMin, domainMax, 'step')}
        clipPath={`url(#${clip})`}
        fill="none"
        stroke="var(--destructive)"
        strokeWidth={2.2}
      />
    </>
  );
}

export default function PlotBudgetBurndown() {
  const [read, setRead] = useState<number | null>(null);
  // The days to come have no balance to report, so the reading stays on today.
  const day = read === null || read > TODAY ? TODAY : read;

  return (
    <Plot
      data={DAYS}
      xDataKey="day"
      aspectRatio={1.7}
      className="max-w-lg"
      yDomain={[-1000, 1000]}
      label="Budget burndown"
      onActiveIndexChange={(index) => setRead(index < 0 ? null : index)}
    >
      <Plot.Header title={`Day ${day + 1} of ${TOTAL_DAYS}`} value={money(balanceOn(day))} caption={`Limit ${money(LIMIT)}`} />
      <Plot.Grid rows={2} />
      <Plot.Layer>
        <ZeroFills />
      </Plot.Layer>
      <Plot.Line dataKey="ideal" color="var(--muted-foreground)" strokeWidth={1} curve="linear" dashArray="3 4" />
      <Plot.Line dataKey="balance" color="var(--foreground)" strokeWidth={2.2} curve="step" />
      <Plot.Line dataKey="projection" color="destructive" strokeWidth={1.6} curve="linear" dashArray="6 4" />
      <Plot.Dots dataKey="today" color="destructive" />
      <Plot.Layer>
        <BelowZero />
      </Plot.Layer>
      <Plot.Rule y={0} color="var(--foreground)" />
      <Plot.YAxis ticks={2} format={(value) => `${value < 0 ? '-' : ''}$${Math.abs(value) / 1000}k`} />
      <Plot.XAxis format={(_row, index) => String(index + 1)} ticks={5} />
      <Plot.Cursor />
    </Plot>
  );
}
