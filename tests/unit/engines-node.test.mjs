// TC-11: engines.node parser — asserts package.json matches PRD §7.4
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

const REQUIRED = '^20.10 || ^22 || ^24';

describe('engines.node declaration', () => {
  it('matches PRD §7.4 verbatim', () => {
    expect(pkg?.engines?.node).toBe(REQUIRED);
  });
});
