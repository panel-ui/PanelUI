/**
 * Fits a style written for the browser renderer to the native one.
 *
 * Hosted styles are written and checked in a browser, and the native renderer
 * lags behind it in what it can parse. Where the two disagree, native does not
 * skip the one property. It throws away the whole layer and logs a warning. A
 * street style that labels its stations and bus stops with `text-overlap`
 * reaches a phone with neither, and the only sign is a run of
 * `layer doesn't support this property` lines in the terminal.
 *
 * Everything the style specification lists as unsupported on native is
 * translated here:
 *
 * - `icon-overlap` and `text-overlap` become `icon-allow-overlap` and
 *   `text-allow-overlap`, the older names native has always read.
 * - `resampling` becomes `raster-resampling` on a raster layer. Hillshade and
 *   color-relief layers have no older name for it, so there it is dropped and
 *   the layer keeps the default.
 * - A tiled source with neither `url` nor `tiles` is removed. Hosted styles use
 *   one to carry attribution text. Native cannot parse it, and it draws
 *   nothing either way.
 *
 * The browser gives the newer name priority when a layer sets both, so the
 * translation overwrites the older one rather than deferring to it.
 */
import { useEffect, useMemo, useState } from 'react';
import type { StyleSpecification } from './maplibre';

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const TILED_SOURCES = new Set(['vector', 'raster', 'raster-dem']);

/**
 * Each overlap mode as the boolean the older property takes.
 *
 * Native has no `cooperative` mode, which lets a symbol overlap others that
 * allow it but not the ones that refuse. It becomes `false`. A label that is
 * hidden on a collision is how every map label behaves already, and a label
 * printed over another cannot be read.
 */
const OVERLAP = new Map<unknown, boolean>([
  ['always', true],
  ['never', false],
  ['cooperative', false],
]);

/** The layout with `-overlap` translated, or `null` when it has none. */
function adaptLayout(layout: Json): Json | null {
  let next: Json | null = null;
  for (const kind of ['icon', 'text']) {
    const key = `${kind}-overlap`;
    if (!(key in layout)) continue;
    next ??= { ...layout };
    const allowed = OVERLAP.get(layout[key]);
    delete next[key];
    // A zoom expression has no direct translation. Dropping it leaves
    // `-allow-overlap` in charge, which is what a browser renderer older than
    // the property did with the same style.
    if (allowed !== undefined) next[`${kind}-allow-overlap`] = allowed;
  }
  return next;
}

/** The paint with `resampling` translated, or `null` when it has none. */
function adaptPaint(type: unknown, paint: Json): Json | null {
  if (!('resampling' in paint)) return null;
  const { resampling, ...next } = paint;
  if (type === 'raster') next['raster-resampling'] = resampling;
  return next;
}

/**
 * The style with everything native cannot parse translated or removed.
 *
 * Returns the same object when there is nothing to change, and never mutates
 * the one it is given — a caller passing a style constant would otherwise
 * find it rewritten under them.
 */
export function adaptStyleForNative(style: StyleSpecification): StyleSpecification {
  let changed = false;

  let sources = style.sources;
  if (isObject(sources)) {
    const kept = Object.entries(sources).filter(
      ([, source]) =>
        !isObject(source) ||
        !TILED_SOURCES.has(source.type as string) ||
        source.url != null ||
        source.tiles != null
    );
    if (kept.length !== Object.keys(sources).length) {
      sources = Object.fromEntries(kept);
      changed = true;
    }
  }

  let layers = style.layers;
  if (Array.isArray(layers)) {
    let layersChanged = false;
    const next = layers.map((layer: unknown) => {
      if (!isObject(layer)) return layer;
      const layout = isObject(layer.layout) ? adaptLayout(layer.layout) : null;
      const paint = isObject(layer.paint) ? adaptPaint(layer.type, layer.paint) : null;
      if (!layout && !paint) return layer;
      layersChanged = true;
      return { ...layer, ...(layout ? { layout } : null), ...(paint ? { paint } : null) };
    });
    if (layersChanged) {
      layers = next;
      changed = true;
    }
  }

  return changed ? { ...style, sources, layers } : style;
}

const REMOTE_STYLE = /^https?:\/\//i;

/**
 * Adapted styles by URL. Bounded, because an app that switches between a
 * handful of styles should not refetch them on every switch, and one that
 * builds URLs on the fly should not keep every style it ever loaded.
 */
const loaded = new Map<string, Promise<StyleSpecification | null>>();
const LOADED_LIMIT = 8;

/**
 * Fetches a hosted style and adapts it. Resolves `null` when the style could
 * not be fetched or read, so the caller can leave the URL to the renderer —
 * which has its own cache and request headers, and reports its own errors.
 */
export function loadStyleForNative(url: string): Promise<StyleSpecification | null> {
  const cached = loaded.get(url);
  if (cached) return cached;

  const pending = fetch(url)
    .then((response) => (response.ok ? response.json() : null))
    .then((json: unknown) => (isObject(json) ? adaptStyleForNative(json) : null))
    .catch(() => null)
    .then((style) => {
      // A failure is not remembered: the next map to ask should try again.
      if (!style) loaded.delete(url);
      return style;
    });

  loaded.set(url, pending);
  if (loaded.size > LOADED_LIMIT) {
    loaded.delete(loaded.keys().next().value as string);
  }
  return pending;
}

/** A style passed inline — as an object, or as JSON text — adapted in place. */
function adaptInline(style: string | StyleSpecification): string | StyleSpecification {
  if (typeof style !== 'string') return adaptStyleForNative(style);
  if (!style.trimStart().startsWith('{')) return style;
  try {
    const parsed: unknown = JSON.parse(style);
    return isObject(parsed) ? adaptStyleForNative(parsed) : style;
  } catch {
    return style;
  }
}

/**
 * `mapStyle`, ready for the native renderer.
 *
 * `undefined` when no style was given, and `null` while a hosted style is
 * still being fetched. Anything that is not an http(s) URL or a style document
 * — an `asset://` path, a provider scheme — is passed through untouched,
 * because only the renderer knows how to load it.
 */
export function useNativeStyle(
  style: string | StyleSpecification | undefined
): string | StyleSpecification | null | undefined {
  const remote = typeof style === 'string' && REMOTE_STYLE.test(style) ? style : undefined;

  const inline = useMemo(
    () => (style === undefined || remote ? undefined : adaptInline(style)),
    [remote, style]
  );

  const [fetched, setFetched] = useState<{
    url: string;
    style: string | StyleSpecification;
  }>();

  useEffect(() => {
    if (!remote) return undefined;
    let live = true;
    loadStyleForNative(remote).then((adapted) => {
      if (live) setFetched({ url: remote, style: adapted ?? remote });
    });
    return () => {
      live = false;
    };
  }, [remote]);

  if (!remote) return inline;
  return fetched?.url === remote ? fetched.style : null;
}
