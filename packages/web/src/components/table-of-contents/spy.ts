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
 * one, so the rail never goes dark at the end of a page.
 */
export function sectionAt(sections: readonly TocSection[], line: number): string | undefined {
  if (sections.length === 0) return undefined;

  const ordered = [...sections].sort((a, b) => a.top - b.top);
  let passed: TocSection | undefined;
  for (const section of ordered) {
    if (section.top > line) break;
    passed = section;
    if (line < section.bottom) return section.value;
  }
  return passed?.value ?? ordered[0]?.value;
}
