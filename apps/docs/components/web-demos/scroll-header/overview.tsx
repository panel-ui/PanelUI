'use client';

import { BookmarkIcon, MoreHorizontalIcon, Share2Icon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from 'panelui-web/button';
import { ScrollArea } from 'panelui-web/scroll-area';
import { ScrollHeader } from 'panelui-web/scroll-header';

const PARAGRAPHS = [
  'The press has been in the same building since 1974: two floors, a stone stair, and a loading door on the lane that is exactly wide enough for a pallet of paper. Nothing about it was chosen for efficiency. It was chosen because it was there, and because the rent was low enough that a bad year would not close it.',
  'That is the whole model, in a sentence. A small publisher does not compete on speed or scale. It competes by being able to wait — for a book to find its reader, for a printing decision to become obvious, for a title to earn back its advance over four years instead of four months.',
  'The autumn list has eleven titles. Six are reprints, which means the typesetting is already done and the only question is how many to print. The other five are new, and each one arrives with a different kind of risk: a first novel with a good agent, a translation that took three years to license, a cookbook that needs colour on every spread, a memoir with a difficult author, and a book of essays that nobody expects to sell and everybody wants to publish.',
  'The print run for the novel is four thousand. That is not a guess. It is the number the sales team can place in independent shops before publication, plus the number the wholesalers will take on a sale-or-return basis, minus the number that usually come back. The arithmetic is unglamorous and it is the whole job.',
  'What the reader sees is a cover, a page, a sentence. What makes the sentence arrive is a schedule that has been revised six times, a paper stock that was tested against the cover proof, and a printer who answers the phone on a Tuesday afternoon in November.',
  'The building is quiet in the morning. By ten the desk has three parcels on it and the kettle is on, and somebody is asking whether the index for the essays has come back from the author. It has not. It will, eventually. The book will be late by a week, and the week will not matter.',
];

export default function ScrollHeaderOverview() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <ScrollArea viewportRef={scroller} className="h-[460px] w-full max-w-2xl rounded-2xl border bg-background text-sm">
      <ScrollHeader scrollRef={scroller}>
        <ScrollHeader.Cover />
        <ScrollHeader.Bar>
          <ScrollHeader.Title>Field notes</ScrollHeader.Title>
          <ScrollHeader.Actions>
            <Button variant="ghost" size="icon" aria-label="Share this issue">
              <Share2Icon />
            </Button>
            <Button variant="ghost" size="icon" aria-label="More actions">
              <MoreHorizontalIcon />
            </Button>
          </ScrollHeader.Actions>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Issue 12 · November</ScrollHeader.Description>
          <ScrollHeader.Title>Field notes from the coast</ScrollHeader.Title>
          <ScrollHeader.Actions>
            <Button variant="secondary" size="sm">
              <BookmarkIcon />
              Save
            </Button>
          </ScrollHeader.Actions>
        </ScrollHeader.Large>

        <article className="px-6 py-6">
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            The press
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Eleven titles and a loading door
          </h2>
          <div className="mt-4 flex flex-col gap-4 leading-7 text-muted-foreground">
            {PARAGRAPHS.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
      </ScrollHeader>
    </ScrollArea>
  );
}
