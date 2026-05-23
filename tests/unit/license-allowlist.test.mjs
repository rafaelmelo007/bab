// TC-02: License allowlist enforcement
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const allowlist = JSON.parse(
  readFileSync(resolve(__dirname, '../../.license-allowlist.json'), 'utf8')
);

function isAllowed(spdx) {
  const { deniedLicenses } = allowlist;
  // Treat any denied license as failing; everything else passes
  return !deniedLicenses.some(denied => spdx.includes(denied));
}

describe('license allowlist', () => {
  it('allows MIT', () => {
    expect(isAllowed('MIT')).toBe(true);
  });

  it('allows Apache-2.0', () => {
    expect(isAllowed('Apache-2.0')).toBe(true);
  });

  it('allows ISC', () => {
    expect(isAllowed('ISC')).toBe(true);
  });

  it('denies GPL-3.0', () => {
    expect(isAllowed('GPL-3.0')).toBe(false);
  });

  it('denies AGPL-3.0', () => {
    expect(isAllowed('AGPL-3.0')).toBe(false);
  });

  it('denies LGPL-2.1', () => {
    expect(isAllowed('LGPL-2.1')).toBe(false);
  });

  it('denies SSPL-1.0', () => {
    expect(isAllowed('SSPL-1.0')).toBe(false);
  });
});
