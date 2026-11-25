'use client';

import { useState } from 'react';
import { Card } from 'panelui-web/card';
import { Select } from 'panelui-web/select';

const RANGES = {
  week: {
    label: 'This week',
    total: '38',
    rows: [
      ['api-gateway', 14, '2m ago'],
      ['web', 11, '1h ago'],
      ['billing-worker', 8, 'Tue'],
      ['search-indexer', 5, 'Mon'],
    ],
  },
  month: {
    label: 'This month',
    total: '152',
    rows: [
      ['web', 49, '1h ago'],
      ['api-gateway', 47, '2m ago'],
      ['billing-worker', 31, 'Tue'],
      ['search-indexer', 25, 'Mon'],
    ],
  },
} as const;

type Range = keyof typeof RANGES;

const RANGE_ITEMS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

export default function CardInsetList() {
  const [range, setRange] = useState<Range>('week');
  const data = RANGES[range];
  const max = Math.max(...data.rows.map((row) => row[1]));

  return (
    <Card variant="inset" className="w-full max-w-80">
      <Card.Header>
        <Card.Title as="div">Deploys</Card.Title>
        <Card.Action>
          <Select items={RANGE_ITEMS} value={range} onValueChange={(value) => setRange(value as Range)}>
            <Select.Trigger variant="ghost" size="sm" aria-label="Range">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="week">This week</Select.Item>
              <Select.Item value="month">This month</Select.Item>
            </Select.Content>
          </Select>
        </Card.Action>
      </Card.Header>
      <Card.Content>
        <ul className="space-y-3">
          {data.rows.map(([name, count, last]) => (
            <li key={name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
              <span className="truncate text-sm">{name}</span>
              <span className="text-sm tabular-nums">{count}</span>
              <span className="h-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-foreground/70 transition-[width] duration-500"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="text-xs text-muted-foreground">{last}</span>
            </li>
          ))}
        </ul>
        <Card.Meta label="Total">{data.total} deploys</Card.Meta>
      </Card.Content>
    </Card>
  );
}
