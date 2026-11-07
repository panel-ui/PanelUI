/**
 * The rule behind a stepper, without a renderer.
 *
 * Every part of Steps draws itself from one derivation, so these are the
 * cases that would otherwise show up as a circle filled in the wrong colour
 * or a progress line running past the step the flow is on.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  deriveStepState,
  stepAnnouncement,
} from '../src/components/steps/steps-state.ts';

test('a step behind the flow is completed, and fills the connector that leaves it', () => {
  assert.deepEqual(deriveStepState({ step: 0, activeStep: 2 }), {
    state: 'completed',
    filled: true,
    clickable: true,
    loading: false,
  });
});

test('the step the flow is on is current, and the connector leaving it stays empty', () => {
  const current = deriveStepState({ step: 2, activeStep: 2 });
  assert.equal(current.state, 'current');
  assert.equal(current.filled, false, 'the line up to the current step is filled by the step before it');
  assert.equal(current.clickable, false, 'a step that would only press itself is not a control');
});

test('a step ahead of the flow is upcoming, unfilled and not pressable', () => {
  assert.deepEqual(deriveStepState({ step: 4, activeStep: 2 }), {
    state: 'upcoming',
    filled: false,
    clickable: false,
    loading: false,
  });
});

test('completed is an override, even ahead of the flow', () => {
  const forced = deriveStepState({ step: 4, activeStep: 2, completed: true });
  assert.equal(forced.state, 'completed');
  assert.equal(forced.filled, true);
  assert.equal(forced.clickable, true);
});

test('loading only applies to the step the flow is on', () => {
  assert.deepEqual(deriveStepState({ step: 2, activeStep: 2, loading: true }), {
    state: 'loading',
    filled: false,
    clickable: false,
    loading: true,
  });
  assert.equal(deriveStepState({ step: 1, activeStep: 2, loading: true }).state, 'completed');
  assert.equal(deriveStepState({ step: 3, activeStep: 2, loading: true }).state, 'upcoming');
});

test('a completed step asked to spin stays completed, because the work there is done', () => {
  const finished = deriveStepState({ step: 1, activeStep: 1, completed: true, loading: true });
  assert.equal(finished.state, 'completed');
  assert.equal(finished.loading, false);
});

test('reachable lets a step ahead be chosen, and nothing else does', () => {
  const ahead = deriveStepState({ step: 4, activeStep: 2, reachable: true });
  assert.equal(ahead.state, 'upcoming');
  assert.equal(ahead.clickable, true);
});

test('disabled wins over every state', () => {
  for (const input of [
    { step: 0, activeStep: 2, disabled: true },
    { step: 2, activeStep: 2, disabled: true },
    { step: 4, activeStep: 2, disabled: true, reachable: true },
    { step: 4, activeStep: 2, disabled: true, completed: true },
  ]) {
    assert.equal(deriveStepState(input).clickable, false, JSON.stringify(input));
  }
});

test('the active step is announced with its position and no state word', () => {
  assert.equal(stepAnnouncement(1, 3, 'current'), 'step 2 of 3');
});

test('the other states say what they are, once', () => {
  assert.equal(stepAnnouncement(0, 3, 'completed'), 'step 1 of 3, completed');
  assert.equal(stepAnnouncement(2, 3, 'upcoming'), 'step 3 of 3, not started');
  assert.equal(stepAnnouncement(1, 3, 'loading'), 'step 2 of 3, in progress');
});

test('an item the root could not place is announced without a position rather than a wrong one', () => {
  assert.equal(stepAnnouncement(-1, 0, 'completed'), 'completed');
  assert.equal(stepAnnouncement(-1, 0, 'current'), '');
});
