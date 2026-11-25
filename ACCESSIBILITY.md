# Accessibility

PanelUI is a component library, so the accessibility of every app built with it starts here. A
control that a screen reader cannot name, or that cannot be reached without a pointer, fails in
every app that uses it. This page says what we aim for, how it is checked, what is not covered
yet, and how to tell us when something gets in your way.

It covers [`panelui-native`](https://www.npmjs.com/package/panelui-native) (React Native and
Expo), [`panelui-web`](https://www.npmjs.com/package/panelui-web) (React), the components copied
in by `panelui-cli`, and the documentation at [panelui.dev](https://panelui.dev).

## What we aim for

Our target is [WCAG 2.2](https://www.w3.org/TR/WCAG22/) level AA for the components and the
documentation site. A target is not a claim: PanelUI has not had an independent conformance
evaluation, and no part of it should be described as WCAG conformant on the strength of this page.

In practice, every component is expected to:

- **Be named and described to assistive technology.** Each control carries the role and state
  wiring for its platform (`accessibilityRole` and `accessibilityState` on native, ARIA roles and
  attributes on the web). A control that shows only an icon needs a label.
- **Work without a pointer.** On the web, every interactive part can be reached and used with the
  keyboard, with a visible focus ring. Overlays move focus into themselves when they open and give
  it back when they close.
- **Be large enough to press.** Native controls keep an interaction area of at least 48dp, even
  when they look smaller.
- **Respect the reader's settings.** Animations stop or simplify under reduced motion. Native text
  follows the system's text size. Surfaces drawn as translucent glass fall back to solid ones
  where the platform has no material, or when Reduce Transparency is on.
- **Keep its contrast.** Colours come from the theme tokens, and the solid text pairs in every
  built-in theme are tested against the WCAG AA normal-text ratio.

## How it is checked

Two checks run on every pull request and every push to `main`:

- **`npm run test:a11y`**, the accessibility contract gate. It holds a fixed list of test suites,
  each in a class: perception (contrast, nothing informative faded), target size, large text,
  motion control, modal isolation, structured content, chart semantics, accessible actions, web
  keyboard behaviour and native journeys. The gate fails if any class, suite or required test is
  removed, so the coverage cannot quietly shrink.
- **`npm run test:a11y:browser`**, which builds the docs site and runs automated WCAG 2.2 A and AA
  checks against the home page, the docs index and a component page.

## Known limitations

These are the gaps we know about. If you hit one, a report still helps us decide what to fix first.

- **No audit.** Nothing here has been evaluated by an accessibility specialist or tested end to end
  with every assistive technology. The checks above are automated or contract tests.
- **The browser check covers three routes.** The docs site has hundreds of pages. Pages other than
  the three checked, and the interactive demos on them, have not each been tested.
- **Web components are newer than the native ones.** `panelui-web` is still below 1.0, and its
  components have keyboard and screen reader behaviour designed in, but less test coverage than the
  native library.
- **Native controls drawn by the platform.** Components rendered by SwiftUI or Jetpack Compose
  (the `native` props) take their accessibility from the platform. We do not control their labels,
  focus order or text scaling beyond what we pass to them.
- **Charts are visual first.** Charts expose a text summary to assistive technology, but a reader
  who cannot see the chart gets the summary, not every data point.

## Reporting a barrier

If something in PanelUI, or on panelui.dev, makes a task harder or impossible for you, please tell
us. You do not need to say anything about yourself or any disability, and you do not need to send
screenshots or recordings.

- **[Open an accessibility report](https://github.com/panel-ui/PanelUI/issues/new?template=accessibility.yml).**
  The form asks what you were doing, what got in the way and, if you want to say, what you were
  using.
- **Prefer not to use the form?** Start a thread in
  [Discussions](https://github.com/panel-ui/PanelUI/discussions) or open a plain issue. Any of them
  reaches us.
- **A security problem** that happens to involve accessibility goes through a
  [private security advisory](https://github.com/panel-ui/PanelUI/security/advisories/new), not a
  public issue.

## What happens next

1. We reply to say the report has been read, and label it `accessibility`.
2. We try to reproduce it. If we need more detail, we ask, and we do not ask for anything you have
   chosen not to share.
3. A barrier that stops someone completing a task is treated as a bug, not a feature request. It is
   fixed in a release and noted in the changelog.
4. If it cannot be fixed soon, we say why on the issue and, where there is one, describe a
   workaround and add it to Known limitations above.

## For contributors and coding agents

These apply to every change, whether a person or an agent wrote it. The repository's
`CLAUDE.md` and `CONTRIBUTING.md` hold the rest of the project's rules.

- Give every new component its role and state wiring, a label for any icon-only control, and
  keyboard support on the web.
- Use theme tokens for colour. Do not hard-code a colour that has not been checked for contrast in
  both light and dark.
- Honour reduced motion for any new animation.
- Run `npm run test:a11y` before pushing. Add a suite to the gate when a component introduces a
  behaviour it does not yet cover, and never remove one to make it pass.
- Document accessibility behaviour on the component's docs page, in plain language: what a screen
  reader announces and which keys do what.

## Ownership and feedback

The project's maintainers own this statement and update it as the library changes. If something
on this page is wrong, out of date or unclear, open an issue or a pull request against
`ACCESSIBILITY.md`. Corrections are as welcome as reports.
