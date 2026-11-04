'use client';

import {
  AlignLeftIcon,
  CopyIcon,
  FileCode2Icon,
  FolderOpenIcon,
  GitBranchIcon,
  ReplaceIcon,
  SplitSquareHorizontalIcon,
  TerminalSquareIcon,
} from 'lucide-react';
import { Command } from 'panelui-web/command';

export default function CommandCompact() {
  return (
    <Command variant="compact" className="max-w-lg">
      <Command.Input placeholder="Run a command…" />
      <Command.List className="max-h-72">
        <Command.Group heading="Editor">
          <Command.Item icon={<AlignLeftIcon />} shortcut={['⇧', '⌥', 'F']}>
            Format document
          </Command.Item>
          <Command.Item icon={<ReplaceIcon />} shortcut={['⌘', 'H']}>
            Find and replace
          </Command.Item>
          <Command.Item icon={<SplitSquareHorizontalIcon />} shortcut={['⌘', '\\']}>
            Split editor right
          </Command.Item>
          <Command.Item icon={<CopyIcon />} subtitle="src/components/usage" shortcut={['⌥', '⇧', 'C']}>
            Copy relative path
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Workspace">
          <Command.Item icon={<FolderOpenIcon />} shortcut={['⌘', 'O']}>
            Open folder
          </Command.Item>
          <Command.Item icon={<FileCode2Icon />} shortcut={['⌘', 'P']}>
            Go to file
          </Command.Item>
          <Command.Item icon={<GitBranchIcon />} subtitle="main">
            Switch branch
          </Command.Item>
          <Command.Item icon={<TerminalSquareIcon />} shortcut={['⌃', '`']}>
            Toggle terminal
          </Command.Item>
        </Command.Group>
        <Command.Empty />
      </Command.List>
    </Command>
  );
}
