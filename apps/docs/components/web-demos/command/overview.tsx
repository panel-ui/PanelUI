'use client';

import {
  BookOpenIcon,
  BugIcon,
  StarIcon,
  KeyboardIcon,
  EqualIcon,
  BoxIcon,
  ClipboardListIcon,
  MoonStarIcon,
  PackagePlusIcon,
  PaletteIcon,
  RocketIcon,
  SparklesIcon,
  TerminalIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Command } from 'panelui-web/command';

/** An app's picture: an icon on a tile in one of the theme's colours. */
function Tile({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`flex size-full items-center justify-center ${tone === 'bg-foreground' ? 'text-background' : 'text-white'} [&_svg]:size-3.5 ${tone}`}>{children}</span>;
}

export default function CommandOverview() {
  return (
    <Command className="max-w-2xl">
      <Command.Input
        placeholder="Search components and actions…"
        icon={
          <>
            <img src="/logo-light.png" alt="" className="dark:hidden" />
            <img src="/logo-dark.png" alt="" className="hidden dark:block" />
          </>
        }
      >
        <Command.InputAction keys={['⇥']}>Ask AI</Command.InputAction>
      </Command.Input>
      <Command.List className="max-h-[27rem]">
        <Command.Group>
          <Command.Item icon={<Tile tone="bg-destructive"><SparklesIcon /></Tile>} subtitle="v0.12.0" kind="Changelog">
            See what’s new
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Suggestions">
          <Command.Item icon={<Tile tone="bg-info"><BoxIcon /></Tile>} subtitle="Components" kind="Page">
            Model Picker
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><ClipboardListIcon /></Tile>} subtitle="Components" kind="Page">
            Usage
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-success"><PaletteIcon /></Tile>} subtitle="Theming" kind="Guide" keywords={['colours', 'tokens']}>
            Choose a theme
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-foreground"><TerminalIcon /></Tile>} subtitle="Installation" kind="Guide">
            Add with the CLI
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Actions">
          <Command.Item icon={<Tile tone="bg-info"><PackagePlusIcon /></Tile>} subtitle="npm" kind="Command" shortcut={['⌘', 'I']}>
            Install panelui-web
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-foreground"><MoonStarIcon /></Tile>} kind="Command" keywords={['dark', 'light', 'appearance']}>
            Switch theme
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-success"><RocketIcon /></Tile>} subtitle="Templates" badge="New" kind="Command">
            Start a new app
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><BookOpenIcon /></Tile>} subtitle="Reference" kind="Page">
            Read the API reference
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-destructive"><BugIcon /></Tile>} subtitle="GitHub" kind="Link">
            Report a bug
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-warning"><StarIcon /></Tile>} subtitle="panel-ui/PanelUI" kind="Link">
            Star the repository
          </Command.Item>
          <Command.Item icon={<Tile tone="bg-info"><KeyboardIcon /></Tile>} kind="Command" shortcut={['⌘', '/']}>
            Keyboard shortcuts
          </Command.Item>
        </Command.Group>
        <Command.Empty>No components or pages match</Command.Empty>
      </Command.List>
      <Command.Footer
        lead={
          <Command.FooterButton aria-label="Settings">
            <EqualIcon />
          </Command.FooterButton>
        }
      >
        <Command.FooterAction keys={['↵']}>Open Page</Command.FooterAction>
        <Command.FooterDivider />
        <Command.FooterAction keys={['⌘', 'K']}>Actions</Command.FooterAction>
      </Command.Footer>
    </Command>
  );
}
