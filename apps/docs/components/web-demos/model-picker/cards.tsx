'use client';

import { ClaudeMark, GeminiMark, MetaMark, OpenAIMark, XAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
  { value: 'xai', label: 'xAI', icon: <XAIMark /> },
  { value: 'meta', label: 'Meta', icon: <MetaMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic', description: 'Long agent runs and careful refactors across a whole repository.', tags: ['Code', 'Agents'] },
  { value: 'claude-haiku-5.5', label: 'Claude Haiku 5.5', provider: 'anthropic', description: 'Quick answers, triage and autocomplete.', tags: ['Fast'] },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai', badge: 'New', description: 'Research that reads widely and writes a report with sources.', tags: ['Research', 'Tools'] },
  { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking', provider: 'openai', description: 'Thinks before answering, for maths and planning.', tags: ['Reasoning'] },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google', description: 'Video, audio and very long documents in one prompt.', tags: ['Vision', 'Long context'] },
  { value: 'grok-4', label: 'Grok 4', provider: 'xai', description: 'Answers about what is happening right now.', tags: ['Live search'] },
  { value: 'llama-4-maverick', label: 'Llama 4 Maverick', provider: 'meta', description: 'Open weights, for running on your own servers.', tags: ['Open', 'Self-host'] },
];

export default function ModelPickerCards() {
  return (
    <ModelPicker variant="cards" items={MODELS} providers={PROVIDERS} defaultValue="gemini-3.1-pro">
      <ModelPicker.Trigger appearance="outline" />
      <ModelPicker.Content />
    </ModelPicker>
  );
}
