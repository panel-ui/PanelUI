'use client';

import { useState } from 'react';
import { Chip } from 'panelui-web/chip';
import { Input } from 'panelui-web/input';

export default function ChipRemovable() {
  const [tags, setTags] = useState(['kitchen', 'renovation', 'quotes']);
  const [draft, setDraft] = useState('');

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Input
        value={draft}
        placeholder="Add a tag and press Enter"
        aria-label="Add a tag"
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          const tag = draft.trim().toLowerCase();
          if (event.key === 'Enter' && tag && !tags.includes(tag)) {
            setTags([...tags, tag]);
            setDraft('');
          }
        }}
      />
      <div className="flex min-h-7 flex-wrap gap-2">
        {tags.map((tag) => (
          <Chip key={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))}>
            {tag}
          </Chip>
        ))}
      </div>
    </div>
  );
}
