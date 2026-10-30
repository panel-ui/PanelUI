---
name: panelui-web
description: Build React web UIs with PanelUI's web collection — adding its components from the shadcn registry or from npm, colouring them from the theme, and composing them into framed panels. Applies when working in a React project that has shadcn/ui set up with a @panelui registry or has panelui-web installed, when the user mentions PanelUI on the web, or when they ask for a dotted globe, a KPI card, a kanban board, a node graph, an activity grid or a feedback dialog in React.
license: MIT
compatibility: React 19 with Tailwind CSS v4 and shadcn/ui tokens. Not for React Native — the app library is a separate skill, panelui.
metadata:
  author: Khalid Abdi
  version: 0.10.1
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx shadcn@latest *)
---

# PanelUI for the web

Components for React, built on shadcn/ui. They are styled with Tailwind CSS v4 on the theme tokens
a shadcn project already has, so they take the project's colours, radii and dark mode without any
setup of their own.

This is the web collection. PanelUI's React Native library is a different package with a different
skill; nothing here runs in React Native.

## Before writing any UI

1. **Read [components.md](components.md)** to see what exists. Use a component from it before
   writing a custom one.
2. **Read the component's own file** in `components/` before using it. It has the import line,
   every part and every prop, read from the source. Do not guess a prop.
3. **Check how the project installs**: a `components.json` with a `@panelui` registry means
   components are copied in with the shadcn CLI; `panelui-web` in `package.json` means they are
   imported from the package. See [setup.md](setup.md).

## Rules

- **Colour is a role, never a value.** Every component that has a colour takes
  `color="primary" | "info" | "success" | "warning" | "destructive"`. Do not pass hex values or
  Tailwind palette classes for a component's own colour. See [theming.md](theming.md).
- **Pick the role by meaning.** `success` for good, `warning` for attention, `destructive` for
  bad, `info` for neutral emphasis, `primary` otherwise. Do not give every component on a screen
  the same colour.
- **Give data its own text.** Labels, counts and names in a component come from the project's
  data. Do not reuse the sample text from these files.
- **Compound parts and Server Components.** In a file with `"use client"`, write parts with a dot:
  `Planet.Globe`. A Server Component cannot read a property off a client module, so there every
  part is imported by name: `PlanetGlobe`. `Kpi` is not a client module and can be dotted
  anywhere.
- **Lead with a frame.** A component shown as a panel sits in a frame: a muted band with a title,
  round an inner bordered card. See the examples in each component's file.
- **Label what a screen reader needs.** Components take `label`, and where a value is shown,
  `valueText`. Pass them: the defaults are generic.
