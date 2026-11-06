'use client';

import { useState } from 'react';
import { Button } from 'panelui-web/button';
import { PyramidChart, type PyramidChartStatus } from 'panelui-web/pyramid-chart';

const PENGUINS = [
  { species: 'Adelie', male: 73, female: 73 },
  { species: 'Chinstrap', male: 34, female: 34 },
  { species: 'Gentoo', male: 61, female: 58 },
];

export default function PyramidChartLoading() {
  const [status, setStatus] = useState<PyramidChartStatus>('loading');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <PyramidChart data={PENGUINS} xDataKey="species" status={status} aspectRatio={1.6}>
        <PyramidChart.Grid />
        <PyramidChart.Skeleton />
        <PyramidChart.Bar dataKey="male" side="start" />
        <PyramidChart.Bar dataKey="female" side="end" />
        <PyramidChart.XAxis />
        <PyramidChart.YAxis />
      </PyramidChart>
      <Button variant="outline" onClick={() => setStatus(status === 'loading' ? 'ready' : 'loading')}>
        {status === 'loading' ? 'Finish loading' : 'Load again'}
      </Button>
    </div>
  );
}
