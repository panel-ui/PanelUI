'use client';

import { ClaudeMark, DeepSeekMark, GeminiMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
  { value: 'deepseek', label: 'DeepSeek', icon: <DeepSeekMark />, status: 'limited' },
];

const MODELS: ModelPickerItem[] = [
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic' },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic', note: 'Fastest, for short replies' },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai' },
  { value: 'gpt-5.4-pro', label: 'GPT-5.4 Pro', provider: 'openai', note: 'Pro plan only' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
  { value: 'deepseek-v4', label: 'DeepSeek V4', provider: 'deepseek', disabled: true, note: 'Rate-limited until 14:00' },
];

export default function ModelPickerRail() {
  return (
    <ModelPicker items={MODELS} providers={PROVIDERS} defaultValue="gpt-5.5" defaultFavorites={['claude-sonnet-5.5', 'gpt-5.5']}>
      <ModelPicker.Trigger />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
