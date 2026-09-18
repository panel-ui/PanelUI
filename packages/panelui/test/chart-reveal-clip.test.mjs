/**
 * How a chart uncovers itself, and why it is no longer an SVG clip path.
 *
 * The reveal used to be a `<Rect>` inside `<Defs><ClipPath>` whose width was
 * driven by the reveal value. Animated props on an element inside `<Defs>` do
 * not reach the native clip on Android — react-native-svg never pushes the
 * update through — so the rect kept whatever width was declared on it and the
 * chart drew complete, with no animation at all. Reported as #200.
 *
 * A view with `overflow: 'hidden'` is clipped by the platform itself, which
 * both platforms agree on. That is the contract here: the charts that reveal
 * left to right do it with a view, and nothing animated is left inside `Defs`
 * for the old bug to come back through.
 *
 * HexChart is the exception and is tested for the opposite thing. It uncovers
 * with an ellipse growing from the centre of its field, which a rectangular
 * view cannot express, so it keeps the SVG clip — and therefore still needs
 * every animated clip element to declare its geometry statically as well. With
 * that, the worst case on Android is the reveal not playing; without it, the
 * series never appear at all while the field draws normally.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (slug) =>
  readFile(new URL(`../src/components/${slug}/index.tsx`, import.meta.url), 'utf8');

/** Charts that uncover their marks with a view clip. */
const VIEW_CLIPPED = ['plot', 'line-chart', 'area-chart', 'heatmap-chart', 'bump-chart'];

/** Charts that keep an SVG clip, and so owe a static fallback. */
const SVG_CLIPPED = ['hex-chart'];

/** The body of every `<Defs>…</Defs>` in a source file. */
function defsBlocks(source) {
  const found = [];
  const opener = /<Defs>/g;
  let match;
  while ((match = opener.exec(source)) !== null) {
    const end = source.indexOf('</Defs>', match.index);
    if (end === -1) continue;
    found.push(source.slice(match.index, end));
  }
  return found;
}

for (const slug of VIEW_CLIPPED) {
  test(`${slug} reveals with a view clip, not a clip path`, async () => {
    const source = await read(slug);

    assert.ok(
      !source.includes('<ClipPath'),
      `${slug} still has a <ClipPath>. Animated props inside <Defs> never reach ` +
        `the native clip on Android, so the reveal silently does not play there.`
    );
    assert.match(
      source,
      /overflow: 'hidden'/,
      `expected ${slug} to uncover its marks with a view under overflow: 'hidden'`
    );
    assert.match(
      source,
      /revealStyle/,
      `expected ${slug} to drive the reveal from an animated style, not animated props`
    );
  });
}

test('no chart animates an element inside <Defs> to reveal itself', async () => {
  for (const slug of VIEW_CLIPPED) {
    const source = await read(slug);
    for (const block of defsBlocks(source)) {
      assert.ok(
        !/animatedProps=\{(?:clipProps|revealProps)\}/.test(block),
        `${slug} drives a reveal from inside <Defs>, which Android ignores:\n${block}`
      );
    }
  }
});

for (const slug of SVG_CLIPPED) {
  test(`${slug} declares its clip geometry statically as well as animating it`, async () => {
    const source = await read(slug);

    const clipped = [];
    const opener = /<Animated(?:Rect|Ellipse)\b/g;
    let match;
    while ((match = opener.exec(source)) !== null) {
      const end = source.indexOf('/>', match.index);
      if (end === -1) continue;
      clipped.push(source.slice(match.index, end + 2));
    }

    assert.ok(clipped.length > 0, `expected ${slug} to draw its reveal clip`);

    for (const element of clipped) {
      const isEllipse = element.startsWith('<AnimatedEllipse');
      const required = isEllipse ? [/\brx=\{/, /\bry=\{/] : [/\bwidth=\{/];
      for (const attribute of required) {
        assert.match(
          element,
          attribute,
          `an animated clip element in ${slug} is missing a static fallback, so ` +
            `the clip collapses to nothing wherever animated props do not reach ` +
            `it and every series inside it disappears:\n${element}`
        );
      }
    }
  });
}
