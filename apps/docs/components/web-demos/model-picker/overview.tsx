'use client';

import { ClaudeMark, DeepSeekMark, GeminiMark, MetaMark, MistralMark, OpenAIMark, XAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark />, status: 'new' },
  { value: 'xai', label: 'xAI', icon: <XAIMark /> },
  { value: 'mistral', label: 'Mistral', icon: <MistralMark /> },
  { value: 'deepseek', label: 'DeepSeek', icon: <DeepSeekMark />, status: 'limited' },
  { value: 'meta', label: 'Meta', icon: <MetaMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai', badge: 'New' },
  { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking', provider: 'openai' },
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic' },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google' },
  { value: 'grok-4', label: 'Grok 4', provider: 'xai' },
  { value: 'mistral-large-3', label: 'Mistral Large 3', provider: 'mistral' },
  { value: 'deepseek-v4', label: 'DeepSeek V4', provider: 'deepseek', disabled: true, note: 'Rate-limited until 14:00' },
  { value: 'llama-4-maverick', label: 'Llama 4 Maverick', provider: 'meta' },
];

export default function ModelPickerOverview() {
  return (
    <ModelPicker
      items={MODELS}
      providers={PROVIDERS}
      defaultValue="claude-sonnet-5.5"
      defaultFavorites={['gpt-5.5', 'claude-opus-5.5', 'claude-sonnet-5.5', 'gemini-3.1-pro']}
      hotkey="alt+m"
    >
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
