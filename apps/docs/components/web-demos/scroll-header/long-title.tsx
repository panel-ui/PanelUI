'use client';

import { Share2Icon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from 'panelui-web/button';
import { ScrollHeader } from 'panelui-web/scroll-header';

const PARAGRAPHS = [
  'There is a particular kind of bookshop that exists because somebody wanted it to, not because the numbers asked for it. It has a table near the door, a chair that nobody is supposed to sit in, and a shelf of local history that has been in the same order for a decade.',
  'The economics are not mysterious. Rent is the largest line, then staff, then stock. The stock turns slowly and the margins are thin, and the whole thing works because the person running it has decided that a modest living is enough and that the alternative — a bigger shop, more events, a café — would be a different job.',
  'What that buys is patience. A book can sit on the table for six months and find the two people in town who want it. A publisher can take a chance on a first novel because the shop will hand-sell it, and the shop can hand-sell it because it is not trying to turn the stock over before the rent is due.',
  'None of this scales. That is the point. The question a small house asks is not how to become a large one, but how to keep being a small one without becoming a hobby. The answer, when there is one, is usually a shorter list and a longer horizon.',
];

export default function ScrollHeaderLongTitle() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scroller}
      className="h-[440px] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-background"
    >
      <ScrollHeader scrollRef={scroller}>
        <ScrollHeader.Cover />
        <ScrollHeader.Bar>
          <ScrollHeader.Title>The quiet economics of a small publishing house</ScrollHeader.Title>
          <ScrollHeader.Actions>
            <Button variant="ghost" size="icon" aria-label="Share">
              <Share2Icon />
            </Button>
          </ScrollHeader.Actions>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Essay · 8 minute read</ScrollHeader.Description>
          <ScrollHeader.Title>The quiet economics of a small publishing house on the coast</ScrollHeader.Title>
        </ScrollHeader.Large>

        <article className="px-6 py-6">
          <div className="flex flex-col gap-4 text-sm leading-7 text-muted-foreground">
            {PARAGRAPHS.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      </ScrollHeader>
    </div>
  );
}
