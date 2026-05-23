// TC-04: lockfileVersion >= 3 gate (AC-09, D-03)
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const lockPath = resolve(__dirname, '../../package-lock.json');

describe('package-lock.json (D-03)', () => {
  it('exists', () => {
    expect(existsSync(lockPath)).toBe(true);
  });

  it('lockfileVersion >= 3', () => {
    if (!existsSync(lockPath)) return;
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    expect(lock.lockfileVersion).toBeGreaterThanOrEqual(3);
  });
});
