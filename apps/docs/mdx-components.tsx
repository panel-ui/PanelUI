import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { ComponentGallery } from '@/components/component-gallery';
import { Diagram } from '@/components/diagram';
import { IconGallery } from '@/components/icon-gallery';
import { InstallTabs } from '@/components/install-tabs';
import { Preview } from '@/components/preview';
import { Platform } from '@/components/platform';
import { PreviewVideo } from '@/components/preview-video';
import type { MDXComponents } from 'mdx/types';

/** Components available to every MDX page without importing them. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Callout,
    ComponentGallery,
    Step,
    Steps,
    Diagram,
    IconGallery,
    InstallTabs,
    Preview,
    PreviewVideo,
    Platform,
    ...components,
  };
}
