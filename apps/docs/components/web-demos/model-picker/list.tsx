'use client';

import { ClaudeMark, GeminiMark, MistralMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
  { value: 'mistral', label: 'Mistral', icon: <MistralMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai', contextWindow: 400_000 },
  { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking', provider: 'openai', contextWindow: 400_000 },
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic', contextWindow: 1_000_000 },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic', contextWindow: 1_000_000 },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google', contextWindow: 1_000_000 },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google', contextWindow: 1_000_000 },
  { value: 'mistral-large-3', label: 'Mistral Large 3', provider: 'mistral', contextWindow: 256_000 },
];

export default function ModelPickerList() {
  return (
    <ModelPicker variant="list" items={MODELS} providers={PROVIDERS} defaultValue="claude-opus-5.5" defaultFavorites={['claude-opus-5.5']}>
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
