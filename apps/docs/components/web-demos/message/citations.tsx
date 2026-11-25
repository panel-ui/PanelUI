'use client';

import { useEffect, useState } from 'react';
import { Message, type MessageSourceItem } from 'panelui-web/message';

const SOURCES: MessageSourceItem[] = [
  {
    id: 'store',
    title: 'Why paved districts cool slowly',
    url: 'https://example.org/heat/storage',
    domain: 'cityclimate.org',
    kind: 'Exact quote',
    quote: (
      <>
        Masonry and asphalt <mark>absorb heat through the day and release it slowly overnight</mark>, keeping air near
        the ground warm long after sunset.
      </>
    ),
  },
  {
    id: 'atlas',
    title: 'Night-time temperature gaps in 40 cities',
    url: 'https://example.org/atlas/night-gap',
    domain: 'heatatlas.net',
    kind: 'Summary',
    quote: (
      <>
        On still, cloudless nights the centre ran <mark>5 to 7 °C warmer</mark> than farmland at the city's edge.
      </>
    ),
  },
  {
    id: 'survey',
    title: 'A street-level temperature survey',
    url: 'https://example.org/survey/2025',
    domain: 'northfield.edu',
    kind: 'Exact quote',
    quote: (
      <>
        The difference <mark>peaked on calm, clear nights</mark> and nearly vanished under wind or cloud.
      </>
    ),
  },
  {
    id: 'roofs',
    title: 'Shade, albedo and surface heat',
    url: 'https://example.org/roofs',
    domain: 'greenroofs.io',
    kind: 'Summary',
    quote: (
      <>
        Tree cover and reflective roofs <mark>cut stored surface heat</mark> by shading it and by reflecting light
        before it is absorbed.
      </>
    ),
  },
];

const by = (...ids: string[]) => SOURCES.filter((source) => ids.includes(source.id));

const PARTS = [
  {
    text: 'Cities stay warmer after dark because brick, asphalt and concrete soak up heat all day and give it back slowly through the night.',
    sources: ['store'],
  },
  {
    text: 'The gap is widest on calm, clear nights, when a dense centre can be 5 to 7 °C warmer than the fields around it.',
    sources: ['atlas', 'survey'],
  },
  {
    text: 'Trees and pale roofs narrow it: shade keeps surfaces from storing heat, and light colours reflect more of it before it is absorbed.',
    sources: ['roofs'],
  },
];

export default function MessageCitations() {
  // How many characters of the answer have arrived; -1 while sources are being found.
  const [shown, setShown] = useState(-1);
  const total = PARTS.reduce((sum, part) => sum + part.text.length, 0);

  useEffect(() => {
    if (shown >= total) return;
    const timer = window.setTimeout(
      () => setShown((count) => (count < 0 ? 0 : Math.min(total, count + 6))),
      shown < 0 ? 1400 : 28,
    );
    return () => window.clearTimeout(timer);
  }, [shown, total]);

  const streaming = shown < total;
  let offset = 0;

  return (
    <div className="w-full max-w-xl">
      <Message from="assistant" streaming={streaming && shown >= 0}>
        <Message.Content>
          {shown < 0 ? (
            <Message.Status>Finding sources</Message.Status>
          ) : (
            <Message.Bubble>
              <Message.BubbleContent>
                <p>
                  {PARTS.map((part) => {
                    const start = offset;
                    offset += part.text.length;
                    const visible = part.text.slice(0, Math.max(0, shown - start));
                    if (!visible) return null;
                    const complete = visible.length === part.text.length;
                    return (
                      <span key={part.text}>
                        <Message.Cite source={part.sources}>{visible}</Message.Cite>
                        {complete ? <Message.Citation sources={by(...part.sources)} /> : null}{' '}
                      </span>
                    );
                  })}
                </p>
              </Message.BubbleContent>
            </Message.Bubble>
          )}
          {!streaming ? <Message.Sources sources={SOURCES} /> : null}
        </Message.Content>
      </Message>
    </div>
  );
}
