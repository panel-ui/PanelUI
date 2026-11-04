'use client';

import { BrainIcon, SparklesIcon, ZapIcon } from 'lucide-react';
import { Prompt, type PromptModelItem } from 'panelui-web/prompt';
import { Usage } from 'panelui-web/usage';

const MODELS: PromptModelItem[] = [
  { value: 'lumen', label: 'Lumen 4', icon: <SparklesIcon />, description: 'Balanced, for most questions' },
  { value: 'lumen-mini', label: 'Lumen 4 Mini', icon: <ZapIcon />, description: 'Quick answers to small asks' },
  { value: 'lumen-deep', label: 'Lumen 4 Deep', icon: <BrainIcon />, description: 'Slower, for hard problems' },
];

const CONTEXT = [
  { label: 'System prompt', value: 9_400 },
  { label: 'Tools', value: 16_200 },
  { label: 'Files', value: 74_000 },
  { label: 'Messages', value: 52_300 },
];

export default function UsagePrompt() {
  return (
    <div className="w-full max-w-xl">
      <Prompt>
        <Prompt.Field>
          <Prompt.Textarea placeholder="Ask about the codebase" minRows={2} />
          <Prompt.Footer>
            <Prompt.Tools>
              <Prompt.Menu />
              <Prompt.Model items={MODELS} defaultValue="lumen" variant="ghost" />
            </Prompt.Tools>
            <div className="flex items-center gap-1">
              <Usage limit={200_000} segments={CONTEXT}>
                <Usage.Trigger />
                <Usage.Content align="end">
                  <Usage.Summary label="Context window" unit="tokens" />
                  <Usage.Breakdown />
                </Usage.Content>
              </Usage>
              <Prompt.Submit />
            </div>
          </Prompt.Footer>
        </Prompt.Field>
      </Prompt>
    </div>
  );
}
