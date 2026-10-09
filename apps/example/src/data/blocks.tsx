import type { ComponentType } from 'react';
import { BLOCK_METADATA, type BlockSlug } from './blocks.generated';

/**
 * Blocks: whole screens composed from the library's components.
 *
 * The source lives in `packages/panelui/blocks`, beside the library rather than
 * in this app, because it is also what `panelui-cli add <block>` copies into a
 * project — the screen shown here and the file a reader installs are the same
 * file. Names and summaries are generated from the docs' blocks.json.
 *
 * Each block is loaded when its screen opens, like the component demos, so the
 * home screen does not evaluate five dashboards to draw a count.
 */
export interface BlockProps {
  /** Shows the block's back button and is called when it is pressed. */
  onBack?: () => void;
  className?: string;
}

export interface BlockEntry {
  slug: BlockSlug;
  name: string;
  summary: string;
}

type BlockLoader = () => Promise<ComponentType<BlockProps>>;

export const BLOCKS: readonly BlockEntry[] = BLOCK_METADATA;

/**
 * One loader per block. Typed by the generated slugs, so a block added to
 * blocks.json without a line here fails the typecheck rather than the screen.
 */
const LOADERS: Record<BlockSlug, BlockLoader> = {
  'boarding-pass': () =>
    import('../../../../packages/panelui/blocks/boarding-pass').then((m) => m.BoardingPassBlock),
  wallet: () => import('../../../../packages/panelui/blocks/wallet').then((m) => m.WalletBlock),
  activity: () => import('../../../../packages/panelui/blocks/activity').then((m) => m.ActivityBlock),
};

export function isBlockSlug(slug: string): slug is BlockSlug {
  return Object.prototype.hasOwnProperty.call(LOADERS, slug);
}

export function loadBlock(slug: BlockSlug) {
  const load: BlockLoader = LOADERS[slug];
  return load();
}
