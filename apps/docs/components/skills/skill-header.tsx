'use client';

import { useState } from 'react';
import { CopyInstall } from '@/components/copy-install';
import { cn } from '@/lib/utils';

/**
 * The top of a skill's page: where it comes from, how to install it, and the
 * facts a reader checks before they do.
 *
 * Two ways in. **Command** is the install line for a terminal. **Prompt** is a
 * sentence to give an agent that can run commands itself, for a reader who
 * would rather ask than type.
 */

const SOURCE = 'panel-ui/PanelUI';

export interface SkillHeaderProps {
  /** The skill's folder name, as `--skill` takes it. */
  name: string;
  /** The version of PanelUI it first shipped with. */
  since: string;
  /** What to ask an agent to do with it, once installed. */
  prompt: string;
}

export function SkillHeader({ name, since, prompt }: SkillHeaderProps) {
  const [tab, setTab] = useState<'command' | 'prompt'>('command');
  const command = `npx skills add ${SOURCE} --skill ${name}`;
  const ask = `Install the ${name} skill with \`${command}\`, then: ${prompt}`;

  return (
    <div className="not-prose my-6 space-y-5">
      <nav aria-label="Where this skill comes from" className="font-mono text-sm text-fd-muted-foreground">
        <span>skills</span>
        <span className="px-1.5">/</span>
        <a className="hover:text-fd-foreground hover:underline" href={`https://github.com/${SOURCE}`}>
          panel-ui
        </a>
        <span className="px-1.5">/</span>
        <a className="hover:text-fd-foreground hover:underline" href={`https://github.com/${SOURCE}`}>
          PanelUI
        </a>
        <span className="px-1.5">/</span>
        <a
          className="text-fd-foreground hover:underline"
          href={`https://github.com/${SOURCE}/tree/main/skills/${name}`}
        >
          {name}
        </a>
      </nav>

      <div>
        <div role="tablist" aria-label="How to install" className="mb-2 flex gap-1">
          {(['command', 'prompt'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'cursor-pointer rounded-lg px-3 py-1 text-sm capitalize transition-colors',
                tab === key ? 'bg-fd-muted text-fd-foreground' : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              {key}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          <CopyInstall command={tab === 'command' ? command : ask} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-fd-muted-foreground">Repository</dt>
          <dd>
            <a className="font-mono hover:underline" href={`https://github.com/${SOURCE}`}>
              {SOURCE}
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-fd-muted-foreground">License</dt>
          <dd>MIT</dd>
        </div>
        <div>
          <dt className="text-fd-muted-foreground">First shipped</dt>
          <dd>{since}</dd>
        </div>
        <div>
          <dt className="text-fd-muted-foreground">Works with</dt>
          <dd>Claude Code, Codex, Cursor and other agents that read SKILL.md</dd>
        </div>
      </dl>
    </div>
  );
}
