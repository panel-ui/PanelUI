import fs from 'node:fs';
import path from 'node:path';

/**
 * A skill's `SKILL.md`, as the agent will read it, folded away under its name.
 *
 * Read from the published copy at build time, so the page cannot show a
 * different file from the one an agent gets.
 */
export function SkillSource({ name }: { name: string }) {
  const file = path.join(process.cwd(), 'public', 'skills', name, 'SKILL.md');
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!text) return null;
  return (
    <details className="not-prose group my-6 overflow-hidden rounded-xl border bg-fd-card">
      <summary className="cursor-pointer select-none px-4 py-3 font-mono text-sm text-fd-foreground">
        SKILL.md
        <span className="ml-2 text-fd-muted-foreground group-open:hidden">— show</span>
      </summary>
      <pre className="max-h-[32rem] overflow-auto border-t px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fd-muted-foreground">
        {text}
      </pre>
    </details>
  );
}
