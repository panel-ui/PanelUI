'use client';

import { ClaudeMark, GeminiMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';
import { useState } from 'react';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic' },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google' },
];

export default function ModelPickerControlled() {
  const [model, setModel] = useState('claude-haiku-5.5');
  const [starred, setStarred] = useState<string[]>(['claude-haiku-5.5', 'gemini-3-flash']);
  const chosen = MODELS.find((item) => item.value === model);

  return (
    <div className="flex flex-col items-center gap-3">
      <ModelPicker
        variant="list"
        items={MODELS}
        providers={PROVIDERS}
        value={model}
        onValueChange={setModel}
        favorites={starred}
        onFavoritesChange={setStarred}
      >
        <ModelPicker.Trigger appearance="outline" />
        <ModelPicker.Content align="center" />
      </ModelPicker>
      <p className="text-sm text-muted-foreground">
        Replies come from {chosen?.label}. {starred.length} starred.
      </p>
    </div>
  );
}
