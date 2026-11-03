import type { ComponentType } from 'react';

/**
 * Figures made with the agent skills this repository ships.
 *
 * Each one is the output of a single request to an agent with the skill
 * installed, and its source is the skill's own `examples/` folder: the file an
 * agent reads as a reference and the screen shown here are the same file.
 * Loaded when its screen opens, like the blocks.
 */
export interface SkillFigureProps {
  /** The figure's number in its set. */
  figure?: number;
  /** Runs the figure's model; off while its screen is not focused. */
  active?: boolean;
  className?: string;
}

export interface SkillExample {
  /** The skill that made it. */
  skill: 'apparatus';
  slug: string;
  name: string;
  summary: string;
  /** The request that produced it. */
  prompt: string;
  load: () => Promise<ComponentType<SkillFigureProps>>;
}

export const SKILLS = [
  {
    name: 'apparatus',
    title: 'Apparatus',
    summary: 'An idea explained as a machine you can touch.',
  },
] as const;

export const SKILL_EXAMPLES: readonly SkillExample[] = [
  {
    skill: 'apparatus',
    slug: 'spring-bench',
    name: 'Spring bench',
    summary: 'How stiffness and damping shape a spring animation.',
    prompt: 'Explain how a spring animation settles, with stiffness and damping I can change.',
    load: () =>
      import('../../../../skills/apparatus/examples/spring-bench/figure').then((m) => m.SpringBenchFigure),
  },
  {
    skill: 'apparatus',
    slug: 'flywheel',
    name: 'Flywheel',
    summary: 'How a flicked list coasts to a stop.',
    prompt: 'Show how momentum scrolling decelerates after a flick, and what the deceleration rate changes.',
    load: () => import('../../../../skills/apparatus/examples/flywheel/figure').then((m) => m.FlywheelFigure),
  },
  {
    skill: 'apparatus',
    slug: 'token-hopper',
    name: 'Token hopper',
    summary: 'How a rate limiter lets a burst through, then holds a steady rate.',
    prompt: 'Explain token-bucket rate limiting: why a burst goes through and the next request waits.',
    load: () => import('../../../../skills/apparatus/examples/token-hopper/figure').then((m) => m.TokenHopperFigure),
  },
  {
    skill: 'apparatus',
    slug: 'car-engine',
    name: 'Four-stroke engine',
    summary: 'How a car engine turns fuel into rotation, four strokes at a time.',
    prompt: 'Explain how a car engine works: the four strokes and why the cylinders fire in turn.',
    load: () => import('../../../../skills/apparatus/examples/car-engine/figure').then((m) => m.CarEngineFigure),
  },
  {
    skill: 'apparatus',
    slug: 'human-cell',
    name: 'Human cell',
    summary: 'How a cell turns glucose into ATP, and where.',
    prompt: 'Show how a human cell gets energy from glucose, inside the cell itself.',
    load: () => import('../../../../skills/apparatus/examples/human-cell/figure').then((m) => m.HumanCellFigure),
  },
];

export function findSkillExample(slug: string): SkillExample | undefined {
  return SKILL_EXAMPLES.find((example) => example.slug === slug);
}
