'use client';

import { useRef, useState } from 'react';
import { Button } from 'panelui-web/button';
import { PyramidChart, type PyramidChartHandle } from 'panelui-web/pyramid-chart';

const SEASONS = {
  '2024': [
    { species: 'Adelie', male: 73, female: 73 },
    { species: 'Chinstrap', male: 34, female: 34 },
    { species: 'Gentoo', male: 61, female: 58 },
  ],
  '2025': [
    { species: 'Adelie', male: 118, female: 96 },
    { species: 'Chinstrap', male: 22, female: 41 },
    { species: 'Gentoo', male: 88, female: 104 },
  ],
};

export default function PyramidChartChangingData() {
  const chart = useRef<PyramidChartHandle>(null);
  const [season, setSeason] = useState<keyof typeof SEASONS>('2024');

  return (
    <div className="flex w-full max-w-lg flex-col items-start gap-4">
      <PyramidChart ref={chart} data={SEASONS[season]} xDataKey="species" aspectRatio={1.6}>
        <PyramidChart.Header title={`Season ${season}`} />
        <PyramidChart.Grid />
        <PyramidChart.Bar dataKey="male" side="start" />
        <PyramidChart.Bar dataKey="female" side="end" />
        <PyramidChart.XAxis />
        <PyramidChart.YAxis />
        <PyramidChart.Tooltip />
      </PyramidChart>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setSeason(season === '2024' ? '2025' : '2024')}>
          Show {season === '2024' ? '2025' : '2024'}
        </Button>
        <Button variant="ghost" onClick={() => chart.current?.replay()}>
          Replay
        </Button>
      </div>
    </div>
  );
}
