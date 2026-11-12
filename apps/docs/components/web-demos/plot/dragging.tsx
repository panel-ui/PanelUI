'use client';

import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { areaPath, linePath, Plot, usePlot, xOf, yOf } from 'panelui-web/plot';

/*
 * Soil moisture in a planter through one day. Each watering raises it, and it
 * dries back towards the soil's floor, losing half its excess every four hours.
 */
const STEP = 10; // minutes between readings
const START = 6 * 60; // 06:00
const SLOTS = (24 * 60 - START) / STEP + 1; // 06:00 to 24:00
const FLOOR = 12;
const DRY = 30;
const LIGHTS_OUT = (22 * 60 - START) / STEP;
const KEEP = Math.pow(0.5, STEP / 240);
const AMOUNT = 26;

const clock = (slot: number) => {
  const minutes = START + slot * STEP;
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
};

/** The moisture at every slot, for waterings at the given slots. */
function moisture(waterings: readonly number[]) {
  const values: number[] = [];
  let level = 34;
  for (let slot = 0; slot < SLOTS; slot += 1) {
    if (slot > 0) level = FLOOR + (level - FLOOR) * KEEP;
    for (const at of waterings) if (at === slot) level = Math.min(95, level + AMOUNT);
    values.push(Math.round(level * 10) / 10);
  }
  return values;
}

/** The fill under a column of values, in dots, fading towards the baseline. */
function DotFill({ upper, lower, color }: { upper: readonly number[]; lower?: readonly number[]; color: string }) {
  const { plot, domainMin, domainMax } = usePlot();
  const id = useId().replace(/:/g, '');
  const bottom = plot.top + plot.height;
  // Between two columns: down the upper one, back along the lower one.
  const shape = lower
    ? `${linePath(upper, plot, domainMin, domainMax, 'linear')} ${lower
        .map((value, index) => ({ value, index }))
        .reverse()
        .map(({ value, index }) => `L${xOf(index, lower.length, plot)},${yOf(value, plot, domainMin, domainMax)}`)
        .join(' ')} Z`
    : areaPath(upper, plot, domainMin, domainMax, 'linear');
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} x={plot.left} y={plot.top} width={5} height={5} patternUnits="userSpaceOnUse">
          <circle cx={2.5} cy={2.5} r={1.35} fill={color} />
        </pattern>
        <linearGradient id={`${id}-fade`} gradientUnits="userSpaceOnUse" x1={0} y1={plot.top} x2={0} y2={bottom}>
          <stop offset={0} stopColor="white" />
          <stop offset={1} stopColor="white" stopOpacity={0.45} />
        </linearGradient>
        <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x={plot.left} y={plot.top} width={plot.width} height={plot.height}>
          <rect x={plot.left} y={plot.top} width={plot.width} height={plot.height} fill={`url(#${id}-fade)`} />
        </mask>
      </defs>
      {/* A faint wash under the dots keeps the shape readable on a light surface. */}
      <path d={shape} fill={color} fillOpacity={0.08} />
      <path d={shape} fill={`url(#${id}-dots)`} mask={`url(#${id}-mask)`} />
    </>
  );
}

/** One watering on the axis: drag it along the day, or move it with the arrow keys. */
function Waterings({
  slots,
  picked,
  onMove,
}: {
  slots: readonly number[];
  picked: number;
  onMove: (which: number, slot: number) => void;
}) {
  const { plot } = usePlot();
  const dragging = useRef<number | null>(null);
  const slotAt = (event: PointerEvent<HTMLElement>) => {
    const box = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    const x = event.clientX - box.left;
    return Math.round(((x - plot.left) / plot.width) * (SLOTS - 1));
  };
  const nudge = (which: number) => (event: KeyboardEvent<HTMLButtonElement>) => {
    const by = { ArrowLeft: -1, ArrowRight: 1, PageDown: -6, PageUp: 6 }[event.key];
    if (by === undefined) return;
    event.preventDefault();
    onMove(which, slots[which]! + by);
  };
  const y = plot.top + plot.height;

  return slots.map((slot, which) => {
    const x = xOf(slot, SLOTS, plot);
    const active = which === picked;
    return (
      <button
        key={which}
        type="button"
        role="slider"
        aria-label={`Watering ${which + 1}`}
        aria-valuemin={0}
        aria-valuemax={SLOTS - 1}
        aria-valuenow={slot}
        aria-valuetext={clock(slot)}
        onPointerDown={(event) => {
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragging.current = which;
          onMove(which, slot);
        }}
        onPointerMove={(event) => {
          if (dragging.current === which) onMove(which, slotAt(event));
        }}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onKeyDown={nudge(which)}
        className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ left: x, top: y }}
      >
        <span className={active ? 'size-2.5 rounded-full bg-chart-1' : 'size-2 rounded-full bg-foreground'} />
        {active ? (
          <span className="absolute bottom-full mb-1 rounded-sm bg-background px-1 text-[10px] tabular-nums text-chart-1">
            {clock(slot)}
          </span>
        ) : null}
      </button>
    );
  });
}

export default function PlotDragging() {
  const [slots, setSlots] = useState([6, 36, 51, 72]);
  const [picked, setPicked] = useState(2);

  const total = useMemo(() => moisture(slots), [slots]);
  const without = useMemo(() => moisture(slots.filter((_slot, which) => which !== picked)), [slots, picked]);
  const data = useMemo(() => total.map((value, slot) => ({ time: clock(slot), moisture: value })), [total]);

  const peak = total.reduce((top, value, slot) => (value > total[top]! ? slot : top), 0);
  const atNight = total[LIGHTS_OUT]!;
  const dryHours = (total.filter((value) => value < DRY).length * STEP) / 60;

  const move = (which: number, slot: number) => {
    setPicked(which);
    setSlots((current) => current.map((each, index) => (index === which ? Math.max(0, Math.min(SLOTS - 1, slot)) : each)));
  };

  return (
    <Plot
      data={data}
      xDataKey="time"
      aspectRatio={2}
      yDomain={[0, 110]}
      className="max-w-2xl font-mono uppercase"
      label="Soil moisture in a planter through the day, with four waterings that can be moved"
    >
      <Plot.Header
        title="Planter · soil moisture"
        value={`${Math.round(atNight)}% at 22:00`}
        caption={dryHours > 0 ? `${dryHours.toFixed(1)} h below ${DRY}%` : `Never below ${DRY}%`}
      />
      <Plot.Layer>
        <DotFill upper={without} color="var(--muted-foreground)" />
        <DotFill upper={total} lower={without} color="var(--chart-1)" />
      </Plot.Layer>
      <Plot.Line dataKey="moisture" color="var(--foreground)" strokeWidth={1} curve="linear" />
      <Plot.Rule y={DRY} label={`Too dry · ${DRY}%`} color="var(--muted-foreground)" dashed labelPlacement="end" labelClassName="bg-background px-1" />
      {/* A late peak writes its caption to the left, clear of the plot's edge. */}
      <Plot.Rule
        x={peak}
        label={`Peak ${Math.round(total[peak]!)}% · ${clock(peak)}`}
        color="var(--muted-foreground)"
        labelPlacement="start"
        labelClassName={peak > SLOTS * 0.6 ? '-translate-x-[calc(100%+8px)]' : undefined}
      />
      <Plot.Rule
        x={LIGHTS_OUT}
        label={`Lights out · ${Math.round(atNight)}% left`}
        color="var(--muted-foreground)"
        labelPlacement="end"
        labelClassName="-translate-x-[calc(100%+8px)] bg-background px-1"
      />
      <Plot.XAxis format={(datum) => String(datum.time)} ticks={7} />
      <Plot.Overlay>
        <Waterings slots={slots} picked={picked} onMove={move} />
      </Plot.Overlay>
      <Plot.Cursor />
      <Plot.Tooltip formatValue={(value) => `${value}%`} />
    </Plot>
  );
}
