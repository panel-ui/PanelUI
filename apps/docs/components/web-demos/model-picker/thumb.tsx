'use client';

import { ClaudeMark, GeminiMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
];

export default function ModelPickerThumb() {
  return (
    <ModelPicker items={MODELS} providers={PROVIDERS} defaultValue="claude-sonnet-5.5">
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
