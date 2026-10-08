import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

/*
 * React Native on Android writes `busy` into a view's content description, and
 * gets two things wrong when the state ends:
 *
 * - A state that goes from an object to `undefined` is skipped outright, so the
 *   view keeps the old one. A progress bar turning determinate went on reading
 *   as busy beside its value.
 * - A rebuilt description is written only when it has something in it. A view
 *   with no label that stops being busy keeps saying "busy" and never reads its
 *   text again. A button that had loaded once said nothing else afterwards.
 */

const components = new URL('../src/components/', import.meta.url);

async function sources() {
  const entries = await readdir(components, { recursive: true });
  const files = entries.filter((entry) => entry.endsWith('.tsx'));
  return Promise.all(
    files.map(async (file) => [file, await readFile(new URL(file, components), 'utf8')])
  );
}

test('no component drops its busy state to undefined', async () => {
  for (const [file, source] of await sources()) {
    assert.doesNotMatch(
      source,
      /\{\s*busy:\s*true\s*\}\s*:\s*undefined/,
      `${file} passes busy as an object or undefined; pass { busy: <boolean> } instead`
    );
  }
});

test('a badge names itself from its word', async () => {
  const source = await readFile(new URL('animated-badge/index.tsx', components), 'utf8');
  assert.match(source, /const accessibleName = props\.accessibilityLabel \?\? textLabel\(children\);/);
  assert.match(
    source,
    /accessible=\{accessibleName != null\}\s*accessibilityLabel=\{accessibleName\}[\s\S]*?accessibilityState=\{\{ busy: status === 'loading' \}\}/
  );
});

test('a label is built only from children that are all text', async () => {
  const source = await readFile(new URL('../src/primitives/text.tsx', import.meta.url), 'utf8');
  const helper = source.slice(source.indexOf('export function textLabel'));
  assert.match(helper, /parts\.every\(\(part\) => typeof part === 'string' \|\| typeof part === 'number'\)/);
});
