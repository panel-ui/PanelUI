import { Badge } from 'panelui-web/badge';

const RUNS = [
  { name: 'Nightly backup', status: 'Running', variant: 'info' as const, live: true },
  { name: 'Image resize queue', status: 'Healthy', variant: 'success' as const, live: false },
  { name: 'Invoice export', status: 'Retrying', variant: 'warning' as const, live: true },
  { name: 'Search reindex', status: 'Stopped', variant: 'destructive' as const, live: false },
];

export default function BadgeStatuses() {
  return (
    <ul className="flex w-full max-w-sm flex-col divide-y text-sm">
      {RUNS.map((run) => (
        <li key={run.name} className="flex items-center justify-between gap-4 py-2.5">
          <span>{run.name}</span>
          <Badge variant={run.variant} dot={run.live ? 'pulse' : true}>
            {run.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
