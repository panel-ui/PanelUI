import Link from 'next/link';
import skills from '@/lib/skills.generated.json';
import { CopyInstall } from '@/components/copy-install';

/**
 * Every agent skill this repository ships, as a ranked list: the number, the
 * name, where it comes from, and what it is for.
 *
 * The list is read from `lib/skills.generated.json`, which `docs:generate`
 * writes from the `skills/` folder, so a skill added there appears here with no
 * page to edit. Only the order and where each name links are kept by hand.
 */

const SOURCE = 'panel-ui/PanelUI';

/** The order to list them in, and each one's page. A skill missing here still lists, last. */
const PAGES: Record<string, string> = {
  panelui: '/docs/skills',
  apparatus: '/docs/integrations/skills/apparatus',
  'logo-maker': '/docs/integrations/skills/logo-maker',
  'panelui-web': '/docs/web/skills',
};

/** The first sentence of a description: what the skill does, before when it applies. */
function lead(description: string) {
  const end = description.search(/\.\s/);
  return end === -1 ? description : description.slice(0, end + 1);
}

export function SkillDirectory() {
  const order = Object.keys(PAGES);
  const rows = [...skills].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib);
  });

  return (
    <div className="not-prose my-6">
      <CopyInstall command={`npx skills add ${SOURCE}`} />
      <div className="mt-6 grid grid-cols-[2.5rem_1fr] border-b pb-2 font-mono text-xs uppercase tracking-wide text-fd-muted-foreground">
        <span>#</span>
        <span>Skill</span>
      </div>
      <ol>
        {rows.map((skill, index) => {
          const href = PAGES[skill.name] ?? `https://github.com/${SOURCE}/tree/main/skills/${skill.name}`;
          return (
            <li key={skill.name} className="grid grid-cols-[2.5rem_1fr] border-b py-4">
              <span className="pt-0.5 font-mono text-sm tabular-nums text-fd-muted-foreground">{index + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link href={href} className="font-mono text-base font-semibold text-fd-foreground hover:underline">
                    {skill.name}
                  </Link>
                  <span className="font-mono text-sm text-fd-muted-foreground">{SOURCE}</span>
                </div>
                <p className="mt-1 text-sm text-fd-muted-foreground">{lead(skill.description)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
