'use client';

import { ArrowRightIcon, HammerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavigationMenu } from 'panelui-web/navigation-menu';

const STATUSES = [
  {
    id: 'open',
    icon: <span className="size-2 rounded-full bg-success" />,
    text: 'Taking contributions',
    action: 'Open an issue',
  },
  {
    id: 'building',
    icon: <HammerIcon />,
    text: 'In progress: Date Picker',
    action: 'See it',
    progress: 0.7,
  },
  {
    id: 'soon',
    icon: <span className="size-2 rounded-[3px] bg-info" />,
    text: 'Coming soon: Data Grid',
    action: 'Follow',
  },
];

export default function NavigationMenuStatusDemo() {
  const [index, setIndex] = useState(0);
  const [scrolling, setScrolling] = useState(false);

  // A new status every few seconds.
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % STATUSES.length), 4000);
    return () => window.clearInterval(timer);
  }, []);

  // Tucked away while the page moves, and back once it settles.
  useEffect(() => {
    let settle = 0;
    const onScroll = () => {
      setScrolling(true);
      window.clearTimeout(settle);
      settle = window.setTimeout(() => setScrolling(false), 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(settle);
    };
  }, []);

  const status = STATUSES[index]!;

  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenu.Brand
        href="#"
        aria-label="Home"
        icon={<img src="https://avatars.githubusercontent.com/u/127331761?v=4" alt="" />}
      />
      <NavigationMenu.List>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#" active>
            Docs
          </NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Components</NavigationMenu.Link>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Blocks</NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Status
        id={status.id}
        icon={status.icon}
        progress={status.progress}
        hidden={scrolling}
        action={
          <a href="#" className="inline-flex items-center gap-1">
            {status.action}
            <ArrowRightIcon className="size-3.5 rtl:-scale-x-100" />
          </a>
        }
      >
        {status.text}
      </NavigationMenu.Status>
    </NavigationMenu>
  );
}
