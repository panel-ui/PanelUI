import type { ComponentEntry } from './component-types';
export type { ComponentEntry, ComponentLayout, Demo } from './component-types';

const load01 = () => import('./demos/chunk-01');
const load02 = () => import('./demos/chunk-02');
const load03 = () => import('./demos/chunk-03');
const load04 = () => import('./demos/chunk-04');
const load05 = () => import('./demos/chunk-05');
const load06 = () => import('./demos/chunk-06');
const load07 = () => import('./demos/chunk-07');
const load08 = () => import('./demos/chunk-08');
const load09 = () => import('./demos/chunk-09');
const load10 = () => import('./demos/chunk-10');
const load11 = () => import('./demos/chunk-11');
const load12 = () => import('./demos/chunk-12');
const load13 = () => import('./demos/chunk-13');
const load14 = () => import('./demos/chunk-14');

const LOADERS: Record<string, () => Promise<ComponentEntry | undefined>> = {
  'ai-input': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['ai-input']),
  accordion: () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['accordion']),
  alert: () => load01().then((module) => module.ENTRIES_BY_SLUG['alert']),
  'area-chart': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['area-chart']),
  avatar: () => load01().then((module) => module.ENTRIES_BY_SLUG['avatar']),
  attachment: () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['attachment']),
  'animated-badge': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['animated-badge']),
  badge: () => load01().then((module) => module.ENTRIES_BY_SLUG['badge']),
  'bubble-chart': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['bubble-chart']),
  'pyramid-chart': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['pyramid-chart']),
  'bar-chart': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['bar-chart']),
  'candlestick-chart': () =>
    load01().then((module) => module.ENTRIES_BY_SLUG['candlestick-chart']),
  'bottom-sheet': () =>
    load02().then((module) => module.ENTRIES_BY_SLUG['bottom-sheet']),
  breadcrumb: () =>
    load02().then((module) => module.ENTRIES_BY_SLUG['breadcrumb']),
  button: () => load02().then((module) => module.ENTRIES_BY_SLUG['button']),
  card: () => load02().then((module) => module.ENTRIES_BY_SLUG['card']),
  'button-group': () =>
    load02().then((module) => module.ENTRIES_BY_SLUG['button-group']),
  calendar: () => load02().then((module) => module.ENTRIES_BY_SLUG['calendar']),
  carousel: () => load02().then((module) => module.ENTRIES_BY_SLUG['carousel']),
  checkbox: () => load02().then((module) => module.ENTRIES_BY_SLUG['checkbox']),
  chip: () => load03().then((module) => module.ENTRIES_BY_SLUG['chip']),
  collapsible: () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['collapsible']),
  'color-picker': () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['color-picker']),
  combobox: () => load03().then((module) => module.ENTRIES_BY_SLUG['combobox']),
  questionnaire: () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['questionnaire']),
  'date-picker': () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['date-picker']),
  'date-time-picker': () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['date-time-picker']),
  'feedback': () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['feedback']),
  dialog: () => load03().then((module) => module.ENTRIES_BY_SLUG['dialog']),
  direction: () =>
    load03().then((module) => module.ENTRIES_BY_SLUG['direction']),
  drawer: () => load04().then((module) => module.ENTRIES_BY_SLUG['drawer']),
  'empty-state': () =>
    load04().then((module) => module.ENTRIES_BY_SLUG['empty-state']),
  fab: () => load04().then((module) => module.ENTRIES_BY_SLUG['fab']),
  field: () => load04().then((module) => module.ENTRIES_BY_SLUG['field']),
  form: () => load04().then((module) => module.ENTRIES_BY_SLUG['form']),
  flow: () => load04().then((module) => module.ENTRIES_BY_SLUG['flow']),
  frame: () => load04().then((module) => module.ENTRIES_BY_SLUG['frame']),
  'heatmap-chart': () =>
    load04().then((module) => module.ENTRIES_BY_SLUG['heatmap-chart']),
  'hex-chart': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['hex-chart']),
  input: () => load05().then((module) => module.ENTRIES_BY_SLUG['input']),
  'input-group': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['input-group']),
  'search-bar': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['search-bar']),
  'number-input': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['number-input']),
  'otp-input': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['otp-input']),
  'grid-item': () =>
    load05().then((module) => module.ENTRIES_BY_SLUG['grid-item']),
  item: () => load05().then((module) => module.ENTRIES_BY_SLUG['item']),
  label: () => load05().then((module) => module.ENTRIES_BY_SLUG['label']),
  'line-chart': () =>
    load06().then((module) => module.ENTRIES_BY_SLUG['line-chart']),
  kpi: () => load06().then((module) => module.ENTRIES_BY_SLUG['kpi']),
  'radar-chart': () =>
    load06().then((module) => module.ENTRIES_BY_SLUG['radar-chart']),
  loader: () => load06().then((module) => module.ENTRIES_BY_SLUG['loader']),
  map: () => load06().then((module) => module.ENTRIES_BY_SLUG['map']),
  'markdown-editor': () =>
    load06().then((module) => module.ENTRIES_BY_SLUG['markdown-editor']),
  marker: () => load06().then((module) => module.ENTRIES_BY_SLUG['marker']),
  marquee: () => load06().then((module) => module.ENTRIES_BY_SLUG['marquee']),
  menu: () => load06().then((module) => module.ENTRIES_BY_SLUG['menu']),
  'context-menu': () =>
    load07().then((module) => module.ENTRIES_BY_SLUG['context-menu']),
  'message-scroller': () =>
    load07().then((module) => module.ENTRIES_BY_SLUG['message-scroller']),
  message: () => load07().then((module) => module.ENTRIES_BY_SLUG['message']),
  planner: () => load07().then((module) => module.ENTRIES_BY_SLUG['planner']),
  popover: () => load07().then((module) => module.ENTRIES_BY_SLUG['popover']),
  'qr-code': () => load07().then((module) => module.ENTRIES_BY_SLUG['qr-code']),
  meter: () => load07().then((module) => module.ENTRIES_BY_SLUG['meter']),
  progress: () => load07().then((module) => module.ENTRIES_BY_SLUG['progress']),
  'progress-button': () => load07().then((module) => module.ENTRIES_BY_SLUG['progress-button']),
  'slide-button': () => load07().then((module) => module.ENTRIES_BY_SLUG['slide-button']),
  'radio-group': () =>
    load08().then((module) => module.ENTRIES_BY_SLUG['radio-group']),
  rating: () => load08().then((module) => module.ENTRIES_BY_SLUG['rating']),
  'section-rail': () =>
    load08().then((module) => module.ENTRIES_BY_SLUG['section-rail']),
  'selection-mode': () =>
    load08().then((module) => module.ENTRIES_BY_SLUG['selection-mode']),
  select: () => load08().then((module) => module.ENTRIES_BY_SLUG['select']),
  surface: () => load08().then((module) => module.ENTRIES_BY_SLUG['surface']),
  'circular-text': () =>
    load08().then((module) => module.ENTRIES_BY_SLUG['circular-text']),
  'flip-card': () => load08().then((module) => module.ENTRIES_BY_SLUG['flip-card']),
  shimmer: () => load08().then((module) => module.ENTRIES_BY_SLUG['shimmer']),
  'text-animation': () =>
    load08().then((module) => module.ENTRIES_BY_SLUG['text-animation']),
  'scroll-text': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['scroll-text']),
  'funnel-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['funnel-chart']),
  'treemap-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['treemap-chart']),
  plot: () => load09().then((module) => module.ENTRIES_BY_SLUG['plot']),
  'pie-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['pie-chart']),
  'live-line-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['live-line-chart']),
  'polar-area-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['polar-area-chart']),
  'ring-chart': () =>
    load09().then((module) => module.ENTRIES_BY_SLUG['ring-chart']),
  'scatter-chart': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['scatter-chart']),
  'scroll-canvas': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['scroll-canvas']),
  'thinking-orb': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['thinking-orb']),
  'approval-card': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['approval-card']),
  'image-generation': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['image-generation']),
  reasoning: () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['reasoning']),
  sources: () => load10().then((module) => module.ENTRIES_BY_SLUG['sources']),
  task: () => load10().then((module) => module.ENTRIES_BY_SLUG['task']),
  'code-block': () =>
    load10().then((module) => module.ENTRIES_BY_SLUG['code-block']),
  response: () => load10().then((module) => module.ENTRIES_BY_SLUG['response']),
  post: () => load11().then((module) => module.ENTRIES_BY_SLUG['post']),
  plan: () => load11().then((module) => module.ENTRIES_BY_SLUG['plan']),
  soundwave: () =>
    load11().then((module) => module.ENTRIES_BY_SLUG['soundwave']),
  'scroll-blur': () =>
    load11().then((module) => module.ENTRIES_BY_SLUG['scroll-blur']),
  'scroll-fade': () =>
    load11().then((module) => module.ENTRIES_BY_SLUG['scroll-fade']),
  separator: () =>
    load11().then((module) => module.ENTRIES_BY_SLUG['separator']),
  signature: () =>
    load11().then((module) => module.ENTRIES_BY_SLUG['signature']),
  skeleton: () => load11().then((module) => module.ENTRIES_BY_SLUG['skeleton']),
  sortable: () => load11().then((module) => module.ENTRIES_BY_SLUG['sortable']),
  slider: () => load12().then((module) => module.ENTRIES_BY_SLUG['slider']),
  spinner: () => load12().then((module) => module.ENTRIES_BY_SLUG['spinner']),
  'section-progress': () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['section-progress']),
  'page-header': () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['page-header']),
  splitter: () => load14().then((module) => module.ENTRIES_BY_SLUG['splitter']),
  'split-view': () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['split-view']),
  steps: () => load12().then((module) => module.ENTRIES_BY_SLUG['steps']),
  swipe: () => load12().then((module) => module.ENTRIES_BY_SLUG['swipe']),
  switch: () => load12().then((module) => module.ENTRIES_BY_SLUG['switch']),
  table: () => load12().then((module) => module.ENTRIES_BY_SLUG['table']),
  pagination: () =>
    load12().then((module) => module.ENTRIES_BY_SLUG['pagination']),
  tabs: () => load12().then((module) => module.ENTRIES_BY_SLUG['tabs']),
  'toggle-button': () =>
    load13().then((module) => module.ENTRIES_BY_SLUG['toggle-button']),
  textarea: () => load13().then((module) => module.ENTRIES_BY_SLUG['textarea']),
  'theme-selector': () =>
    load13().then((module) => module.ENTRIES_BY_SLUG['theme-selector']),
  'tag-input': () =>
    load13().then((module) => module.ENTRIES_BY_SLUG['tag-input']),
  'time-picker': () =>
    load13().then((module) => module.ENTRIES_BY_SLUG['time-picker']),
  timeline: () => load13().then((module) => module.ENTRIES_BY_SLUG['timeline']),
  toast: () => load13().then((module) => module.ENTRIES_BY_SLUG['toast']),
  tooltip: () => load13().then((module) => module.ENTRIES_BY_SLUG['tooltip']),
  tree: () => load13().then((module) => module.ENTRIES_BY_SLUG['tree']),
  typography: () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['typography']),
  panelside: () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['panelside']),
  tour: () => load14().then((module) => module.ENTRIES_BY_SLUG['tour']),
  'waterfall-chart': () =>
    load14().then((module) => module.ENTRIES_BY_SLUG['waterfall-chart']),
};

export function loadComponent(slug: string) {
  return LOADERS[slug]?.() ?? Promise.resolve(undefined);
}

export const CHART_SLUGS = [
  'plot',
  'line-chart',
  'area-chart',
  'bar-chart',
  'pie-chart',
  'funnel-chart',
  'treemap-chart',
  'hex-chart',
  'ring-chart',
  'radar-chart',
  'scatter-chart',
  'candlestick-chart',
  'heatmap-chart',
  'waterfall-chart',
  'pyramid-chart',
  'bubble-chart',
] as const;

export async function loadChartShowcase() {
  const entries = await Promise.all(CHART_SLUGS.map(loadComponent));
  return entries.filter((entry): entry is ComponentEntry => Boolean(entry));
}
