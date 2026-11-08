'use client';

import { Field } from 'panelui-web/field';
import { Combobox } from 'panelui-web/combobox';
import { useState } from 'react';

const SUGGESTIONS = ['design', 'engineering', 'research', 'growth', 'support', 'operations'];

export default function ComboboxCustom() {
  const [tags, setTags] = useState<string[]>(['design', 'engineering']);

  return (
    <Field className="w-full max-w-sm">
      <Field.Label>Tags</Field.Label>
      <Combobox
        mode="multiple"
        value={tags}
        onValueChange={setTags}
        allowCustomValue
        placeholder="Add a tag"
        clearable
      >
        {SUGGESTIONS.map((tag) => (
          <Combobox.Item key={tag} value={tag} label={tag} />
        ))}
      </Combobox>
      <Field.Description>
        Type a tag that is not listed and press Enter to add it.
      </Field.Description>
    </Field>
  );
}
