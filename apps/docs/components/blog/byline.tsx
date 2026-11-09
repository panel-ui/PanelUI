import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Author } from '@/lib/blog';
import { cn } from '@/lib/utils';

/** "Khalid Abdi" → "KA", shown while the avatar loads or if it fails. */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Who wrote a post and when. `linked` makes the name a link to the author's
 * profile — on the post itself, not on a card, where the whole card is already
 * a link and a second one inside it would be a nested anchor.
 */
export function Byline({
  author,
  date,
  detail,
  size = 'sm',
  linked = false,
  className,
}: {
  author: Author;
  date: string;
  /** A second fact after the date, such as the reading time. */
  detail?: string;
  size?: 'sm' | 'md';
  linked?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Avatar className={size === 'md' ? 'size-10' : 'size-7'}>
        <AvatarImage src={author.avatar} alt="" />
        <AvatarFallback className="text-xs">{initialsOf(author.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col text-sm leading-tight">
        {linked ? (
          <Link
            href={`https://github.com/${author.github}`}
            target="_blank"
            rel="noreferrer author"
            className="font-medium hover:underline underline-offset-4"
          >
            {author.name}
          </Link>
        ) : (
          <span className="font-medium">{author.name}</span>
        )}
        <span className="text-muted-foreground">
          {date}
          {detail ? ` · ${detail}` : null}
        </span>
      </div>
    </div>
  );
}
