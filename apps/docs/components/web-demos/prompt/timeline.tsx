'use client';

import {
  BookOpen01Icon,
  BotIcon,
  GitCompareIcon,
  Rocket01Icon,
  Search01Icon,
  SourceCodeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Prompt, type PromptTaskStatus } from 'panelui-web/prompt';
import { useEffect, useState } from 'react';

interface Step {
  text: string;
  meta: string;
}

interface Task {
  label: string;
  icon: React.ReactNode;
  /** The word shown while it runs. */
  state: string;
  /** How long it takes, in ticks of the demo's clock. */
  ticks: number;
  /** Its steps, revealed one a tick while it runs. */
  steps: Step[];
  /** It stops for an answer before running. */
  approval?: string;
}

const TASKS: Task[] = [
  {
    label: 'Read the webhook handlers',
    icon: <HugeiconsIcon icon={Search01Icon} />,
    state: 'Reading',
    ticks: 2,
    steps: [{ text: 'Found 4 handlers', meta: 'webhooks/*.ts' }],
  },
  {
    label: 'Map events to the new API',
    icon: <HugeiconsIcon icon={GitCompareIcon} />,
    state: 'Mapping',
    ticks: 3,
    steps: [
      { text: 'Renamed 3 event types', meta: '+42 −17' },
      { text: 'Kept invoice.paid as it is', meta: 'events.ts:61' },
    ],
  },
  {
    label: 'Rewrite the handlers',
    icon: <HugeiconsIcon icon={SourceCodeIcon} />,
    state: 'Editing',
    ticks: 5,
    steps: [
      { text: 'Moved the signature check into one place', meta: 'verify.ts:18' },
      { text: 'Updated 4 handlers', meta: '+96 −71' },
      { text: 'Running the tests', meta: '38/52' },
      { text: 'All tests pass', meta: '52/52' },
    ],
  },
  {
    label: 'Update the runbook',
    icon: <HugeiconsIcon icon={BookOpen01Icon} />,
    state: 'Writing',
    ticks: 3,
    steps: [
      { text: 'Added a rollback section', meta: 'RUNBOOK.md' },
      { text: 'Linked the migration ticket', meta: 'OPS-212' },
    ],
  },
  {
    label: 'Deploy to staging',
    icon: <HugeiconsIcon icon={Rocket01Icon} />,
    state: 'Deploying',
    ticks: 2,
    steps: [{ text: 'Build 7f3c is live on staging', meta: '41s' }],
    approval: 'Deploy build 7f3c to staging: 4 files changed, 52 tests passing. Production is not touched.',
  },
];

export default function PromptTimeline() {
  // Which task is current, how many ticks it has run, and how long each finished one took.
  const [current, setCurrent] = useState(0);
  const [tick, setTick] = useState(0);
  const [took, setTook] = useState<number[]>([]);
  const [running, setRunning] = useState(true);
  const [approved, setApproved] = useState(false);
  const [declined, setDeclined] = useState(false);
  // Seconds the current task has been running, shown beside its live word.
  const [elapsed, setElapsed] = useState(0);

  const task = TASKS[current];
  const waiting = task?.approval !== undefined && !approved && !declined;
  const finished = current >= TASKS.length;

  useEffect(() => {
    if (!running || finished || waiting || declined) return;
    const timer = window.setTimeout(() => {
      if (tick + 1 >= task!.ticks) {
        setTook((list) => [...list, task!.ticks + 1 + current * 2]);
        setCurrent((index) => index + 1);
        setTick(0);
      } else setTick((count) => count + 1);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [running, finished, waiting, declined, tick, task, current]);

  useEffect(() => setElapsed(0), [current]);
  useEffect(() => {
    if (!running || finished || waiting || declined) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running, finished, waiting, declined]);

  const restart = () => {
    setCurrent(0);
    setTick(0);
    setTook([]);
    setApproved(false);
    setDeclined(false);
    setRunning(true);
  };

  const statusOf = (index: number): PromptTaskStatus =>
    index < current
      ? 'done'
      : index > current
        ? 'pending'
        : declined
          ? 'error'
          : waiting
            ? 'waiting'
            : running
              ? 'active'
              : 'pending';

  const title = finished
    ? 'Webhooks are on the new API'
    : declined
      ? 'Stopped before deploying'
      : waiting
        ? 'Waiting for your go-ahead'
        : running
          ? 'Migrating the billing webhooks'
          : 'Paused';

  return (
    <div className="w-full max-w-xl">
      <Prompt
        status={running && !finished && !waiting && !declined ? 'streaming' : 'idle'}
        onStop={() => setRunning(false)}
        onSubmit={() => (finished || declined ? restart() : setRunning(true))}
      >
        <Prompt.Tasks
          variant="timeline"
          defaultExpanded
          title={title}
          badge={
            <>
              <HugeiconsIcon icon={BotIcon} />
              Ops agent
            </>
          }
        >
          {TASKS.map((item, index) => {
            const status = statusOf(index);
            const shownSteps =
              index < current ? item.steps : index === current && !waiting ? item.steps.slice(0, tick + 1) : [];
            return (
              <Prompt.Task
                key={item.label}
                status={status}
                icon={item.icon}
                state={status === 'waiting' ? 'Needs you' : item.state}
                tag={item.approval && index > current ? 'Approval' : undefined}
                meta={
                  index < current
                    ? `${took[index]}s`
                    : index === current && status === 'active'
                      ? `${elapsed}s`
                      : undefined
                }
              >
                {item.label}
                {shownSteps.map((step, stepIndex) => (
                  <Prompt.TaskStep
                    key={step.text}
                    meta={step.meta}
                    status={index === current && stepIndex === shownSteps.length - 1 ? 'active' : 'done'}
                  >
                    {step.text}
                  </Prompt.TaskStep>
                ))}
                {status === 'waiting' ? (
                  <Prompt.TaskApproval onApprove={() => setApproved(true)} onDecline={() => setDeclined(true)}>
                    {item.approval}
                  </Prompt.TaskApproval>
                ) : null}
              </Prompt.Task>
            );
          })}
        </Prompt.Tasks>
        <Prompt.Field>
          <Prompt.Textarea
            placeholder={finished || declined ? 'Send anything to run it again' : 'Steer the agent while it works'}
          />
          <Prompt.Footer>
            <Prompt.Tools>
              <Prompt.Menu>
                <Prompt.AttachItem />
              </Prompt.Menu>
            </Prompt.Tools>
            <Prompt.Submit />
          </Prompt.Footer>
        </Prompt.Field>
      </Prompt>
    </div>
  );
}
