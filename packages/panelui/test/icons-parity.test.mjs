import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import test from 'node:test';

const source = await readFile(new URL('../src/icons/index.tsx', import.meta.url), 'utf8');

/*
 * The set as it is published.
 *
 * Written out rather than derived, because deriving it from the file would
 * make the test agree with whatever the file happens to say — including with a
 * rename or a deletion, which is the whole thing it exists to catch. Every one
 * of these is exported from `panelui-native`, so dropping one breaks an import
 * in somebody's app.
 */
const PUBLISHED = [
  'AlertTriangleIcon', 'AppleIcon', 'ArrowDownIcon', 'ArrowUpIcon', 'ArrowUpRightIcon',
  'AudioLinesIcon', 'BadgeCheckIcon', 'BellIcon', 'BoldIcon', 'BookIcon',
  'BookmarkIcon', 'BugIcon', 'CalendarIcon', 'CallIcon', 'CameraIcon',
  'CardIcon', 'CheckCircleIcon', 'CheckIcon', 'ChevronDownIcon', 'ChevronLeftIcon',
  'ChevronRightIcon', 'ChevronUpIcon', 'ChevronsUpDownIcon', 'CircleIcon', 'ClockIcon',
  'CodeIcon', 'CompassIcon', 'CopyIcon', 'CrosshairIcon', 'DownloadIcon',
  'EllipsisIcon', 'EyeIcon', 'FacebookIcon', 'FileIcon', 'FolderIcon',
  'FolderOpenIcon', 'GlobeIcon', 'GoogleIcon', 'GripVerticalIcon', 'HeadingIcon',
  'HeadsetIcon', 'HeartIcon', 'HelpCircleIcon', 'ImageIcon', 'InfoIcon',
  'ItalicIcon', 'KeyboardIcon', 'LifebuoyIcon', 'LinkIcon', 'ListChecksIcon',
  'ListIcon', 'ListOrderedIcon', 'LockIcon', 'MailIcon', 'MaximizeIcon',
  'MenuIcon', 'MessageCircleIcon', 'MicIcon', 'MinusIcon', 'MoonIcon',
  'PackageIcon', 'PaperclipIcon', 'PauseIcon', 'PencilIcon', 'PlayIcon',
  'PlusIcon', 'PlusSquareIcon', 'QuoteIcon', 'ReceiptIcon', 'RepeatIcon',
  'RotateCcwIcon', 'RotateCwIcon', 'SearchIcon', 'SendArrowIcon', 'SendIcon',
  'ShareNodesIcon', 'ShieldAlertIcon', 'ShieldCheckIcon', 'SparklesIcon', 'StarIcon',
  'SunIcon', 'TicketIcon', 'TrashIcon', 'UnlockIcon', 'XIcon',
];

/** Every icon the module exports, however it is drawn. */
function exported() {
  return new Set([
    ...[...source.matchAll(/^export const (\w+Icon) = icon\(/gm)].map((m) => m[1]),
    ...[...source.matchAll(/^export function (\w+Icon)\(/gm)].map((m) => m[1]),
  ]);
}

test('every published icon is still exported', () => {
  const have = exported();
  const missing = PUBLISHED.filter((name) => !have.has(name));
  assert.deepEqual(missing, [], `icons dropped from the public set: ${missing.join(', ')}`);
});

test('the set has not grown without the list being updated', () => {
  const extra = [...exported()].filter((name) => !PUBLISHED.includes(name)).sort();
  assert.deepEqual(extra, [], `add these to PUBLISHED: ${extra.join(', ')}`);
});

test('every mapped icon names a glyph that exists', () => {
  const aliases = new Map(
    [...source.matchAll(/^import (Hg\w+) from '@hugeicons\/core-free-icons\/(\w+)';$/gm)].map(
      (match) => [match[1], match[2]]
    )
  );
  const mapped = [...source.matchAll(/^export const (\w+Icon) = icon\((Hg\w+),/gm)];
  assert.ok(mapped.length > 60, 'expected most of the set to be mapped');

  for (const [, name, alias] of mapped) {
    const glyph = aliases.get(alias);
    assert.ok(glyph, `${name}: ${alias} is used but never imported`);
    const file = new URL(
      `../../../node_modules/@hugeicons/core-free-icons/dist/esm/${glyph}.js`,
      import.meta.url
    );
    assert.ok(existsSync(file), `${name}: no glyph named ${glyph}`);
  }
});

test('no two icons resolve to the same glyph', () => {
  const used = [...source.matchAll(/^export const \w+Icon = icon\((Hg\w+),/gm)].map((m) => m[1]);
  const seen = new Set();
  const repeated = used.filter((alias) => (seen.has(alias) ? true : (seen.add(alias), false)));
  assert.deepEqual(repeated, [], `two icons share a glyph: ${repeated.join(', ')}`);
});
