import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commitReach,
  depthOpacity,
  directionProgress,
  effectiveDepth,
  exitTarget,
  lever,
  project,
  releaseProgress,
  releasedDirection,
  resist,
  tiltAngle,
} from '../src/components/stack-card/stack-card-geometry.ts';

const WIDTH = 320;
const HEIGHT = 440;
const THRESHOLD = 0.3;
const SIDEWAYS = ['left', 'right'];
const EVERY_WAY = ['left', 'right', 'up', 'down'];

test('a flick is projected to where it was going, not to where it stopped', () => {
  assert.equal(project(0), 0);
  // The decay form, so a thumb's worth of speed is worth a real distance.
  assert.ok(project(1000) > 400);
  assert.equal(project(-1000), -project(1000));
});

test('the reach is a fraction of the card, and never zero', () => {
  assert.equal(commitReach(WIDTH, THRESHOLD), 96);
  // A card that has not been measured yet must not divide anything by nothing.
  assert.equal(commitReach(0, THRESHOLD), 1);
});

test('an axis the deck does not accept gives, and keeps giving less', () => {
  assert.equal(resist(0, HEIGHT, 0.18), 0);
  const near = resist(40, HEIGHT, 0.18);
  const far = resist(400, HEIGHT, 0.18);
  assert.ok(near > 0 && near < 40, 'a short push moves the card a little');
  assert.ok(far > near, 'a longer push still moves it further');
  assert.ok(far < HEIGHT * 0.18, 'and never past the give');
  assert.equal(resist(-40, HEIGHT, 0.18), -near);
  // Nothing to resist against before the card is measured.
  assert.equal(resist(40, 0, 0.18), 0);
});

test('each direction reads its own travel, and only its own', () => {
  assert.equal(directionProgress('right', 96, 0, WIDTH, HEIGHT, THRESHOLD), 1);
  assert.equal(directionProgress('right', 48, 0, WIDTH, HEIGHT, THRESHOLD), 0.5);
  // Dragged the other way is not negative progress, it is no progress.
  assert.equal(directionProgress('right', -96, 0, WIDTH, HEIGHT, THRESHOLD), 0);
  assert.equal(directionProgress('left', -96, 0, WIDTH, HEIGHT, THRESHOLD), 1);
  // Past the reach it stays at one: a stamp cannot get more solid than solid.
  assert.equal(directionProgress('right', 900, 0, WIDTH, HEIGHT, THRESHOLD), 1);
  // The vertical pair measure against the card's height, not its width.
  assert.equal(directionProgress('up', 0, -132, WIDTH, HEIGHT, THRESHOLD), 1);
});

test('the release is the furthest any accepted direction has been carried', () => {
  assert.equal(releaseProgress(SIDEWAYS, 48, 300, WIDTH, HEIGHT, THRESHOLD), 0.5);
  assert.equal(releaseProgress(EVERY_WAY, 48, -132, WIDTH, HEIGHT, THRESHOLD), 1);
  assert.equal(releaseProgress([], 900, 900, WIDTH, HEIGHT, THRESHOLD), 0);
});

test('a card leaves on distance or on momentum, and comes back on neither', () => {
  const still = { vx: 0, vy: 0 };
  const send = (x, y, vx = 0, vy = 0, ways = SIDEWAYS) =>
    releasedDirection(ways, x, y, vx, vy, WIDTH, HEIGHT, THRESHOLD);

  assert.equal(send(95, 0, still.vx, still.vy), null, 'just short of the reach');
  assert.equal(send(96, 0), 'right', 'exactly the reach');
  assert.equal(send(-96, 0), 'left');
  // A flick that has barely moved still counts, because it was going somewhere.
  assert.equal(send(10, 0, 1200), 'right');
  // A drag pulled back over the line, gently, comes home.
  assert.equal(send(90, 0, -200), null);
  // Thrown back hard, it leaves the other way — the throw is the answer, not
  // the furthest point the finger happened to reach on the way.
  assert.equal(send(90, 0, -1200), 'left');
});

test('a direction the deck does not accept never takes a card', () => {
  assert.equal(releasedDirection(SIDEWAYS, 0, 400, 0, 2000, WIDTH, HEIGHT, THRESHOLD), null);
  assert.equal(releasedDirection(['up'], 0, -400, 0, 0, WIDTH, HEIGHT, THRESHOLD), 'up');
  assert.equal(releasedDirection(['up'], 0, 400, 0, 0, WIDTH, HEIGHT, THRESHOLD), null);
});

test('a diagonal throw goes where it was thrown hardest', () => {
  // Carried further up than right, in a deck that takes both.
  assert.equal(
    releasedDirection(EVERY_WAY, 100, -400, 0, 0, WIDTH, HEIGHT, THRESHOLD),
    'up'
  );
  assert.equal(
    releasedDirection(EVERY_WAY, 300, -140, 0, 0, WIDTH, HEIGHT, THRESHOLD),
    'right'
  );
});

test('a card leaves past its own edge and keeps the diagonal it was thrown on', () => {
  const right = exitTarget('right', WIDTH, HEIGHT, 40, -30);
  assert.ok(right.x > WIDTH, 'clear of the edge, not resting on it');
  assert.ok(right.y < -30, 'and still climbing');

  const up = exitTarget('up', WIDTH, HEIGHT, 40, -30);
  assert.ok(up.y < -HEIGHT);
  assert.ok(up.x > 40);

  assert.equal(exitTarget('left', WIDTH, HEIGHT, 0, 0).x, -exitTarget('right', WIDTH, HEIGHT, 0, 0).x);
  assert.equal(exitTarget('down', WIDTH, HEIGHT, 0, 0).y, -exitTarget('up', WIDTH, HEIGHT, 0, 0).y);
});

test('the card pivots about where it was taken hold of', () => {
  assert.equal(lever(10, HEIGHT), 1, 'held at the top');
  assert.equal(lever(HEIGHT - 10, HEIGHT), -1, 'held at the bottom');
  // Before the card is measured there is no top or bottom to tell apart.
  assert.equal(lever(10, 0), 1);
});

test('the tilt is measured against half the card, and capped', () => {
  assert.equal(tiltAngle(0, WIDTH, 14, 1), 0);
  assert.equal(tiltAngle(WIDTH / 2, WIDTH, 14, 1), 14);
  assert.equal(tiltAngle(WIDTH / 2, WIDTH, 14, -1), -14, 'held the other end, turned the other way');
  assert.equal(tiltAngle(WIDTH * 4, WIDTH, 14, 1), 14, 'a throw does not spin the card');
  assert.equal(tiltAngle(100, 0, 14, 1), 0);
});

test('the card behind arrives exactly as the one in front leaves', () => {
  assert.equal(effectiveDepth(1, 0), 1, 'at rest it is one place back');
  assert.equal(effectiveDepth(1, 0.5), 0.5);
  // At the moment the top card commits, the next one is already on top — which
  // is why advancing the deck moves nothing.
  assert.equal(effectiveDepth(1, 1), 0);
  assert.equal(effectiveDepth(0, 1), 0, 'and the pile never climbs past the top');
});

test('the pile shows the depth it states, and fades the next one in', () => {
  assert.equal(depthOpacity(0, 2), 1);
  assert.equal(depthOpacity(2, 2), 1, 'the last visible place is fully drawn');
  assert.equal(depthOpacity(3, 2), 0, 'one further back is not drawn at all');
  assert.equal(depthOpacity(2.5, 2), 0.5, 'and it arrives by fading, not by appearing');
  assert.equal(depthOpacity(1, 0), 0, 'a pile with no depth shows one card');
});
