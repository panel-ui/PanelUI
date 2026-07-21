/**
 * Terminal output and prompts.
 *
 * Hand-rolled rather than pulled from npm on purpose: this package has zero
 * dependencies, so running it with npx downloads a few kilobytes and nothing
 * else. Colour and prompting are not worth a dependency tree.
 */
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const useColour = stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code) => (text) => (useColour ? `[${code}m${text}[0m` : text);

export const bold = wrap('1');
export const dim = wrap('2');
export const red = wrap('31');
export const green = wrap('32');
export const yellow = wrap('33');
export const cyan = wrap('36');

export function info(message) {
  console.log(message);
}

export function step(message) {
  console.log(`${cyan('›')} ${message}`);
}

export function success(message) {
  console.log(`${green('✓')} ${message}`);
}

export function warn(message) {
  console.log(`${yellow('!')} ${message}`);
}

export function error(message) {
  console.error(`${red('✗')} ${message}`);
}

/** A fatal, expected failure — a message, not a stack trace. */
export class CliError extends Error {}

export function fail(message, hint) {
  const err = new CliError(message);
  err.hint = hint;
  throw err;
}

/**
 * Yes/no prompt. Returns the default when not attached to a TTY, so the CLI
 * still works in CI without hanging on input nobody can give it.
 */
export async function confirm(question, { defaultValue = true, assumeYes = false } = {}) {
  if (assumeYes) return true;
  if (!stdin.isTTY) return defaultValue;

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const suffix = defaultValue ? 'Y/n' : 'y/N';
    const answer = (await rl.question(`${cyan('?')} ${question} ${dim(`(${suffix})`)} `)).trim();
    if (!answer) return defaultValue;
    return /^y(es)?$/i.test(answer);
  } finally {
    rl.close();
  }
}

/** Free-text prompt with a default. */
export async function ask(question, defaultValue) {
  if (!stdin.isTTY) return defaultValue;

  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const answer = (await rl.question(`${cyan('?')} ${question} ${dim(`(${defaultValue})`)} `)).trim();
    return answer || defaultValue;
  } finally {
    rl.close();
  }
}

/** Shows what would be appended to a file, so a patch is never a surprise. */
export function printAddition(filePath, lines) {
  console.log(`\n${bold(filePath)}`);
  for (const line of lines) console.log(green(`+ ${line}`));
  console.log('');
}

/** "did you mean" for a mistyped item name, by edit distance. */
export function nearest(name, candidates) {
  let best = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    const score = distance(name, candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  // Past a third of the length the suggestion is noise rather than help.
  return bestScore <= Math.max(2, Math.floor(name.length / 3)) ? best : null;
}

function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }

  return rows[a.length][b.length];
}
