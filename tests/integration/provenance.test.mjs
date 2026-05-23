// TC-08: Provenance attestation — verifies --provenance flag is present in publish step
// This is a static analysis test (we can't call npm view against the real registry in CI unit tests).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflow = readFileSync(
  resolve(__dirname, '../../.github/workflows/release.yml'),
  'utf8'
);

describe('provenance (SLSA L2)', () => {
  it('release.yml runs npm publish --provenance', () => {
    expect(workflow).toMatch(/npm publish --provenance/);
  });

  it('release.yml sets id-token: write permission', () => {
    expect(workflow).toMatch(/id-token:\s*write/);
  });

  it('release.yml sets contents: write permission', () => {
    expect(workflow).toMatch(/contents:\s*write/);
  });
});
