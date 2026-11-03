import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { ComponentGallery } from '@/components/component-gallery';
import { WebComponentGallery } from '@/components/web-component-gallery';
import { ComponentPreview } from '@/components/component-preview';
import { Diagram } from '@/components/diagram';
import { FrameworkGrid } from '@/components/framework-grid';
import { IconGallery } from '@/components/icon-gallery';
import { InstallTabs } from '@/components/install-tabs';
import { Preview } from '@/components/preview';
import { Platform } from '@/components/platform';
import { PreviewVideo } from '@/components/preview-video';
import { RegistrySource } from '@/components/registry-source';
import { SkillDirectory } from '@/components/skills/skill-directory';
import { SkillHeader } from '@/components/skills/skill-header';
import { SkillSource } from '@/components/skills/skill-source';
import type { MDXComponents } from 'mdx/types';

/** Components available to every MDX page without importing them. */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Callout,
    ComponentGallery,
    WebComponentGallery,
    ComponentPreview,
    Step,
    Steps,
    Diagram,
    FrameworkGrid,
    IconGallery,
    InstallTabs,
    Preview,
    PreviewVideo,
    RegistrySource,
    SkillDirectory,
    SkillHeader,
    SkillSource,
    Platform,
    ...components,
  };
}
