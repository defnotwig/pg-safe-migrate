import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry — no shebang
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
  },
  // CLI binary entry — shebang added
  {
    entry: ['src/bin.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
]);
