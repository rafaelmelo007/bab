#!/usr/bin/env node
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const result = await build({
  entryPoints: ['src/index.ts'],
  outfile: 'bin/ulm.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  banner: {
    js: '#!/usr/bin/env node',
  },
  // Externalize Node built-ins; they are never bundled
  packages: 'external',
  metafile: true,
});

// T-05: bundle integrity check — no require() calls, valid ESM
const src = readFileSync('bin/ulm.mjs', 'utf8');
if (/\brequire\s*\(/.test(src)) {
  console.error('ERROR: bin/ulm.mjs contains require() calls — not pure ESM');
  process.exit(1);
}

try {
  execSync('node --check bin/ulm.mjs', { stdio: 'inherit' });
} catch {
  console.error('ERROR: bin/ulm.mjs failed node --check');
  process.exit(1);
}

console.log('build ok — bin/ulm.mjs');
