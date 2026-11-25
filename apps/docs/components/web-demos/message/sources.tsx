'use client';

import { Message, type MessageSourceItem } from 'panelui-web/message';

const SOURCES: MessageSourceItem[] = [
  {
    id: 'flour',
    title: 'Hydration and flour strength',
    url: 'https://example.org/flour',
    domain: 'millersnotes.com',
    kind: 'Exact quote',
    quote: (
      <>
        Strong bread flours <mark>take up 70 to 75% water</mark> before the dough turns slack.
      </>
    ),
  },
  {
    id: 'temp',
    title: 'Proofing times by room temperature',
    url: 'https://example.org/proof',
    domain: 'breadlab.net',
    kind: 'Summary',
    quote: (
      <>
        At 24 °C a bulk ferment <mark>takes four to five hours</mark>; at 20 °C, closer to seven.
      </>
    ),
  },
  {
    id: 'poke',
    title: 'Reading the poke test',
    url: 'https://example.org/poke',
    domain: 'bakeschool.org',
    kind: 'Exact quote',
    quote: (
      <>
        A dent that <mark>springs back slowly and only part of the way</mark> means the loaf is ready to bake.
      </>
    ),
  },
];

const by = (...ids: string[]) => SOURCES.filter((source) => ids.includes(source.id));

export default function MessageSourcesDemo() {
  return (
    <div className="w-full max-w-xl">
      <Message from="assistant">
        <Message.Content>
          <Message.Bubble>
            <Message.BubbleContent>
              <p>
                <Message.Cite source="flour">Start at 72% water with a strong bread flour</Message.Cite>
                <Message.Citation sources={by('flour')} /> and raise it once the dough handles well.{' '}
                <Message.Cite source="temp">In a 24 °C kitchen the bulk rise takes four to five hours</Message.Cite>
                <Message.Citation sources={by('temp')} />, longer if the room is cooler.{' '}
                <Message.Cite source="poke">
                  It is ready when a floured finger leaves a dent that fills back slowly
                </Message.Cite>
                <Message.Citation sources={by('poke')} />.
              </p>
            </Message.BubbleContent>
          </Message.Bubble>
          <Message.Sources sources={SOURCES} defaultOpen />
        </Message.Content>
      </Message>
    </div>
  );
}
