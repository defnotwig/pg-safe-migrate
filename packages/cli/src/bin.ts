// --------------------------------------------------------------------------
// pg-safe-migrate CLI — Binary entry point
// --------------------------------------------------------------------------
import { createProgram } from './index.js';
import { printError } from './output.js';

const program = createProgram();

try {
  await program.parseAsync(process.argv);
} catch (err) {
  if (err && typeof err === 'object' && 'exitCode' in err) {
    // Commander exit override — already handled
    process.exit(Number(err.exitCode) || 1);
  }
  printError(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
