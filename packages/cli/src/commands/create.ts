// --------------------------------------------------------------------------
// pg-safe-migrate CLI — create command
// --------------------------------------------------------------------------
import { writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { printSuccess, printInfo } from '../output.js';

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/(?:^_)|(?:_$)/g, '');
}

export async function createCommand(
  name: string,
  opts: { dir?: string; withDown?: boolean; sql?: boolean },
) {
  const migrationsDir = resolve(opts.dir ?? './migrations');
  const timestamp = generateTimestamp();
  const slug = slugify(name);
  const id = `${timestamp}_${slug}`;

  const upFile = join(migrationsDir, `${id}.sql`);
  const upContent = `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n-- Write your UP migration SQL here\n`;

  if (!existsSync(migrationsDir)) {
    printInfo(`Creating migrations directory: ${migrationsDir}`);
    const { mkdir } = await import('node:fs/promises');
    await mkdir(migrationsDir, { recursive: true });
  }

  await writeFile(upFile, upContent, 'utf-8');
  printSuccess(`Created: ${upFile}`);

  if (opts.withDown) {
    const downFile = join(migrationsDir, `${id}.down.sql`);
    const downContent = `-- Rollback migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n-- Write your DOWN migration SQL here\n`;
    await writeFile(downFile, downContent, 'utf-8');
    printSuccess(`Created: ${downFile}`);
  }
}
