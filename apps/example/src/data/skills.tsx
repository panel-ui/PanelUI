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
];

export function findSkillExample(slug: string): SkillExample | undefined {
  return SKILL_EXAMPLES.find((example) => example.slug === slug);
}
