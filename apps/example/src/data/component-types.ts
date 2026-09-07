import type { ReactNode } from "react";

export interface Demo {
  label: string;
  render: () => ReactNode;
  fullPage?: boolean;
  id?: string;
  description?: string;
  fullBleed?: boolean;
  /**
   * Keep the iOS back-swipe on a `fullBleed` demo.
   *
   * Full-bleed turns it off because iOS claims the left screen edge for
   * popping the stack and wins over anything JavaScript puts there — a demo
   * whose own gesture starts at that edge would never see a touch. A demo that
   * does not own the edge has nothing to protect, and taking the swipe away
   * from it only leaves the reader with one way back instead of two.
   */
  backSwipe?: boolean;
}

export type ComponentLayout = "sections" | "pager";

export interface ComponentEntry {
  slug: string;
  name: string;
  summary: string;
  layout?: ComponentLayout;
  demos: Demo[];
}
