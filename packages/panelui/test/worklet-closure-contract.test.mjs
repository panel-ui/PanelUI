import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

/*
 * A worklet does not run in the module it was written in.
 *
 * It runs on the UI thread carrying copies of the outside names it uses, and
 * the plugin collects those names from the function's *body*. A default in the
 * parameter list is not part of that body, so a constant reached only from
 * there never travels, and the name is absent where the code actually runs.
 *
 * What that costs is out of all proportion to how it reads. The error is a
 * ReferenceError thrown inside a gesture handler, where nothing catches it: it
 * leaves the worklet runtime as a C++ exception and aborts the process, with no
 * JavaScript frames, no red screen and nothing in the Metro log. It took a day
 * and five commits to find the one that shipped.
 *
 * Nothing else here can see it. These tests run in Node, where there is no
 * worklet transform and a module-scope default resolves the ordinary way — so
 * the geometry tests passed against code that could not run on a device. Only a
 * check on the source catches it, which is what this is.
 */

const SRC = path.join(import.meta.dirname, '..', 'src');

/** Every `.ts`/`.tsx` file under the library source. */
function sources(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...sources(full));
    else if (/\.tsx?$/.test(entry)) found.push(full);
  }
  return found;
}

/**
 * Parameter lists of functions whose body opens with the worklet directive,
 * paired with the file and name they belong to.
 *
 * Deliberately a regex rather than a parse: it has to hold for every shape the
 * library writes a worklet in, and the cost of missing one is the crash above.
 */
function workletParameters(source) {
  const found = [];
  const shapes = [
    // function project(…) { 'worklet';
    /function\s+(\w+)\s*\(([^)]*)\)[^{]*\{\s*['"]worklet['"]/g,
    // const resolve = (…) => { 'worklet';
    /(?:const|let|var)\s+(\w+)\s*=\s*\(([^)]*)\)\s*(?::[^=]*?)?=>\s*\{\s*['"]worklet['"]/g,
    // .onUpdate((event) => { 'worklet';   and useAnimatedStyle(() => { 'worklet';
    /\.(\w+)\(\s*\(([^)]*)\)\s*=>\s*\{\s*['"]worklet['"]/g,
  ];
  for (const shape of shapes) {
    for (const match of source.matchAll(shape)) {
      found.push({ name: match[1], parameters: match[2] });
    }
  }
  return found;
}

/** A default that is an identifier or a member expression, not a literal. */
function identifierDefaults(parameters) {
  return [...parameters.matchAll(/=\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)/g)]
    .map((match) => match[1])
    .filter((name) => !['true', 'false', 'null', 'undefined'].includes(name));
}

test('no worklet takes a parameter default from a name outside its body', () => {
  const offenders = [];

  for (const file of sources(SRC)) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('worklet')) continue;

    for (const { name, parameters } of workletParameters(source)) {
      for (const identifier of identifierDefaults(parameters)) {
        offenders.push(`${path.relative(SRC, file)} — ${name}() defaults to ${identifier}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `A worklet's parameter default is evaluated where the name does not exist, which aborts ` +
      `the process from inside a gesture with no JavaScript frames. Read the fallback in the ` +
      `body instead:\n  ${offenders.join('\n  ')}`
  );
});

test('the check recognises the shape that shipped', () => {
  // The exact declaration that crashed, so the guard cannot rot into a no-op.
  const crashed = `
    export function project(velocity: number, deceleration: number = DECELERATION): number {
      'worklet';
      return velocity * deceleration;
    }
  `;
  const [found] = workletParameters(crashed);
  assert.equal(found.name, 'project');
  assert.deepEqual(identifierDefaults(found.parameters), ['DECELERATION']);

  // And that a literal default is left alone.
  const fine = `
    export function resist(travel: number, give: number = 30): number {
      'worklet';
      return travel * give;
    }
  `;
  assert.deepEqual(identifierDefaults(workletParameters(fine)[0].parameters), []);
});
