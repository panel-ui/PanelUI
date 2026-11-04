'use client';

import { ClaudeMark, GeminiMark, OpenAIMark, XAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
  { value: 'xai', label: 'xAI', icon: <XAIMark /> },
];

const MODELS: ModelPickerItem[] = [
  {
    value: 'claude-opus-5.5',
    label: 'Claude Opus 5.5',
    provider: 'anthropic',
    description: 'For work that takes hours: migrations, audits and long agent runs.',
    contextWindow: 1_000_000,
    speed: 2,
    intelligence: 5,
    price: 4,
    tags: ['Code', 'Agents', 'Long context'],
  },
  {
    value: 'claude-sonnet-5.5',
    label: 'Claude Sonnet 5.5',
    provider: 'anthropic',
    description: 'The everyday choice: quick enough to chat with, strong enough to ship code.',
    contextWindow: 1_000_000,
    speed: 4,
    intelligence: 4,
    price: 3,
    tags: ['Code', 'Writing'],
  },
  {
    value: 'gpt-5.5',
    label: 'GPT-5.5',
    provider: 'openai',
    description: 'Uses tools and the web on its own to finish a task end to end.',
    contextWindow: 400_000,
    speed: 3,
    intelligence: 5,
    price: 4,
    tags: ['Tools', 'Research'],
  },
  {
    value: 'gemini-3.1-pro',
    label: 'Gemini 3.1 Pro',
    provider: 'google',
    description: 'Reads video, audio, images and very long documents in one prompt.',
    contextWindow: 1_000_000,
    speed: 3,
    intelligence: 5,
    price: 3,
    tags: ['Vision', 'Audio'],
  },
  {
    value: 'grok-4',
    label: 'Grok 4',
    provider: 'xai',
    description: 'Looks things up as it answers, for questions about the news.',
    contextWindow: 256_000,
    speed: 3,
    intelligence: 4,
    price: 3,
    tags: ['Live search'],
  },
];

export default function ModelPickerDetail() {
  return (
    <ModelPicker variant="detail" items={MODELS} providers={PROVIDERS} defaultValue="claude-sonnet-5.5">
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
