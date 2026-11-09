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

export default function ComboboxOverview() {
  const [framework, setFramework] = useState<string | undefined>();

  return (
    <Field className="w-full max-w-xs">
      <Field.Label>Framework</Field.Label>
      <Combobox
        value={framework}
        onValueChange={setFramework}
        placeholder="Search frameworks"
        clearable
      >
        {FRAMEWORKS.map((framework) => (
          <Combobox.Item key={framework.value} value={framework.value} label={framework.label} />
        ))}
      </Combobox>
      <Field.Description>
        {framework ? `Building with ${FRAMEWORKS.find((item) => item.value === framework)?.label}.` : 'Pick one to continue.'}
      </Field.Description>
    </Field>
  );
}
