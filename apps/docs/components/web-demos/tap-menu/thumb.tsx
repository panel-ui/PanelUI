import { CalendarPlusIcon, FileTextIcon, UserPlusIcon } from 'lucide-react';

const TILES = [
  { icon: CalendarPlusIcon, label: 'Book a session', lit: false },
  { icon: FileTextIcon, label: 'Send a quote', lit: true },
  { icon: UserPlusIcon, label: 'Add a client', lit: false },
];

export default function TapMenuThumb() {
  return (
    <div className="flex flex-col items-center gap-3" aria-hidden="true">
      <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
        <svg
          viewBox="0 0 24 24"
          className="size-4 rotate-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <div className="flex gap-2">
        {TILES.map(({ icon: Icon, label, lit }) => (
          <span
            key={label}
            className={`flex h-24 w-22 flex-col justify-between rounded-2xl p-2.5 text-[0.8125rem] leading-tight font-medium ring-1 ring-foreground/[0.06] ${lit ? '-translate-y-0.5 bg-popover shadow-lg shadow-black/[0.07]' : 'bg-popover/60'}`}
          >
            <Icon className="size-4 text-foreground/80" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
