/**
 * What a step is, worked out from where the flow is.
 *
 * Every part of a step draws itself from this one answer. The circle, the
 * title, the connector after it and whether the trigger can be pressed are
 * not four decisions made in four places — they are four readings of one
 * state, so a step cannot be filled with a tick and still be counted as
 * still to come, and two steps cannot both call themselves current.
 *
 * Nothing here touches React or the DOM: the whole of the rule is a step's
 * number against the root's active one, which makes it the one part of the
 * component a test can pin down without rendering anything.
 */

/** Where a step sits in the flow, relative to the active one. */
export type StepState = 'completed' | 'current' | 'upcoming' | 'loading';

/** Which way the row of steps runs. */
export type StepsOrientation = 'horizontal' | 'vertical';

/** Everything the state of one step is decided from. */
export interface StepStateInput {
  /** This step's position in the flow, as the author numbers it. */
  step: number;
  /** The root's active step. */
  activeStep: number;
  /** Force the completed state, even ahead of the active step. */
  completed?: boolean;
  /** Show a spinner instead of the number, while this is the active step. */
  loading?: boolean;
  /** Keep this step from being chosen. */
  disabled?: boolean;
  /**
   * Let this step be chosen while it is still upcoming. A flow that is meant
   * to be taken one stop at a time leaves this out, and only steps already
   * reached can be gone back to.
   */
  reachable?: boolean;
}

/** What every part of a step needs to know about it. */
export interface StepStateResult {
  /** Which of the four states it is in. */
  state: StepState;
  /**
   * Whether the connector that leaves this step is filled. Only a completed
   * step fills it, so the line runs solid up to the active step and stops
   * there — the segment waiting for the step ahead stays muted.
   */
  filled: boolean;
  /** Whether the step can be chosen: a completed one, or any allowed ahead of time. */
  clickable: boolean;
  /** Whether the indicator should show a spinner rather than its number. */
  loading: boolean;
}

/**
 * Resolves one step against the active one.
 *
 * A step before the active one is complete, the active one is current — or
 * loading, if it says so — and anything after it is upcoming. `completed`
 * wins over all of it, because a flow may know a later stage was finished
 * out of order and the circle should say so; the active step still reads as
 * current, since only one step is ever the one you are on.
 */
export function deriveStepState({
  step,
  activeStep,
  completed = false,
  loading = false,
  disabled = false,
  reachable = false,
}: StepStateInput): StepStateResult {
  const state: StepState = completed || step < activeStep
    ? 'completed'
    : step === activeStep
      ? loading
        ? 'loading'
        : 'current'
      : 'upcoming';

  return {
    state,
    filled: state === 'completed',
    /*
     * What can be pressed is what would move the flow. A completed step goes
     * back to itself; the step the flow is on would only press itself, and a
     * step still to come has not been reached — both are marked up as
     * content rather than left in the tab order doing nothing. `reachable`
     * opens a step ahead of the flow for steppers that allow jumping in.
     */
    clickable: !disabled && (state === 'completed' || reachable),
    loading: state === 'loading',
  };
}

/**
 * How a step's state is said out loud, after its name.
 *
 * The active step adds nothing: it already carries `aria-current="step"`, and
 * "current" twice is a stutter. The others say which they are, so a reader
 * arriving at the middle of a wizard hears "Payment, step 2 of 3, completed".
 * Before the count is known — an item used where the root cannot place it —
 * the position is left out rather than guessed at.
 */
export function stepAnnouncement(position: number, total: number, state: StepState): string {
  const word =
    state === 'completed' ? 'completed' : state === 'loading' ? 'in progress' : state === 'upcoming' ? 'not started' : null;
  if (total < 1 || position < 0) return word ?? '';
  const at = `step ${position + 1} of ${total}`;
  return word ? `${at}, ${word}` : at;
}
