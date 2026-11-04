'use client';

import { BookOpenIcon, BoxIcon, CodeXmlIcon, FileTextIcon, HashIcon } from 'lucide-react';
import { useState } from 'react';
import { Chip } from 'panelui-web/chip';
import { Command } from 'panelui-web/command';

const RESULTS = [
  { title: 'Command', section: 'components', where: 'Components · Overlays', icon: <BoxIcon /> },
  { title: 'Model Picker', section: 'components', where: 'Components · AI', icon: <BoxIcon /> },
  { title: 'Spinner', section: 'components', where: 'Components · Feedback', icon: <BoxIcon /> },
  { title: 'Theming', section: 'guides', where: 'Guides', icon: <BookOpenIcon /> },
  { title: 'Composition', section: 'guides', where: 'Guides', icon: <BookOpenIcon /> },
  { title: 'useMicrophone', section: 'api', where: 'API · Soundwave', icon: <CodeXmlIcon /> },
  { title: '--usage-tone', section: 'api', where: 'API · Usage', icon: <HashIcon /> },
  { title: 'Upgrading', section: 'guides', where: 'Guides', icon: <FileTextIcon /> },
];

export default function CommandInline() {
  const [sections, setSections] = useState<string[]>(['components', 'guides', 'api']);

  return (
    <Command variant="inline" className="max-w-xl" label="Search the docs">
      <Command.Input placeholder="Search the docs" />
      <div className="flex gap-1.5 border-b px-3 py-2">
        <Chip.Group value={sections} onValueChange={setSections} aria-label="Sections">
          <Chip value="components" size="sm">Components</Chip>
          <Chip value="guides" size="sm">Guides</Chip>
          <Chip value="api" size="sm">API</Chip>
        </Chip.Group>
      </div>
      <Command.List>
        {RESULTS.filter((result) => sections.includes(result.section)).map((result) => (
          <Command.Item key={result.title} icon={result.icon} subtitle={result.where}>
            {result.title}
          </Command.Item>
        ))}
        <Command.Empty>Nothing in the sections chosen</Command.Empty>
      </Command.List>
    </Command>
  );
}
