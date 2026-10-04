'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

/**
 * The isometric line drawings on the home page's feature cards.
 *
 * Each card makes its claim with an object you can press: keys that restyle a
 * screen, a switch whose frame time is measured while it moves, a lid that
 * opens on a package with nothing native in it. A drawing that only animated
 * would be decoration, so every press changes something you can read back,
 * and the caption in the bottom-right corner says what.
 *
 * Every shape is an ordinary flat SVG `rect` or `text` laid onto a plane of an
 * isometric box by one `matrix()`. Nothing is a hand-written skewed polygon,
 * which is what keeps text, corners and strokes in perspective for free.
 * Depth is paint order alone: farther and lower parts are emitted first, and
 * every face has an opaque fill so it hides what is behind it.
 *
 * All colour comes from the site's theme tokens, so the figures follow light
 * and dark mode. There are two greys for linework and one live colour for
 * whatever is lit, pressed or on — no hue, gradient or shadow.
 */

type V3 = [number, number, number];

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);
const P = (x: number, y: number, z: number): [number, number] => [(x - y) * C, (x + y) * S - z];

/** A transform that lays anything drawn inside it flat on the plane O + U, V. */
const plane = (O: V3, U: V3, V: V3) => {
  const o = P(...O);
  const u = P(...U);
  const v = P(...V);
  return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`;
};
/** z = const, origin at the face's back corner. */
const TOP = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 1, 0]);
/** y = const, faces lower-left; pass its top-left corner. */
const FRONT = (x: number, y: number, z: number) => plane([x, y, z], [1, 0, 0], [0, 0, -1]);
/** x = const, faces lower-right; pass its top-left corner. */
const SIDE = (x: number, y: number, z: number) => plane([x, y, z], [0, -1, 0], [0, 0, -1]);

/**
 * Each scene is framed to its own bounds, `[x0, y0, z0, x1, y1, z1]`, so the
 * object fills its panel instead of sitting small in a volume sized for the
 * tallest one. The panels share one aspect ratio, so the cards still line up.
 */
type Bounds = [number, number, number, number, number, number];
const viewBox = ([ax, ay, az, bx, by, bz]: Bounds) => {
  const pts = [ax, bx].flatMap((x) => [ay, by].flatMap((y) => [az, bz].map((z) => P(x, y, z))));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const m = 0.06 * Math.max(x1 - x0, y1 - y0);
  return `${x0 - m} ${y0 - m} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}`;
};

function Face({ t, w, h, r = 0, className = 'iso-face' }: {
  t: string;
  w: number;
  h: number;
  r?: number;
  className?: string;
}) {
  return (
    <g transform={t}>
      <rect className={className} width={w} height={h} rx={r} />
    </g>
  );
}

/** A box at (x, y, z), `w` along x, `d` along y, `h` up — its three visible faces. */
function Box({ x, y, z, w, d, h, r = 0, className = 'iso-face', top = 'iso-face iso-top' }: {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
  r?: number;
  className?: string;
  top?: string;
}) {
  // The side radius is clamped so a thin slab keeps square edges instead of
  // turning into a lens.
  const rs = Math.min(r, h / 4);
  return (
    <>
      <Face t={SIDE(x + w, y + d, z + h)} w={d} h={h} r={rs} className={className} />
      <Face t={FRONT(x, y + d, z + h)} w={w} h={h} r={rs} className={className} />
      <Face t={TOP(x, y, z + h)} w={w} h={d} r={r} className={top} />
    </>
  );
}

/** A key standing on the ground plane, with its label lying on its top so it moves with it. */
function Key({ x, y, z = 0, w, d, h = 9, label, on, down, onPress, size = 10 }: {
  x: number;
  y: number;
  z?: number;
  w: number;
  d: number;
  h?: number;
  label: string;
  on?: boolean;
  down?: boolean;
  onPress: () => void;
  size?: number;
}) {
  return (
    <g
      className={cx('iso-press', down && 'down', on === true && 'on', on === false && 'off')}
      onClick={onPress}
    >
      <Box x={x} y={y} z={z} w={w} d={d} h={h} r={5} />
      <g transform={TOP(x, y, z + h)}>
        <text className="iso-label" x={w / 2} y={d / 2 + size * 0.35} fontSize={size} textAnchor="middle">
          {label}
        </text>
      </g>
    </g>
  );
}

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');

/** Momentary press state: the part sinks for 110ms, the way a key does. */
function usePress() {
  const [down, setDown] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [
    down,
    (key: string) => {
      setDown(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setDown(null), 110);
    },
  ] as const;
}

function Frame({ n, name, hint, readout, label, bounds, onKey, children }: {
  n: number;
  bounds: Bounds;
  name: string;
  hint: string;
  readout: string;
  label: string;
  onKey: (key: string) => boolean;
  children: ReactNode;
}) {
  const handleKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if (onKey(e.key.length === 1 ? e.key.toLowerCase() : e.key)) e.preventDefault();
  };
  return (
    <div className="iso-figure flex flex-col gap-2 font-mono text-[10px] tracking-[0.08em] text-muted-foreground">
      <div className="flex flex-wrap justify-between gap-x-3">
        <span>Fig {n}</span>
        <span className="uppercase">{name}</span>
      </div>
      <svg
        viewBox={viewBox(bounds)}
        role="img"
        tabIndex={0}
        aria-label={label}
        onKeyDown={handleKey}
        className="block aspect-[3/2] w-full touch-manipulation rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {children}
      </svg>
      <div className="flex flex-wrap justify-between gap-x-3">
        <span className="uppercase">{hint}</span>
        <span className="text-foreground">{readout}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 1 — a phone lying flat, styled by the class chips beside it            */
/* -------------------------------------------------------------------------- */

const CLASSES = ['p-4', 'rounded', 'bg-card'] as const;

function ClassPress() {
  const [on, setOn] = useState<Record<string, boolean>>({ 'p-4': true, rounded: true, 'bg-card': false });
  const [down, flash] = usePress();
  const press = (c: string) => {
    flash(c);
    setOn((s) => ({ ...s, [c]: !s[c] }));
  };
  const active = CLASSES.filter((c) => on[c]);
  const pad = on['p-4'] ? 9 : 3;
  const r = on.rounded ? 9 : 1;
  const filled = on['bg-card'];
  return (
    <Frame
      n={1}
      bounds={[6, 6, 0, 196, 104, 15]}
      name="Class press"
      hint="chips · 1 2 3"
      readout={`${active.join(' ') || 'no classes'} · ${active.length}`}
      label="A phone lying face up with a card on its screen, and three chips labelled p-4, rounded and bg-card that toggle those classes on the card. Press 1, 2 or 3."
      onKey={(k) => {
        const i = ['1', '2', '3'].indexOf(k);
        if (i < 0) return false;
        press(CLASSES[i]);
        return true;
      }}
    >
      <Box x={6} y={8} z={0} w={124} d={96} h={8} r={14} />
      <g transform={TOP(6, 8, 8)}>
        <rect className="iso-face iso-glass" x={8} y={8} width={108} height={80} rx={9} />
        <rect className="iso-detail" x={50} y={13} width={24} height={4} rx={2} />
        <rect
          className={cx('iso-face', 'iso-anim', filled && 'iso-fill-live')}
          x={18}
          y={28}
          width={88}
          height={48}
          rx={r}
        />
        <rect className={cx('iso-bar', filled && 'iso-bar-inverse')} x={18 + pad} y={28 + pad} width={46} height={5} rx={1} />
        <rect className={cx('iso-bar', filled && 'iso-bar-inverse')} x={18 + pad} y={38 + pad} width={30} height={5} rx={1} />
      </g>
      {CLASSES.map((c, i) => (
        <Key
          key={c}
          x={146}
          y={6 + i * 34}
          w={50}
          d={26}
          h={7}
          label={c}
          size={c === 'p-4' ? 10 : 8.5}
          on={on[c]}
          down={down === c}
          onPress={() => press(c)}
        />
      ))}
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 2 — one chunky switch, with its frame times printed on its face        */
/* -------------------------------------------------------------------------- */

const BARS = 26;
const BUDGET = 16.7;

function FrameSwitch() {
  const [on, setOn] = useState(false);
  const [frames, setFrames] = useState<number[]>(() => Array(BARS).fill(0));
  const [down, flash] = usePress();

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      setFrames((f) => [...f.slice(1), dt]);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  const toggle = () => {
    flash('switch');
    setOn((v) => !v);
  };
  const recent = frames.filter((f) => f > 0).slice(-16);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const knob = P(60, 0, 0);
  const barH = (f: number) => (Math.min(f, 40) / 40) * 22;

  return (
    <Frame
      n={2}
      bounds={[36, 18, 0, 164, 88, 54]}
      name="Frame meter"
      hint="switch · space"
      readout={
        !on ? 'off · idle' : avg ? `on · ${avg.toFixed(1)}ms · ${Math.round(1000 / avg)}fps` : 'on · measuring'
      }
      label="A large toggle switch whose front face plots the time of each animation frame while it is on. Press space to toggle."
      onKey={(k) => {
        if (k !== ' ' && k !== 'Enter') return false;
        toggle();
        return true;
      }}
    >
      <g className={cx('iso-press', down === 'switch' && 'down', on && 'on')} onClick={toggle}>
        <Box x={36} y={18} z={0} w={128} d={70} h={40} r={8} />
        <g transform={TOP(36, 18, 40)}>
          <rect className="iso-face iso-glass" x={10} y={18} width={108} height={34} rx={17} />
          <text className="iso-label iso-dim" x={14} y={12} fontSize={7}>
            off
          </text>
          <text className="iso-label iso-dim" x={114} y={12} fontSize={7} textAnchor="end">
            on
          </text>
        </g>
        <g transform={FRONT(36, 88, 40)}>
          {frames.map((f, i) => {
            const h = barH(f);
            return (
              <rect
                key={i}
                className={on ? 'iso-fill-live' : 'iso-bar'}
                x={10 + i * 4.2}
                y={31 - h}
                width={2.4}
                height={Math.max(h, 0.6)}
              />
            );
          })}
          <line className="iso-detail" x1={8} x2={120} y1={31 - barH(BUDGET)} y2={31 - barH(BUDGET)} strokeDasharray="2 3" />
          <text className="iso-label iso-dim" x={120} y={28 - barH(BUDGET)} fontSize={5.5} textAnchor="end">
            16.7ms
          </text>
        </g>
        <g
          className="iso-anim"
          style={{ transform: on ? `translate(${knob[0]}px, ${knob[1]}px)` : 'translate(0px, 0px)' }}
        >
          <Box x={48} y={38} z={40} w={44} d={30} h={14} r={10} />
          <g transform={TOP(48, 38, 54)}>
            <rect className={on ? 'iso-fill-live' : 'iso-bar'} x={18} y={9} width={8} height={12} rx={2} />
          </g>
        </g>
      </g>
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 3 — a staircase of swatches, one per theme family                       */
/* -------------------------------------------------------------------------- */

const FAMILIES = [
  { name: 'panel', r: 7 },
  { name: 'moon', r: 3 },
  { name: 'grass', r: 14 },
];

function ThemeDial() {
  const [family, setFamily] = useState(0);
  const [dark, setDark] = useState(false);
  const [down, flash] = usePress();
  const pick = (i: number) => {
    flash(`f${i}`);
    setFamily(i);
  };
  const mode = () => {
    flash('mode');
    setDark((d) => !d);
  };
  const { name, r } = FAMILIES[family];
  return (
    <Frame
      n={3}
      bounds={[4, 6, 0, 196, 104, 35]}
      name="Swatch stair"
      hint="family · 1 2 3 d"
      readout={`${name} · ${dark ? 'dark' : 'light'} · r ${r}`}
      label="Three theme swatches stacked like stairs, each with its own corner radius, and a small key that switches light and dark. Press 1, 2 or 3 to pick a family, or d."
      onKey={(k) => {
        const i = ['1', '2', '3'].indexOf(k);
        if (i >= 0) pick(i);
        else if (k === 'd') mode();
        else return false;
        return true;
      }}
    >
      {FAMILIES.map((f, i) => {
        const x = 4 + i * 54;
        const y = 6;
        const z = i * 12 + (family === i ? 5 : 0);
        const selected = family === i;
        return (
          <g
            key={f.name}
            className={cx('iso-press', down === `f${i}` && 'down', selected ? 'on' : 'off')}
            onClick={() => pick(i)}
          >
            <Box x={x} y={y} z={z} w={88} d={60} h={6} r={f.r} />
            <g transform={TOP(x, y, z + 6)} className={selected ? (dark ? 'iso-on-ink' : 'iso-on-paper') : undefined}>
              <rect
                className={cx('iso-face', 'iso-anim', !selected && 'iso-glass')}
                x={7}
                y={7}
                width={74}
                height={46}
                rx={Math.max(f.r - 3, 1)}
              />
              <text
                className="iso-label"
                x={14}
                y={20}
                fontSize={9}
              >
                {f.name}
              </text>
              <rect
                className={selected ? 'iso-btn' : 'iso-bar'}
                x={14}
                y={34}
                width={34}
                height={11}
                rx={Math.min(f.r, 5)}
              />
            </g>
          </g>
        );
      })}
      <Key x={118} y={76} w={56} d={28} h={8} label={dark ? 'dark' : 'light'} size={8} on={dark} down={down === 'mode'} onPress={mode} />
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 4 — an app as a block, and the wall switch beside it                   */
/* -------------------------------------------------------------------------- */

function DarkRocker() {
  const [dark, setDark] = useState(true);
  const [flips, setFlips] = useState(0);
  const [down, flash] = usePress();
  const flip = () => {
    flash('rocker');
    setDark((d) => !d);
    setFlips((n) => n + 1);
  };
  const face = cx('iso-face', 'iso-anim', dark ? 'iso-ink' : 'iso-paper');
  return (
    <Frame
      n={4}
      bounds={[14, 28, 0, 186, 110, 66]}
      name="Wall switch"
      hint="rocker · space"
      readout={`${dark ? 'dark' : 'light'} · flip ${flips} · 0 renders`}
      label="A block standing for an app, and a wall switch beside it. Flipping the switch turns the block between light and dark; the render count on its face stays at zero. Press space to flip it."
      onKey={(k) => {
        if (k !== ' ' && k !== 'Enter') return false;
        flip();
        return true;
      }}
    >
      <Box x={14} y={28} z={0} w={92} d={74} h={58} r={8} className={face} top={cx(face, 'iso-top')} />
      <g transform={FRONT(14, 102, 58)} className={dark ? 'iso-on-ink' : 'iso-on-paper'}>
        {/* The component tree: it is restyled around, never rendered again. */}
        <path className="iso-detail" d="M46 16 V22 H24 V28 M46 22 H68 V28" />
        <rect className="iso-face" x={36} y={8} width={20} height={9} rx={2} />
        <rect className="iso-face" x={14} y={28} width={20} height={9} rx={2} />
        <rect className="iso-face" x={58} y={28} width={20} height={9} rx={2} />
        <text className="iso-label" x={46} y={50} fontSize={7} textAnchor="middle">
          renders 0
        </text>
      </g>
      <g className={cx('iso-press', down === 'rocker' && 'down')} onClick={flip}>
        <Box x={138} y={44} z={0} w={48} d={8} h={66} r={5} />
        <Box x={150} y={52} z={22} w={24} d={dark ? 2 : 6} h={14} r={2} className={cx('iso-face', !dark && 'iso-lit')} />
        <Box x={150} y={52} z={36} w={24} d={dark ? 6 : 2} h={14} r={2} className={cx('iso-face', dark && 'iso-lit')} />
        <g transform={FRONT(138, 52, 66)}>
          <text className={cx('iso-label', !dark && 'iso-dim')} x={24} y={10} fontSize={6.5} textAnchor="middle">
            dark
          </text>
          <text className={cx('iso-label', dark && 'iso-dim')} x={24} y={60} fontSize={6.5} textAnchor="middle">
            light
          </text>
        </g>
      </g>
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 5 — a standing phone, and the speaker that reads it aloud              */
/* -------------------------------------------------------------------------- */

const TARGETS = [
  { label: 'Save', role: 'button', y: 14 },
  { label: 'Share', role: 'button', y: 32 },
];

function ScreenReader() {
  const [focus, setFocus] = useState(0);
  const [down, flash] = usePress();
  const move = (dir: 1 | -1) => {
    flash(dir === 1 ? 'next' : 'prev');
    setFocus((f) => (f + dir + TARGETS.length) % TARGETS.length);
  };
  const t = TARGETS[focus];
  return (
    <Frame
      n={5}
      bounds={[22, 14, 0, 188, 102, 74]}
      name="Screen reader"
      hint="swipe · ← →"
      readout={`focus ${focus + 1}/${TARGETS.length} · icon hidden`}
      label="A standing phone with a Save button, a Share button and a decorative icon, a speaker that says what has focus, and two keys that move focus between the buttons. The icon is skipped. Press the left and right arrows."
      onKey={(k) => {
        if (k === 'ArrowRight' || k === 'Tab' || k === ' ') move(1);
        else if (k === 'ArrowLeft') move(-1);
        else return false;
        return true;
      }}
    >
      <Box x={22} y={34} z={0} w={60} d={10} h={74} r={9} />
      <g transform={FRONT(22, 44, 74)}>
        <rect className="iso-face iso-glass" x={5} y={6} width={50} height={62} rx={6} />
        {TARGETS.map((b, i) => (
          <g key={b.label}>
            <rect className="iso-face" x={11} y={b.y} width={38} height={13} rx={3} />
            <text className={cx('iso-label', i !== focus && 'iso-dim')} x={30} y={b.y + 9} fontSize={6.5} textAnchor="middle">
              {b.label}
            </text>
          </g>
        ))}
        {/* The decorative icon: drawn, but never focused or announced. */}
        <circle className="iso-detail" cx={30} cy={57} r={5} />
        <path className="iso-detail" d="M27 57 h6 M30 54 v6" />
        <rect
          className="iso-ring iso-anim"
          style={{ transform: `translateY(${t.y - 14}px)` }}
          x={8}
          y={11}
          width={44}
          height={19}
          rx={5}
        />
      </g>
      <Box x={110} y={14} z={0} w={76} d={44} h={26} r={6} />
      <g transform={TOP(110, 14, 26)}>
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} className="iso-detail" x1={12} x2={64} y1={10 + i * 6} y2={10 + i * 6} />
        ))}
      </g>
      <g transform={FRONT(110, 58, 26)}>
        <rect className="iso-face iso-fill-live" x={6} y={6} width={64} height={14} rx={3} />
        <text className="iso-label iso-label-inverse" x={38} y={15.5} fontSize={6.5} textAnchor="middle">
          “{t.label}, {t.role}”
        </text>
      </g>
      <Key x={108} y={74} w={36} d={28} label="←" size={11} down={down === 'prev'} onPress={() => move(-1)} />
      <Key x={152} y={74} w={36} d={28} label="→" size={11} down={down === 'next'} onPress={() => move(1)} />
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */
/* Fig 6 — open the package, find nothing native in it                         */
/* -------------------------------------------------------------------------- */

const FILES = ['button.tsx', 'sheet.tsx', 'theme.ts'];

function Package() {
  const [open, setOpen] = useState(false);
  const [down, flash] = usePress();
  const toggle = () => {
    flash('lid');
    setOpen((o) => !o);
  };
  return (
    <Frame
      n={6}
      bounds={[32, 4, 0, 168, 104, 76]}
      name="Package"
      hint="lid · space"
      readout={open ? `open · ${FILES.length} files · 0 native` : 'closed · pure ts'}
      label="A package. Pressing its lid opens it to show TypeScript files and an empty slot where native code would go. Press space to open or close it."
      onKey={(k) => {
        if (k !== ' ' && k !== 'Enter') return false;
        toggle();
        return true;
      }}
    >
      <g className={cx('iso-press', down === 'lid' && 'down')} onClick={toggle}>
        {/* The lid hinged up at the back edge; painted first because it is farthest. */}
        <g className={cx('iso-fade', !open && 'iso-hidden')}>
          <Box x={32} y={4} z={44} w={136} d={8} h={30} r={3} />
          <g transform={FRONT(32, 12, 74)}>
            <text className="iso-label iso-dim" x={68} y={18} fontSize={8} textAnchor="middle">
              panelui-native
            </text>
          </g>
        </g>
        <Box x={36} y={16} z={0} w={128} d={84} h={44} r={4} />
        <g transform={FRONT(36, 100, 44)}>
          <text className="iso-label iso-dim" x={64} y={26} fontSize={9} textAnchor="middle">
            0 native modules
          </text>
        </g>
        {/* Inside, on the plane of the open top. */}
        <g transform={TOP(36, 16, 44)}>
          <rect className="iso-face iso-glass" x={6} y={6} width={116} height={72} rx={3} />
          {FILES.map((f, i) => (
            <text key={f} className="iso-label" x={14} y={22 + i * 13} fontSize={8}>
              {f}
            </text>
          ))}
          <rect className="iso-detail" x={12} y={58} width={104} height={13} rx={2} strokeDasharray="2 2" />
          <text className="iso-label iso-dim" x={18} y={67.5} fontSize={7}>
            native/ — empty
          </text>
        </g>
        <g className={cx('iso-fade', open && 'iso-hidden')}>
          <Box x={32} y={12} z={44} w={136} d={92} h={8} r={4} />
          <g transform={TOP(32, 12, 52)}>
            <text className="iso-label" x={68} y={50} fontSize={10} textAnchor="middle">
              panelui-native
            </text>
          </g>
        </g>
      </g>
    </Frame>
  );
}

/* -------------------------------------------------------------------------- */

const FIGURES = {
  tailwind: ClassPress,
  fps: FrameSwitch,
  themes: ThemeDial,
  dark: DarkRocker,
  a11y: ScreenReader,
  native: Package,
} as const;

export type IsoFigureKind = keyof typeof FIGURES;

export function IsoFigure({ kind }: { kind: IsoFigureKind }) {
  const Figure = FIGURES[kind];
  return (
    <>
      {/* Hoisted and de-duplicated by React, so six figures share one sheet. */}
      <style href="iso-figures" precedence="default">
        {CSS}
      </style>
      <Figure />
    </>
  );
}

const CSS = `
.iso-figure {
  --iso-body: var(--card);
  --iso-deck: color-mix(in srgb, var(--foreground) 5%, var(--card));
  --iso-glass: color-mix(in srgb, var(--foreground) 3%, var(--card));
  --iso-line: color-mix(in srgb, var(--foreground) 38%, var(--card));
  --iso-detail: color-mix(in srgb, var(--foreground) 20%, var(--card));
  --iso-live: var(--foreground);
}
.iso-face { fill: var(--iso-body); stroke: var(--iso-line); stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.iso-face.iso-top { fill: var(--iso-deck); }
.iso-face.iso-glass { fill: var(--iso-glass); stroke: var(--iso-detail); }
.iso-face.iso-lit { stroke: var(--iso-live); }
.iso-detail { fill: none; stroke: var(--iso-detail); stroke-width: 1; vector-effect: non-scaling-stroke; }
.iso-ring { fill: none; stroke: var(--iso-live); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.iso-bar { fill: var(--iso-detail); }
.iso-bar-inverse { fill: var(--iso-body); }
.iso-fill-live, .iso-face.iso-fill-live { fill: var(--iso-live); }
.iso-label { fill: var(--iso-live); font-family: var(--font-mono), ui-monospace, monospace; font-weight: 500; letter-spacing: 0.02em; }
.iso-label-inverse { fill: var(--iso-body); }
.iso-dim { fill: var(--iso-line); }
/* Light and dark as the figures depict them: fixed paper and ink, not the
   site's own tokens, so "dark" reads as dark whichever theme the page is in. */
.iso-face.iso-paper, .iso-on-paper .iso-face { fill: #f6f6f5; stroke: #9a9a98; }
.iso-face.iso-ink, .iso-on-ink .iso-face { fill: #141516; stroke: #6b6c6e; }
.iso-on-paper .iso-label { fill: #141516; }
.iso-on-ink .iso-label { fill: #f6f6f5; }
.iso-on-paper .iso-detail { stroke: #9a9a98; }
.iso-on-ink .iso-detail { stroke: #6b6c6e; }
.iso-on-paper .iso-btn { fill: #141516; }
.iso-on-ink .iso-btn { fill: #f6f6f5; }
.iso-press { cursor: pointer; transition: transform 60ms ease-out; }
.iso-press.down { transform: translateY(3px); }
.iso-press.down .iso-face, .iso-press.on .iso-top { stroke: var(--iso-live); }
.iso-press.off .iso-label { fill: var(--iso-line); }
.iso-anim { transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), fill 160ms ease-out, rx 160ms ease-out; }
.iso-fade { transition: opacity 160ms ease-out; }
.iso-hidden { opacity: 0; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .iso-press, .iso-anim, .iso-fade { transition: none; }
  .iso-press.down { transform: none; }
}
`;
