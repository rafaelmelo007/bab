// TC-12: Negative — release workflow must require id-token: write for npm publish --provenance.
// Without it, npm publish --provenance fails with a clear OIDC error.
// This test statically verifies the workflow would fail if id-token is missing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workflow = readFileSync(
  resolve(__dirname, '../../.github/workflows/release.yml'),
  'utf8'
);

describe('TC-12: provenance negative (id-token required)', () => {
  it('publish job declares id-token: write (removing it would block publish)', () => {
    // The publish job must have its own permissions block with id-token: write
    // (top-level permissions are insufficient — job-level overrides are required for OIDC)
    const publishJobSection = workflow.slice(workflow.indexOf('publish:'));
    expect(publishJobSection).toMatch(/id-token:\s*write/);
  });

  it('publish step uses --provenance flag (removing it would lose SLSA L2)', () => {
    expect(workflow).toMatch(/npm publish --provenance --access public/);
  });
});
