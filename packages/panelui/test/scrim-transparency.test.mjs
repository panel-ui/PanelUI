import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/primitives/scrim.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('scrim.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function sourceFunction(name) {
  const declaration = parsed.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === name
  );
  assert.ok(declaration, `${name} helper is present`);
  return declaration.getText(parsed);
}

const compiled = ts.transpileModule(
  ['observeReduceTransparency', 'scrimMode', 'opaqueClassName']
    .map(sourceFunction)
    .join('\n'),
  { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }
).outputText;
const helpers = new Function(
  `${compiled}; return { observeReduceTransparency, scrimMode, opaqueClassName };`
)();

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('initial preference resolves and later changes are observed', async () => {
  const initial = deferred();
  const values = [];
  let listener;
  let removed = 0;
  const source = {
    isReduceTransparencyEnabled: () => initial.promise,
    addEventListener(event, next) {
      assert.equal(event, 'reduceTransparencyChanged');
      listener = next;
      return { remove: () => removed++ };
    },
  };

  const cleanup = helpers.observeReduceTransparency(source, (value) => values.push(value));
  assert.deepEqual(values, []);
  initial.resolve(false);
  await initial.promise;
  await Promise.resolve();
  assert.deepEqual(values, [false]);

  listener(true);
  assert.deepEqual(values, [false, true]);
  cleanup();
  assert.equal(removed, 1);
  listener(false);
  assert.deepEqual(values, [false, true]);
});

test('a change received during the initial query wins', async () => {
  const initial = deferred();
  const values = [];
  let listener;
  const cleanup = helpers.observeReduceTransparency(
    {
      isReduceTransparencyEnabled: () => initial.promise,
      addEventListener(_event, next) {
        listener = next;
        return { remove() {} };
      },
    },
    (value) => values.push(value)
  );

  listener(true);
  initial.resolve(false);
  await initial.promise;
  await Promise.resolve();
  assert.deepEqual(values, [true]);
  cleanup();
});

test('a platform with no preference to report keeps blur available', () => {
  const missing = [];
  helpers.observeReduceTransparency({}, (value) => missing.push(value));
  assert.deepEqual(missing, [false]);
});

test('a platform that has the preference but cannot read it stays opaque', async () => {
  const rejected = [];
  helpers.observeReduceTransparency(
    { isReduceTransparencyEnabled: () => Promise.reject(new Error('unsupported')) },
    (value) => rejected.push(value)
  );
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(rejected, [true]);

  const threw = [];
  helpers.observeReduceTransparency(
    {
      isReduceTransparencyEnabled() {
        throw new Error('unsupported');
      },
    },
    (value) => threw.push(value)
  );
  assert.deepEqual(threw, [true]);
});

test('rendering decisions suppress blur until it is explicitly allowed', () => {
  assert.equal(helpers.scrimMode(false, true, null), 'dim');
  assert.equal(helpers.scrimMode(true, true, null), 'opaque');
  assert.equal(helpers.scrimMode(true, true, true), 'opaque');
  assert.equal(helpers.scrimMode(true, true, false), 'blur');
  assert.equal(helpers.scrimMode(true, false, false), 'dim');

  assert.equal(helpers.opaqueClassName('light'), 'bg-white');
  assert.equal(helpers.opaqueClassName('dark'), 'bg-black');
  assert.equal(helpers.opaqueClassName('default'), 'bg-background');
  assert.equal(helpers.opaqueClassName('systemMaterial'), 'bg-background');
});

test('the hook owns the subscription cleanup and opaque fallback layers', () => {
  assert.match(source, /observeReduceTransparency\(AccessibilityInfo, \(next\) => \{/);
  // The answer outlives the overlay that asked for it, or every dialog opens
  // opaque for a frame while the platform is asked again.
  assert.match(source, /let knownReduceTransparency: boolean \| null = null/);
  assert.match(source, /useState<boolean \| null>\(knownReduceTransparency\)/);
  assert.match(source, /knownReduceTransparency = next/);
  assert.match(source, /const mode = scrimMode\(blur, scrimCanBlur, reduceTransparency\)/);
  // Android has no view behind a portal to point its blur at, so it dims.
  assert.match(source, /const scrimCanBlur = BlurView !== null && Platform\.OS !== 'android'/);
  assert.match(source, /if \(mode === 'blur' && BlurView\)/);
  assert.match(source, /if \(mode === 'opaque'\)/);
  assert.match(source, /className=\{opaqueClassName\(tint\)\}/);
  assert.match(source, /className=\{dimClassName\}/);
});
