/**
 * No part of a web component may return before it has called all of its
 * hooks.
 *
 * A part that returns early under one condition and calls `useRender` or
 * another hook under the other calls a different number of hooks on the
 * render where the condition flips, and React stops rendering the page.
 * Workbench did this on its breakpoint and its docs page went blank in
 * production (issue #262). The condition is usually a prop or a media query
 * that the author did not expect to change, which is why it passes review.
 *
 * Read as text: a component's top-level `function`, a branch at its first
 * level of indentation that returns, and a hook called after it.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const components = path.resolve(import.meta.dirname, '../src/components');

function sources() {
  const files = [];
  for (const slug of fs.readdirSync(components).sort()) {
    const directory = path.join(components, slug);
    if (!fs.statSync(directory).isDirectory()) continue;
    for (const file of fs.readdirSync(directory).sort()) {
      if (file.endsWith('.tsx')) files.push(path.join(directory, file));
    }
  }
  return files;
}

/** Each component function's name and lines, read from `function Name(` to its closing brace at the start of a line. */
function componentsIn(source) {
  const found = [];
  const pattern = /\n(?:export )?function ([A-Z]\w*)\([\s\S]*?\n}\n/g;
  for (const match of source.matchAll(pattern)) found.push({ name: match[1], lines: match[0].split('\n') });
  return found;
}

/** The first hook called after a first-level return, or null. */
function hookAfterReturn(lines) {
  let returned = null;
  let inBranch = false;
  for (const [index, line] of lines.entries()) {
    if (/^ {2}if \(.*\) \{$/.test(line)) {
      inBranch = true;
      continue;
    }
    if (inBranch && line === '  }') inBranch = false;
    if (returned === null && ((inBranch && /^ {4}return\b/.test(line)) || /^ {2}if \(.*\) return\b/.test(line))) {
      returned = line.trim();
    }
    if (returned !== null && index > 0 && /(?<![\w.])use[A-Z]\w*\(/.test(line)) return { returned, hook: line.trim() };
  }
  return null;
}

test('every part calls its hooks before any early return', () => {
  const offenders = [];
  for (const file of sources()) {
    for (const component of componentsIn(fs.readFileSync(file, 'utf8'))) {
      const found = hookAfterReturn(component.lines);
      if (found) {
        offenders.push(`${path.relative(components, file)} ${component.name}: "${found.returned}" before "${found.hook}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], `Call the hook first and branch on its result:\n${offenders.join('\n')}`);
});

test('the check catches the shape it is for', () => {
  const broken = ['function Part() {', '  const a = useA();', '  if (a) return null;', '  return useRender({});', '}'];
  const branched = ['function Part() {', '  if (x) {', '    return <div />;', '  }', '  return useRender({});', '}'];
  const fine = ['function Part() {', '  const element = useRender({});', '  if (x) return null;', '  return element;', '}'];
  assert.ok(hookAfterReturn(broken));
  assert.ok(hookAfterReturn(branched));
  assert.equal(hookAfterReturn(fine), null);
});
