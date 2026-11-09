'use client';

import { Field } from 'panelui-web/field';
import { Combobox } from 'panelui-web/combobox';
import { useState } from 'react';

const FRAMEWORKS = [
  { value: 'expo', label: 'Expo' },
  { value: 'react-native', label: 'React Native' },
  { value: 'next', label: 'Next.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
  { value: 'sveltekit', label: 'SvelteKit' },
];

export default function ComboboxMultiple() {
  const [picked, setPicked] = useState<string[]>(['expo']);

  return (
    <Field className="w-full max-w-sm">
      <Field.Label>Frameworks</Field.Label>
      <Combobox
        mode="multiple"
        value={picked}
        onValueChange={setPicked}
        placeholder="Add a framework"
        clearable
      >
        {FRAMEWORKS.map((framework) => (
          <Combobox.Item key={framework.value} value={framework.value} label={framework.label} />
        ))}
      </Combobox>
      <Field.Description>
        {picked.length === 0 ? 'Nothing picked yet.' : `${picked.length} picked. The list stays open between picks.`}
      </Field.Description>
    </Field>
  );
}
