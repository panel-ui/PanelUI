'use client';

import { useRef } from 'react';
import { ScrollHeader } from 'panelui-web/scroll-header';

export default function ScrollHeaderThumb() {
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scroller}
      className="w-72 shrink-0 overflow-hidden rounded-2xl border bg-background"
    >
      <ScrollHeader barHeight={40} scrollRef={scroller}>
        <ScrollHeader.Cover />
        <ScrollHeader.Bar>
          <ScrollHeader.Title>Field notes</ScrollHeader.Title>
        </ScrollHeader.Bar>
        <ScrollHeader.Large>
          <ScrollHeader.Description>Issue 12 · November</ScrollHeader.Description>
          <ScrollHeader.Title>Field notes</ScrollHeader.Title>
        </ScrollHeader.Large>
      </ScrollHeader>
    </div>
  );
}
