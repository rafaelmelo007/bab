// TC-01: npm pack --dry-run size parser
import { describe, it, expect } from 'vitest';

const MAX_BYTES = 2097152;

function parseTarballSize(jsonOutput) {
  const [pack] = JSON.parse(jsonOutput);
  return pack.size;
}

describe('tarball size gate', () => {
  it('returns integer for well-formed pack JSON', () => {
    const fixture = JSON.stringify([{ name: 'ulm', size: 1234567, files: [] }]);
    expect(parseTarballSize(fixture)).toBe(1234567);
  });

  it('passes when size is exactly 2 MB', () => {
    const fixture = JSON.stringify([{ size: MAX_BYTES }]);
    expect(parseTarballSize(fixture)).toBeLessThanOrEqual(MAX_BYTES);
  });

  it('fails gate when size exceeds 2 MB', () => {
    const fixture = JSON.stringify([{ size: MAX_BYTES + 1 }]);
    expect(parseTarballSize(fixture)).toBeGreaterThan(MAX_BYTES);
  });
});
