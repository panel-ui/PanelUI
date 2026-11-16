'use client';

import { BookOpenIcon, CoinsIcon, LayoutTemplateIcon, RocketIcon, ScrollTextIcon, SparklesIcon } from 'lucide-react';
import { NavigationMenu } from 'panelui-web/navigation-menu';

export default function NavigationMenuOverview() {
  return (
    <NavigationMenu aria-label="Main">
      <NavigationMenu.Brand href="#" icon={<SparklesIcon />} aria-label="Home" />
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
        <NavigationMenu.Item value="explore">
          <NavigationMenu.Trigger>Explore</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[22rem]">
            <NavigationMenu.Card href="#" icon={<RocketIcon />} tone="primary" eyebrow="Start here">
              Install in one command
            </NavigationMenu.Card>
            <NavigationMenu.Card href="#" icon={<CoinsIcon />} tone="success" eyebrow="New in 0.18">
              Currency Input
            </NavigationMenu.Card>
            <NavigationMenu.Group label="Resources">
              <NavigationMenu.Link href="#" icon={<LayoutTemplateIcon />} description="Whole screens to copy in">
                Templates
              </NavigationMenu.Link>
              <NavigationMenu.Link href="#" icon={<ScrollTextIcon />} description="What changed in each release">
                Changelog
              </NavigationMenu.Link>
              <NavigationMenu.Link href="#" icon={<BookOpenIcon />} description="Long reads on how it is built">
                Blog
              </NavigationMenu.Link>
            </NavigationMenu.Group>
            <NavigationMenu.Footer>
              <NavigationMenu.Hint keys={['↑', '↓']}>Move</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['↵']}>Open</NavigationMenu.Hint>
              <NavigationMenu.Hint keys={['Esc']}>Close</NavigationMenu.Hint>
            </NavigationMenu.Footer>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu>
  );
}
