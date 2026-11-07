import { ScrollHeader } from 'panelui-web/scroll-header';

export default function ScrollHeaderThumb() {
  return (
    <div className="w-72 shrink-0 overflow-hidden rounded-2xl border bg-background">
      <ScrollHeader barHeight={40}>
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
