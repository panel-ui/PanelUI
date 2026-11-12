import { ScrollArea } from 'panelui-web/scroll-area';

const LINES = ['Inbox', 'Drafts', 'Sent', 'Scheduled', 'Archive', 'Spam', 'Bin', 'Receipts', 'Travel'];

export default function ScrollAreaThumb() {
  return (
    <ScrollArea className="h-40 w-48 rounded-xl border bg-background">
      <ul className="flex flex-col py-1">
        {LINES.map((line) => (
          <li key={line} className="px-3 py-1.5 text-sm">
            {line}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
