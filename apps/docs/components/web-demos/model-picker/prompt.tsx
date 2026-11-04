'use client';

import { ClaudeMark, GeminiMark, OpenAIMark } from '@/components/model-logos';
import { ModelPicker, type ModelPickerItem, type ModelPickerProvider } from 'panelui-web/model-picker';
import { Prompt } from 'panelui-web/prompt';

const PROVIDERS: ModelPickerProvider[] = [
  { value: 'anthropic', label: 'Anthropic', icon: <ClaudeMark /> },
  { value: 'openai', label: 'OpenAI', icon: <OpenAIMark /> },
  { value: 'google', label: 'Google', icon: <GeminiMark /> },
];

const MODELS: ModelPickerItem[] = [
  { value: 'claude-opus-5.5', label: 'Claude Opus 5.5', provider: 'anthropic' },
  { value: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'anthropic' },
  { value: 'gpt-5.5', label: 'GPT-5.5', provider: 'openai' },
  { value: 'gpt-5.4-thinking', label: 'GPT-5.4 Thinking', provider: 'openai' },
  { value: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro', provider: 'google' },
];

export default function ModelPickerPrompt() {
  return (
    <div className="w-full max-w-xl">
      <Prompt>
        <Prompt.Field>
          <Prompt.Textarea placeholder="Plan a three-day trip to Lisbon" minRows={2} />
          <Prompt.Footer>
            <Prompt.Tools>
              <Prompt.Menu />
              <ModelPicker items={MODELS} providers={PROVIDERS} defaultValue="claude-sonnet-5.5" defaultFavorites={['claude-sonnet-5.5', 'gpt-5.5']}>
                <ModelPicker.Trigger />
                <ModelPicker.Content side="top" />
              </ModelPicker>
            </Prompt.Tools>
            <Prompt.Submit />
          </Prompt.Footer>
        </Prompt.Field>
      </Prompt>
    </div>
  );
}
