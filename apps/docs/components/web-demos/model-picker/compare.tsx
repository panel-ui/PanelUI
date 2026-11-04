'use client';

import { ClaudeMark, DeepSeekMark, GeminiMark, MistralMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
  { value: 'mistral', label: 'Mistral', icon: <MistralMark /> },
  { value: 'deepseek', label: 'DeepSeek', icon: <DeepSeekMark /> },
];

/** Speed and intelligence from 1 to 5, price from 1 to 4. */
const MODELS: ModelPickerItem[] = [
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic', speed: 2, intelligence: 5, price: 4 },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic', speed: 4, intelligence: 4, price: 3 },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic', speed: 5, intelligence: 3, price: 1 },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai', speed: 3, intelligence: 5, price: 4 },
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', provider: 'google', speed: 5, intelligence: 3, price: 1 },
  { value: 'mistral-large-3', label: 'Mistral Large 3', provider: 'mistral', speed: 4, intelligence: 3, price: 2 },
  { value: 'deepseek-v4', label: 'DeepSeek V4', provider: 'deepseek', speed: 3, intelligence: 4, price: 1 },
];

export default function ModelPickerCompare() {
  return (
    <ModelPicker variant="compare" items={MODELS} providers={PROVIDERS} defaultValue="claude-sonnet-5.5">
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
