/**
 * Credential redaction module — F-08
 * Scrubs credential patterns from strings before printing to stderr/stdout.
 */

export const REDACT_VERSION = 1;

// Default redaction patterns
const DEFAULT_PATTERNS: RegExp[] = [
  /Bearer [A-Za-z0-9._-]+/g,
  /Authorization: .*/gm,
  /https:\/\/[^\s]*[?&](access_token|refresh_token)=[^\s]*/g,
  /Basic [A-Za-z0-9+/=]{20,}/g,
];

let _extraPatterns: RegExp[] = [];
let _extraParsed = false;

function parseExtraPatterns(): RegExp[] {
  if (_extraParsed) return _extraPatterns;
  _extraParsed = true;

  const raw = process.env['BAB_REDACT_EXTRA'];
  if (!raw) return (_extraPatterns = []);

  const patterns: RegExp[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      patterns.push(new RegExp(trimmed, 'g'));
    } catch {
      // Invalid regex: warn once, skip
      process.stderr.write(`[bab] BAB_REDACT_EXTRA: invalid regex pattern skipped: ${trimmed}\n`);
    }
  }
  return (_extraPatterns = patterns);
}

/**
 * Scrub a single line (or multi-line string) through all redaction patterns.
 */
export function scrub(line: string): string {
  let result = line;
  for (const pattern of DEFAULT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  for (const pattern of parseExtraPatterns()) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Scrub with custom patterns on top of defaults.
 */
export function scrubWith(line: string, patterns: RegExp[]): string {
  let result = scrub(line);
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/** Reset the extra patterns cache (for testing) */
export function _resetExtraPatterns(): void {
  _extraParsed = false;
  _extraPatterns = [];
}
