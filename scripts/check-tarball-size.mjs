#!/usr/bin/env node
// AC-03: packed tarball must be ≤ 2 MB (2097152 bytes)
import { execSync } from 'node:child_process';

const MAX_BYTES = 2097152;

const raw = execSync('npm pack --dry-run --json', { encoding: 'utf8' });
const [pack] = JSON.parse(raw);
const size = pack.size;

console.log(`Packed tarball size: ${size} bytes (limit: ${MAX_BYTES})`);

if (size > MAX_BYTES) {
  console.error(`FAIL: tarball size ${size} > ${MAX_BYTES} bytes (G-06 AC-03)`);
  process.exit(1);
}

console.log('PASS: tarball size within limit');
