import Link from 'next/link';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertCard,
  AreaChartCard,
  BarChartCard,
  ChatCard,
  ControlsCard,
  FormCard,
  CalendarCard,
  AttachmentCard,
  KpiCard,
  SlidersCard,
  TableCard,
  TabsCard,
  TimelineCard,
} from './cards';
import { Themer } from './themer';

/**
 * The home page's second screen: what the components look like, and what
 * changes when the theme does.
 *
 * It replaced a list of every component's name. A name tells a visitor there
 * is a Slider; it does not tell them whether they want this one. The grid
 * fades out at the bottom rather than ending, because it is a sample and the
 * page carries on — the full list lives at /docs/components, linked below it.
 *
 * Four columns of stacked cards rather than one grid of equal cells: the
 * previews are different heights by nature, and a grid would either crop them
 * or leave holes.
 */
export function Showcase(): React.ReactElement {
  return (
    <section className="border-t px-4 py-16 sm:px-6" id="showcase">
      {/* Wider than the prose sections below it. Four columns of previews at
          the page's reading width leaves each one narrower than a phone, and
          every label in them wraps or truncates. */}
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            One import, and it already looks like this
          </h2>
          <p className="mx-auto max-w-2xl text-balance text-muted-foreground">
            Every component reads the same tokens, so a theme is one setting rather than a
            hundred overrides. Switch families below — the corners move too, because a theme
            is a shape as well as a palette.
          </p>
        </div>

        <Themer>
          {/*
           * `zoom`, because these are phone components on a desktop page.
           * Every size in them is the size it is on a device — an 18px card
           * title, a 48px field — and at full scale in a 300px column that
           * reads as a phone screenshot blown up, with labels wrapping and
           * truncating. Zoom shrinks the drawing and *widens* the layout in
           * the same move: the column keeps its pixels but gets more logical
           * room, so nothing has to be restyled to fit. A transform would
           * scale the picture and leave the layout alone, which is the half
           * of it that does not help.
           *
           * Browsers without it render at full size, which is what this looked
           * like before.
           */}
          {/*
           * Clipped to a fixed height, not left to end where the columns
           * happen to end. Four stacks of different lengths finish at four
           * different places, which reads as three holes rather than as a
           * sample — and the fade has nothing to fade if the shortest column
           * ran out well above it. Every column is longer than this box, so
           * all four are cut on the same line and the gradient does the rest.
           */}
          <div className="h-[38rem] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)] sm:h-[42rem]">
            <div className="grid grid-cols-1 items-start gap-5 [zoom:0.85] sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-5">
                <ControlsCard />
                <AttachmentCard />
                <TimelineCard />
              </div>
              <div className="flex flex-col gap-5">
                <AreaChartCard />
                <KpiCard />
                <BarChartCard />
              </div>
              <div className="flex flex-col gap-5">
                <FormCard />
                <SlidersCard />
                <AlertCard />
              </div>
              <div className="flex flex-col gap-5">
                <ChatCard />
                <CalendarCard />
                <TabsCard />
                <TableCard />
              </div>
            </div>
          </div>
        </Themer>

        <Button variant="outline" className="self-start" render={<Link href="/docs/components" />}>
          Browse every component
          <ArrowRightIcon />
        </Button>
      </div>
    </section>
  );
}
