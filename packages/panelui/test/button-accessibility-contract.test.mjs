import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/components/button/index.tsx', import.meta.url), 'utf8');

function assertButtonContract(content) {
  assert.match(content, /glass = false,\s*accessibilityState,\s*\.\.\.props/);
  assert.match(content, /pressScale=\{attached \? 1 : undefined\}[\s\S]*\{\.\.\.props\}\s*accessibilityRole="button"\s*accessibilityState=\{\{ \.\.\.accessibilityState, disabled: isDisabled, busy: loading \}\}/);
  // A busy button with no label keeps reading as busy on Android once it
  // settles, so the button names itself from its text when the caller did not.
  assert.match(content, /busy: loading \}\}[\s\S]*?accessibilityLabel=\{props\.accessibilityLabel \?\? textLabel\(children\)\}/);
}

test('portable Button merges consumer state under owned button semantics', () => assertButtonContract(source));

test('the copied Button source retains the accessibility contract', async () => {
  const item = JSON.parse(await readFile(new URL('../../../apps/docs/public/r/button.json', import.meta.url), 'utf8'));
  assertButtonContract(item.files.find((file) => file.path === 'ui/button.tsx').content);
});
