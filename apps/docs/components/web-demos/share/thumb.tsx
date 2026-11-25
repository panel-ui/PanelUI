export default function ShareThumb() {
  return (
    <div
      className="w-60 scale-90 rounded-[24px] bg-[color-mix(in_oklab,var(--popover),black_5%)] p-1.5 shadow-lg ring-1 ring-foreground/[0.06] dark:bg-[color-mix(in_oklab,var(--popover),black_14%)]"
      aria-hidden="true"
    >
      <div className="flex flex-col gap-2.5 rounded-[18px] bg-popover p-3">
        <p className="text-[13px] font-semibold">Share “Spring lookbook”</p>
        <div className="flex h-8 items-center rounded-xl border px-2.5 text-xs text-muted-foreground">
          Add people by email
        </div>
        {['Ines Duarte', 'Sam Whitlock'].map((name) => (
          <div key={name} className="flex items-center gap-2 text-xs">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground">
              {name
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </span>
            {name}
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 px-1 pt-1.5">
        <span className="flex h-8 flex-1 items-center justify-center rounded-full bg-popover text-xs shadow-xs">
          Copy link
        </span>
        <span className="flex h-8 flex-1 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          Send invite
        </span>
      </div>
    </div>
  );
}
