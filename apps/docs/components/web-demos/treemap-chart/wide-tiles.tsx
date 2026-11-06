'use client';

import { useState } from 'react';
import { TreemapChart } from 'panelui-web/treemap-chart';

const CATEGORIES = [
  { id: 'rent', label: 'Rent', value: 1_450, color: '#6366f1' },
  { id: 'groceries', label: 'Groceries', value: 620, color: '#10b981' },
  { id: 'transport', label: 'Transport', value: 310, color: '#f59e0b' },
  { id: 'dining', label: 'Dining out', value: 280, color: '#ef4444' },
  { id: 'subscriptions', label: 'Subscriptions', value: 96, color: '#8b5cf6' },
  { id: 'utilities', label: 'Utilities', value: 84, color: '#06b6d4' },
];

const dollars = (value: number) => `$${value.toLocaleString('en-US')}`;

export default function TreemapChartWideTiles() {
  const [opened, setOpened] = useState('Nothing yet');

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <TreemapChart data={CATEGORIES} aspectRatio={2.6} tileAspect={2.6} onSelect={(tile) => setOpened(tile.label)}>
        <TreemapChart.Tiles />
        <TreemapChart.Labels formatValue={dollars} />
        <TreemapChart.Tooltip formatValue={dollars} />
      </TreemapChart>
      <p className="text-xs text-muted-foreground">Opened: {opened}</p>
    </div>
  );
}
