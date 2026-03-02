// --------------------------------------------------------------------------
// pg-safe-migrate CLI — Output formatting
// --------------------------------------------------------------------------

const isCI = !!(process.env['CI'] || process.env['GITHUB_ACTIONS']);
const NO_COLOR = !!process.env['NO_COLOR'] || isCI;

function color(code: number, text: string): string {
  if (NO_COLOR) return text;
  return `\x1b[${code}m${text}\x1b[0m`;
}

export const fmt = {
  bold: (t: string) => color(1, t),
  red: (t: string) => color(31, t),
  green: (t: string) => color(32, t),
  yellow: (t: string) => color(33, t),
  cyan: (t: string) => color(36, t),
  dim: (t: string) => color(2, t),
};

export function printSuccess(msg: string) {
  console.log(fmt.green('✓') + ' ' + msg);
}

export function printError(msg: string) {
  console.error(fmt.red('✗') + ' ' + msg);
}

export function printWarning(msg: string) {
  console.warn(fmt.yellow('⚠') + ' ' + msg);
}

export function printInfo(msg: string) {
  console.log(fmt.cyan('ℹ') + ' ' + msg);
}

export function printHeader(title: string) {
  console.log('\n' + fmt.bold(title));
  console.log(fmt.dim('─'.repeat(Math.min(title.length + 4, 60))));
}
