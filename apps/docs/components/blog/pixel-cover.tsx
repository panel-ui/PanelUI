import { COVER_HEIGHT, COVER_WIDTH, COVERS } from '@/lib/blog-covers';
import { cn } from '@/lib/utils';

/** Which theme variable each pixel character draws in. */
const ROLE: Record<string, string> = {
  '-': 'var(--border)',
  '#': 'var(--foreground)',
  o: 'var(--background)',
  c: 'var(--muted)',
  m: 'var(--muted-foreground)',
  p: 'var(--primary)',
  '1': 'var(--chart-1)',
  '2': 'var(--chart-2)',
  '3': 'var(--chart-3)',
  '4': 'var(--chart-4)',
  '5': 'var(--chart-5)',
};

interface Run {
  x: number;
  y: number;
  width: number;
  char: string;
}

/**
 * Each row as runs of one character, so a cover is a few hundred rectangles
 * rather than two thousand. Muted pixels sit over background ones, so they are
 * drawn after them.
 */
function runsOf(rows: readonly string[]): Run[] {
  const runs: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const char = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === char) end += 1;
      if (char !== '.') runs.push({ x, y, width: end - x, char });
      x = end;
    }
  });
  return runs.sort((a, b) => Number(a.char === 'c') - Number(b.char === 'c'));
}

/**
 * A post's pixel-art cover, drawn in the reader's theme. Decorative: the post's
 * title is always beside it, so it carries no text of its own for a screen
 * reader.
 */
export function PixelCover({ cover, className }: { cover: string; className?: string }) {
  const rows = COVERS[cover];
  if (!rows) throw new Error(`No blog cover named "${cover}" in lib/blog-covers.ts`);

  return (
    <div className={cn('overflow-hidden bg-muted', className)}>
      <svg
        viewBox={`0 0 ${COVER_WIDTH} ${COVER_HEIGHT}`}
        aria-hidden="true"
        shapeRendering="crispEdges"
        className="block h-auto w-full"
      >
        {runsOf(rows).map((run) => (
          <rect
            key={`${run.x}-${run.y}`}
            x={run.x}
            y={run.y}
            width={run.width}
            height={1}
            fill={ROLE[run.char]}
          />
        ))}
      </svg>
    </div>
  );
}
