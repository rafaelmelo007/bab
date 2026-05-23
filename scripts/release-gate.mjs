#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const EXPECTED_ENGINES = '^20.10 || ^22 || ^24';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const actual = pkg?.engines?.node ?? '(missing)';

if (actual !== EXPECTED_ENGINES) {
  console.error(
    `RELEASE BLOCKED: package.json engines.node "${actual}" ` +
    `does not match PRD §7.4 requirement "${EXPECTED_ENGINES}"`
  );
  process.exit(1);
}

console.log(`engines.node ok: "${actual}"`);
