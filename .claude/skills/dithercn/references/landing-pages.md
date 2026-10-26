# Designing a landing page around a dither

A working dither on a generic page still reads as generated. The dither has to be the page's identity, drawn from what the product is, and the page around it has to be specific, quiet and true. Do this before you write a field.

## 1. Know the product

The page is for the product in this repo, not for dithercn. dithercn is the tool you build with: don't name it on the page, and don't make the page about dithering.

Read the README, `package.json`, the existing pages and any copy in the repo. Write yourself a short brief:

- What the product is and who it is for, in one sentence, in the product's own words.
- The one thing a visitor should do (install, sign up, download, book).
- The facts you can use: features, platforms, prices, numbers. Only facts that are in the repo or the user's message.

If there is no product to read about, ask the user what the page is for. If nobody can answer, pick something plausible, keep it modest, and say what you picked.

## 2. Find the dither in the subject

The hero dither should be something only this product would show. Take it from the product's own world and render that as a field, an image or a chart:

| The product is about             | A dither drawn from it                                                         |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Maps, outdoors, travel           | Contour lines of real-looking terrain, a route over them                       |
| Audio, music, voice              | A waveform or spectrum, ridgelines stacked like a spectrogram                  |
| Money, trading, analytics        | A price line or volume ridges, a dense band where activity is                  |
| Infrastructure, uptime, networks | Packets along paths, a grid of hosts, a pulse at the incident                  |
| Weather, climate, energy         | Isobars, a radar sweep, heat rising off a surface                              |
| Sleep, health, calm              | A slow breathing ring, a tide line, a night sky                                |
| Food, drink, physical goods      | The product photo itself through `ditherImage`, steam, grain, light on a table |
| Space, science, research         | An eclipse, a starfield, orbits, a particle trace                              |
| A developer tool or API          | The product's real output: its chart, its diagram, its data, dithered          |

A soft glow or noise field fits almost any product, which is why it says nothing about this one. Use one only as a supporting layer.

## 3. Compose the page

Spend the boldness in one place: the hero dither. Keep everything else quiet and disciplined.

**Pick the hero that fits**, not the split layout by default:

- **Full-bleed field.** The dither fills the hero and the headline sits on cleared ground (see [recipes.md](recipes.md#a-hero-that-clears-its-headline)).
- **The product shot.** A real product photo or screenshot, dithered with `ditherImage`, large, with the headline beside or above it.
- **One big number or object.** A glow, ring or gauge behind a real figure the product has, with the label in HTML.
- **A live demo.** The dither responds to one control (a slider, a toggle, a value), so the page shows what the product does.

**Build the rest from the content.** A section exists because the product has something to say there, not because landing pages have one.

- Show, don't list. One wide section that shows a feature working beats three cards that name three features.
- Vary the rhythm: a wide section, then a narrow one; text left, then right. Avoid rows of identical cards.
- Use at most two or three dithers on the page, each tied to content: the hero, a chart of real data, a dithered product photo, one section break.
- One accent colour at most, from the dither palette. The dither ink carries the page's colour; buttons and text stay in the theme.
- Typography carries the personality. One family is fine. Set a clear scale with weight and size, sentence case throughout.
- Keep vertical rhythm even (about `py-24` to `py-32` between sections on desktop, `py-16` on a phone) and line lengths under 80 characters.

## 4. Write true, plain copy

- The headline says what the product does for whom, in plain words. No wordplay that needs the subhead to explain it.
- The subhead adds two specifics: how it works, what you get.
- Buttons say what happens: "Download for Mac", "Start a free trial", "Read the docs".
- Use only facts from step 1. No invented stats, testimonials, customer logos, ratings or prices. If a section needs a number the product doesn't have, drop the section.

## 5. Don't ship the tells

These make a page read as generated, whatever the dither looks like:

- An all-caps, letter-spaced label above every heading, or monospace micro-labels used as decoration.
- Numbered markers (01, 02, 03) on things that aren't a sequence.
- One word in the headline set apart in italic, grey or colour; a serif display line followed by a grey second line.
- A row of three identical feature cards; a stats strip with invented numbers.
- Captions or pills laid over a visual ("Field study 01", "Signal / in motion"); a round arrow button on a card that goes nowhere.
- A fake product UI built from divs; fake testimonials; placeholder logos.
- A glowing orb or gradient in a rounded card as the whole hero.
- Em dashes, "elevate", "seamless", "unleash", "next-gen", an arrow on every link, decorative coloured dots.

## 6. Look at it as a visitor

Screenshot the whole page at 1440px and 390px, in light and dark mode. Go through every item in section 5 against the screenshots and the code, one by one, and fix each one you find; search the code for `—` and `uppercase`. Then answer honestly:

- In five seconds, can you tell what the product is and what to do next?
- Is the dither the first thing you notice, and does it belong to this product?
- Would this page be mistaken for any other product's page? If yes, the hero or the copy is generic: go back to step 2.
- Remove one element that isn't earning its place.

Then run every check in [quality.md](quality.md).
