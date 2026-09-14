import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRightIcon,
  EmptyState,
  Item,
  SectionRail,
  Text,
  useKeyboard,
} from 'panelui-native';
import { ScreenHeader } from '../../../src/components/screen-header';
import type { ComponentEntry, Demo } from '../../../src/data/components';
import { useComponentEntry } from '../../../src/data/use-component-entry';

/**
 * A demo that needs the whole screen gets a row here instead of being rendered
 * inline. A chat transcript squeezed into a section between two dividers
 * demonstrates nothing except that it does not fit — so it is listed,
 * described, and opened on a screen of its own.
 */
function VersionRow({ slug, demo, index }: { slug: string; demo: Demo; index: number }) {
  return (
    <Item
      variant="muted"
      size="sm"
      onPress={() => router.push(`/components/${slug}/${demo.id}`)}
    >
      {/* Numbered, because "version three" is how these get talked about — and
          a filled row needs something on its leading edge to sit against. */}
      <Item.Media variant="icon">
        <Text size="sm" weight="medium" muted>
          {index + 1}
        </Text>
      </Item.Media>
      <Item.Content>
        <Item.Title>{demo.label}</Item.Title>
        {demo.description ? <Item.Description>{demo.description}</Item.Description> : null}
      </Item.Content>
      <Item.Actions>
        <ChevronRightIcon size={16} />
      </Item.Actions>
    </Item>
  );
}

/** The heading over a demo, in both layouts, so they read as the same screen. */
function DemoLabel({ children }: { children: string }) {
  return (
    <Text size="xs" weight="semibold" muted className="mb-4 uppercase tracking-wider">
      {children}
    </Text>
  );
}

function VersionList({
  entry,
  versions,
  start = 0,
}: {
  entry: ComponentEntry;
  versions: Demo[];
  /** Where this list's numbering picks up, when the versions span pages. */
  start?: number;
}) {
  return (
    // Gaps, not hairlines: each row is its own filled surface, and a separator
    // between two cards reads as a mistake.
    <Item.Group className="gap-2">
      {versions.map((demo, index) => (
        <VersionRow key={demo.id} slug={entry.slug} demo={demo} index={start + index} />
      ))}
    </Item.Group>
  );
}

/*
 * How many version rows a page holds.
 *
 * A row carries a title and a description of two or three lines, so five of
 * them run past the bottom of a phone-sized page — into the rail, which sits
 * in the corner over whatever is there. Four leave room below the last one.
 */
const VERSIONS_PER_PAGE = 4;

/** The versions in runs of `VERSIONS_PER_PAGE`, one run per page. */
function versionPages(versions: Demo[]) {
  const runs: { start: number; versions: Demo[] }[] = [];
  for (let start = 0; start < versions.length; start += VERSIONS_PER_PAGE) {
    runs.push({ start, versions: versions.slice(start, start + VERSIONS_PER_PAGE) });
  }
  return runs;
}

/** Every variant down one scroll, divided by hairlines. */
function SectionsLayout({
  entry,
  versions,
  inline,
}: {
  entry: ComponentEntry;
  versions: Demo[];
  inline: Demo[];
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      contentContainerClassName="px-5 pt-2"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      <Text size="sm" muted className="pb-6">
        {entry.summary}
      </Text>

      {versions.length ? (
        <View>
          <DemoLabel>Versions</DemoLabel>
          <VersionList entry={entry} versions={versions} />
        </View>
      ) : null}

      {inline.map((demo, index) => (
        <View key={demo.label}>
          {index > 0 || versions.length ? <View className="my-8 h-px bg-border" /> : null}
          <DemoLabel>{demo.label}</DemoLabel>
          <View className="w-full items-center">{demo.render()}</View>
        </View>
      ))}
    </ScrollView>
  );
}

/**
 * One demo per screen, swiped vertically, with a rail in the corner standing in
 * for the scrollbar.
 *
 * The page height is the scroll view's own, measured — not the window's.
 * The header and the summary above the pager make the viewport shorter than
 * the screen, and window-height pages then sit a little further out of
 * alignment with each snap position than the last, until one of them lands
 * entirely between two and never shows.
 */
function PagerLayout({
  entry,
  versions,
  demos,
  index: showIndex,
  fills = false,
}: {
  entry: ComponentEntry;
  versions: Demo[];
  /** The demos that become pages, in order. */
  demos: Demo[];
  /** Put the Versions list on a page of its own in front of them. */
  index: boolean;
  /**
   * Let each demo have the page's remaining height instead of sitting centred
   * at its own size, and drop the horizontal padding — a demo written to own a
   * screen brings its own.
   */
  fills?: boolean;
}) {
  const [page, setPage] = useState(0);
  const [pageHeight, setPageHeight] = useState(0);
  const scroller = useRef<ScrollView>(null);
  /*
   * A page centres its demo in the viewport, which is the wrong place to be
   * once a field on it takes focus: the keyboard covers the bottom half, and
   * centred means sitting right on its edge with anything the field opens
   * underneath it. While the keyboard is up the demo goes to the top instead,
   * which is the only part of the page still visible.
   */
  const { isVisible: keyboardVisible } = useKeyboard();

  // The versions list leads, where there is one to show: it is the index to
  // the screens that are not pages themselves. Past four it takes more than
  // one page, and each is labelled with the range it holds so the rail can
  // tell them apart.
  const runs = showIndex ? versionPages(versions) : [];
  const pages: {
    id: string;
    label: string;
    demo?: Demo;
    run?: { start: number; versions: Demo[] };
  }[] = [
    ...runs.map((run) => ({
      id: run.start === 0 ? 'versions' : `versions-${run.start}`,
      label:
        runs.length === 1
          ? 'Versions'
          : run.versions.length === 1
            ? `Version ${run.start + 1}`
            : `Versions ${run.start + 1}–${run.start + run.versions.length}`,
      run,
    })),
    ...demos.map((demo) => ({ id: demo.id ?? demo.label, label: demo.label, demo })),
  ];

  const scrollToPage = (index: number) => {
    if (index < 0 || !pageHeight) return;
    setPage(index);
    scroller.current?.scrollTo({ y: index * pageHeight, animated: true });
  };

  return (
    <>
      <Text size="sm" muted className="px-5 pb-3">
        {entry.summary}
      </Text>

      <ScrollView
        ref={scroller}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        // Not while the keyboard is up: a platform that resizes the window for
        // it would re-measure every page mid-scroll, and each snap position
        // would move out from under the offset the scroll is already at.
        onLayout={(event) => {
          if (keyboardVisible) return;
          setPageHeight(event.nativeEvent.layout.height);
        }}
        onScroll={(event) => {
          const { contentOffset, layoutMeasurement } = event.nativeEvent;
          if (!layoutMeasurement.height) return;
          const next = Math.round(contentOffset.y / layoutMeasurement.height);
          if (next !== page) setPage(next);
        }}
      >
        {pages.map((entryPage, index) => (
          <View
            key={entryPage.id}
            // Nothing to lay out until the viewport has been measured; a page
            // of the wrong height would scroll to the wrong place first.
            style={{ height: pageHeight || undefined }}
            className={
              fills ? 'pt-1' : keyboardVisible ? 'px-5 pt-2' : 'justify-center px-5'
            }
          >
            <View className={fills ? 'px-5' : undefined}>
              <Text size="xs" muted className="mb-2">
                {index + 1} of {pages.length}
              </Text>
              <DemoLabel>{entryPage.label}</DemoLabel>
            </View>
            {entryPage.demo ? (
              <>
                {entryPage.demo.description ? (
                  <Text size="sm" muted className={fills ? '-mt-2 mb-3 px-5' : '-mt-2 mb-4'}>
                    {entryPage.demo.description}
                  </Text>
                ) : null}
                <View className={fills ? 'flex-1' : 'w-full items-center'}>
                  {entryPage.demo.render()}
                </View>
              </>
            ) : entryPage.run ? (
              <VersionList
                entry={entry}
                versions={entryPage.run.versions}
                start={entryPage.run.start}
              />
            ) : null}
          </View>
        ))}
      </ScrollView>

      <SectionRail
        placement="left"
        align="bottom"
        haptics
        value={pages[page]?.id}
        onValueChange={(next) => scrollToPage(pages.findIndex((item) => item.id === next))}
      >
        <SectionRail.Trigger>
          {pages.map((item) => (
            <SectionRail.Bar key={item.id} value={item.id} />
          ))}
        </SectionRail.Trigger>
        <SectionRail.Content>
          {pages.map((item) => (
            <SectionRail.Item key={item.id} value={item.id}>
              {item.label}
            </SectionRail.Item>
          ))}
        </SectionRail.Content>
      </SectionRail>
    </>
  );
}

export default function ComponentDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { entry, status } = useComponentEntry(slug ?? '');

  if (status === 'loading') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Component" showBack />
        <Text size="sm" muted className="p-5">
          Loading demo…
        </Text>
      </View>
    );
  }

  if (status === 'unavailable') {
    return (
      <View className="flex-1">
        <ScreenHeader title="Unavailable" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Component unavailable</EmptyState.Title>
            <EmptyState.Description>
              This component demo could not be loaded. Try again later.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  if (!entry) {
    return (
      <View className="flex-1">
        <ScreenHeader title="Not found" showBack />
        <EmptyState>
          <EmptyState.Header>
            <EmptyState.Title>Unknown component</EmptyState.Title>
            <EmptyState.Description>
              There is no component with the slug “{slug}”.
            </EmptyState.Description>
          </EmptyState.Header>
        </EmptyState>
      </View>
    );
  }

  const versions = entry.demos.filter((demo) => demo.fullPage);
  const inline = entry.demos.filter((demo) => !demo.fullPage);

  /*
   * What becomes a page.
   *
   * Normally the inline demos, with the Versions list in front of them as an
   * index. A component whose demos are *all* full-screen has nothing to page
   * that way — the charts are the case, eight versions and no inline demo —
   * so asking for `pager` explicitly pages the versions themselves instead. A
   * page is already full height, which is the only thing those demos wanted.
   *
   * Full-bleed demos never become pages: they drop the header and draw their
   * own way back, so they need the screen and a route to themselves.
   */
  const asked = entry.layout === 'pager';
  const pagingVersions = inline.length === 0 && asked;
  const pageable = pagingVersions ? versions.filter((demo) => !demo.fullBleed) : inline;

  // One page and a rail that does nothing is the sections layout with extra
  // steps, so a single demo falls back however the entry is marked — unless
  // the versions alone run to more than one page, which is what the pager is
  // for.
  const index = !pagingVersions && versions.length > 0;
  const paged =
    entry.layout !== 'sections' &&
    (pageable.length > 1 || (index && versions.length > VERSIONS_PER_PAGE));

  return (
    <View className="flex-1">
      <ScreenHeader title={entry.name} showBack />
      {paged ? (
        <PagerLayout
          entry={entry}
          versions={versions}
          demos={pageable}
          // Only when the pages are the inline demos and the versions are
          // somewhere else. When the versions *are* the pages, a list of links
          // to them in front is a table of contents for the next swipe.
          index={index}
          // A demo marked full-page was written to own a screen, and a page is
          // one — so it gets the height rather than being centred in it.
          fills={pagingVersions}
        />
      ) : (
        <SectionsLayout entry={entry} versions={versions} inline={inline} />
      )}
    </View>
  );
}
