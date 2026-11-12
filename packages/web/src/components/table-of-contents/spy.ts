/**
 * The arithmetic behind the scroll spy, kept apart from the observation.
 *
 * The component can only say what the browser measured; deciding which of
 * those measurements is the section being read is this file's whole job.
 * Reading a page is positional, not a matter of counting: the section the
 * reader is in is the one the reading line falls through, and when the line
 * is in a gap between sections it is the one most recently passed.
 */

/** One section, as the viewport saw it at the moment of measuring. */
export interface TocSection {
  /** The item's value, which is what the root tracks as active. */
  value: string;
  /** Distance from the top of the scroll viewport, in pixels. */
  top: number;
  /** Distance from the top of the scroll viewport to the section's end. */
  bottom: number;
}

/**
 * The id an `href` points at, or `null` for a link with no hash.
 *
 * A same-page link is `#install`; a link copied out of the address bar is a
 * whole URL with `#install` on the end. Both name the same section, and both
 * are decoded, because an id may be written with spaces or a slash in it.
 */
export function hashTarget(href: string | null | undefined): string | null {
  if (!href) return null;
  const at = href.indexOf('#');
  if (at === -1) return null;
  const raw = href.slice(at + 1);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    // A malformed escape is still an id worth trying, rather than no section.
    return raw;
  }
}

/**
 * Which section a reading line falls in.
 *
 * Sections may arrive in any order; they are sorted by where they start. A
 * line above the first section belongs to it, since that is the heading the
 * reader is about to reach, and a line below every section belongs to the last
 * one, so the rail never goes dark at the end of a page. `atEnd`, for a
 * scroller that can go no further, picks the last section outright.
 */
export function sectionAt(
  sections: readonly TocSection[],
  line: number,
  atEnd = false
): string | undefined {
  if (sections.length === 0) return undefined;

  const ordered = [...sections].sort((a, b) => a.top - b.top);
  // Scrolled as far as it goes, the last section is the one being read, even
  // when it is too short to ever reach the line: nothing below it can.
  if (atEnd) return ordered[ordered.length - 1]?.value;
  let passed: TocSection | undefined;
  for (const section of ordered) {
    if (section.top > line) break;
    passed = section;
    if (line < section.bottom) return section.value;
  }
  return passed?.value ?? ordered[0]?.value;
}

/**
 * Every section on screen, in page order, starting with the one at the
 * reading line and running to the last whose top is above `floor`, the bottom
 * of the scroll viewport.
 *
 * The section at the line comes first even when its heading has scrolled out
 * of sight: the reader is still inside it.
 */
export function sectionsInView(
  sections: readonly TocSection[],
  line: number,
  floor: number
): string[] {
  const current = sectionAt(sections, line);
  if (current === undefined) return [];
  const ordered = [...sections].sort((a, b) => a.top - b.top);
  const start = ordered.findIndex((section) => section.value === current);
  const result = [current];
  for (const section of ordered.slice(start + 1)) {
    if (section.top >= floor) break;
    if (!result.includes(section.value)) result.push(section.value);
  }
  return result;
}

/** One row of the list, as the contour line needs it. */
export interface ContourRow {
  /** Distance from the top of the list to the row's top, in pixels. */
  top: number;
  /** Distance from the top of the list to the row's bottom. */
  bottom: number;
  /** How many levels in the row sits. */
  depth: number;
}

/**
 * The contour line as an SVG path: straight down each row at its level's
 * offset, and a short S-bend across the boundary wherever the level changes.
 *
 * A bend is centred on the boundary between two rows and never taller than
 * half of either row, so a run of short rows still reads as a line rather
 * than a zigzag. Coordinates are in pixels from the list's top-left, with the
 * line drawn half a pixel in so a one-pixel stroke lands on the pixel grid.
 */
export function contourPath(rows: readonly ContourRow[], step: number, bend: number): string {
  if (rows.length === 0) return '';
  const x = (row: ContourRow) => round(Math.max(0, row.depth) * step + 0.5);
  const parts = [`M${x(rows[0]!)} ${round(rows[0]!.top)}`];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index]!;
    const next = rows[index + 1];
    if (!next) {
      parts.push(`L${x(row)} ${round(row.bottom)}`);
      break;
    }
    if (x(next) === x(row)) continue;
    const boundary = (row.bottom + next.top) / 2;
    const reach = Math.max(
      0,
      Math.min(bend, (row.bottom - row.top) / 2, (next.bottom - next.top) / 2)
    );
    parts.push(
      `L${x(row)} ${round(boundary - reach)}`,
      `C${x(row)} ${round(boundary)} ${x(next)} ${round(boundary)} ${x(next)} ${round(boundary + reach)}`
    );
  }
  return parts.join(' ');
}

/** How wide the contour's drawing has to be: the deepest level, plus the stroke. */
export function contourWidth(rows: readonly ContourRow[], step: number): number {
  const deepest = rows.reduce((most, row) => Math.max(most, row.depth), 0);
  return deepest * step + 2;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
