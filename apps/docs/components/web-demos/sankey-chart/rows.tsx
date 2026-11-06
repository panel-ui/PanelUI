'use client';

import { useState } from 'react';
import { SankeyChart, type SankeyLink, type SankeyNode } from 'panelui-web/sankey-chart';
import { Table } from 'panelui-web/table';

const HEAD = 32;
const ROW = 38;

const CATEGORIES = [
  { id: 'rent', label: 'Rent', color: '#6366f1', amount: 1_650 },
  { id: 'groceries', label: 'Groceries', color: '#10b981', amount: 620 },
  { id: 'dining', label: 'Dining', color: '#f59e0b', amount: 380 },
  { id: 'transport', label: 'Transport', color: '#ec4899', amount: 240 },
  { id: 'kept', label: 'Kept', color: '#94a3b8', amount: 1_810 },
];

const NODES: SankeyNode[] = [
  { id: 'salary', label: 'Salary', bar: false, color: '#38bdf8' },
  { id: 'freelance', label: 'Freelance', bar: false, color: '#a78bfa' },
  { id: 'income', label: 'Income', color: 'var(--foreground)' },
  ...CATEGORIES.map(({ id, label, color }) => ({ id, label, color })),
];

const LINKS: SankeyLink[] = [
  { source: 'salary', target: 'income', value: 3_900, color: '#38bdf8', opacity: [0.75, 0.3] },
  { source: 'freelance', target: 'income', value: 800, color: '#a78bfa', opacity: [0.75, 0.3] },
  ...CATEGORIES.map(({ id, color, amount }) => ({
    source: 'income',
    target: id,
    value: amount,
    color,
    opacity: [0.3, 1] as const,
  })),
];

const money = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function SankeyChartRows() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div className="grid w-full max-w-3xl grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-x-3">
      <SankeyChart
        nodes={NODES}
        links={LINKS}
        height={HEAD + CATEGORIES.length * ROW}
        nodeWidth={3}
        targetRows={{ top: HEAD, height: ROW, taper: 0.3 }}
        activeId={active}
        onActiveIdChange={setActive}
      >
        <SankeyChart.Links gradient />
        <SankeyChart.Nodes />
        <SankeyChart.Labels />
      </SankeyChart>
      <Table density="compact">
        <Table.Header>
          <Table.Row>
            <Table.Head>Category</Table.Head>
            <Table.Head align="end">Spent</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {CATEGORIES.map(({ id, label, color, amount }) => (
            <Table.Row
              key={id}
              className="h-[38px]"
              data-state={active === id ? 'selected' : undefined}
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive(null)}
            >
              <Table.Cell className="whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {label}
                </span>
              </Table.Cell>
              <Table.Cell align="end">{money(amount)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
