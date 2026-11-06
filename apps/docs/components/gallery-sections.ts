/**
 * The sections, in the order the page prints them, each with the sentence that
 * goes under its heading.
 *
 * Kept in one file and not in the generators: both the app's index and the web
 * collection's print them, and having the headings in two places is how they
 * drift.
 */
export const SECTIONS: [string, string, string][] = [
  ['actions', 'Actions', 'The things a screen can be told to do, and the controls that ask.'],
  ['forms', 'Forms and input', 'Everything that takes a value from someone and hands it back typed.'],
  ['overlays', 'Overlays', 'Surfaces that arrive over the page and leave again.'],
  ['navigation', 'Navigation', 'Moving between places, and showing where you are in them.'],
  ['layout', 'Layout and structure', 'The surfaces the rest of it sits on.'],
  ['data', 'Data', 'Rows, sequences and numbers, laid out to be read.'],
  ['charts', 'Charts', 'Series, proportions and flows, drawn to be read.'],
  ['feedback', 'Feedback and status', 'Saying what happened, what is happening, and what is missing.'],
  ['media', 'Media and motion', 'Pictures, conversation and things that move.'],
  ['ai', 'AI components', 'The parts an assistant interface is built from.'],
];
