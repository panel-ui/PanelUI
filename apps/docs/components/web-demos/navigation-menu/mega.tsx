'use client';

import {
  BarChart3Icon,
  BlocksIcon,
  BoxIcon,
  BrushIcon,
  GitPullRequestIcon,
  MessagesSquareIcon,
  PaletteIcon,
  ShapesIcon,
  TerminalIcon,
} from 'lucide-react';
import { Button } from 'panelui-web/button';
import { NavigationMenu } from 'panelui-web/navigation-menu';

export default function NavigationMenuMega() {
  return (
    <NavigationMenu variant="bar" aria-label="Site">
      <NavigationMenu.Brand href="#" className="ps-2">
        PanelUI
      </NavigationMenu.Brand>
      <NavigationMenu.List>
        <NavigationMenu.Item value="library">
          <NavigationMenu.Trigger>Library</NavigationMenu.Trigger>
          <NavigationMenu.Content className="grid w-[34rem] grid-cols-2 gap-1">
            <NavigationMenu.Link href="#" icon={<BoxIcon />} description="Eighty-four parts for React and Tailwind">
              Components
            </NavigationMenu.Link>
            <NavigationMenu.Link href="#" icon={<BarChart3Icon />} description="Line, bar, sankey and twenty more">
              Charts
            </NavigationMenu.Link>
            <NavigationMenu.Link href="#" icon={<BlocksIcon />} description="Screens assembled from the parts">
              Blocks
            </NavigationMenu.Link>
            <NavigationMenu.Link href="#" icon={<ShapesIcon />} description="One stroke weight, every size">
              Icons
            </NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="learn">
          <NavigationMenu.Trigger>Learn</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[26rem]">
            <NavigationMenu.Card href="#" icon={<TerminalIcon />} tone="primary" eyebrow="Ten minutes">
              Your first screen
            </NavigationMenu.Card>
            <NavigationMenu.Group label="Guides">
              <NavigationMenu.Link href="#" icon={<PaletteIcon />} description="Tokens, themes and dark mode">
                Theming
              </NavigationMenu.Link>
              <NavigationMenu.Link href="#" icon={<BrushIcon />} description="Building from parts, not styled divs">
                Composition
              </NavigationMenu.Link>
            </NavigationMenu.Group>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item value="community">
          <NavigationMenu.Trigger>Community</NavigationMenu.Trigger>
          <NavigationMenu.Content className="w-[20rem]">
            <NavigationMenu.Link href="#" icon={<GitPullRequestIcon />} description="Issues, pull requests, releases">
              GitHub
            </NavigationMenu.Link>
            <NavigationMenu.Link href="#" icon={<MessagesSquareIcon />} description="Questions and show-and-tell">
              Discussions
            </NavigationMenu.Link>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link href="#">Pricing</NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
      <NavigationMenu.Actions className="ms-auto">
        <Button variant="ghost" size="sm">
          Sign in
        </Button>
        <Button size="sm">Get started</Button>
      </NavigationMenu.Actions>
    </NavigationMenu>
  );
}
