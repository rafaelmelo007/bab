#!/usr/bin/env node
// D-07: Stub provider for cold-install harness (AC-06).
// Echoes a canned response within 50 ms to isolate ulm onboarding latency.
// Invoked by ulm as: node ulm-stub-provider.mjs [args...]
//
// ACP protocol subset: reads JSON frames from stdin, writes JSON frames to stdout.
// For cold-install purposes, any input produces one content frame then a done frame.

import { createInterface } from 'node:readline';

const CANNED_RESPONSE = 'pong';

const rl = createInterface({ input: process.stdin, terminal: false });

let answered = false;

rl.on('line', (line) => {
  if (answered) return;
  answered = true;

  try {
    JSON.parse(line); // validate input is JSON
  } catch {
    // tolerate plain-text prompts in cold-install context
  }

  // Respond within 50 ms (D-07 requirement)
  setTimeout(() => {
    process.stdout.write(JSON.stringify({ type: 'content', text: CANNED_RESPONSE }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'done' }) + '\n');
    process.exit(0);
  }, 10);
});

rl.on('close', () => {
  if (!answered) {
    process.stdout.write(JSON.stringify({ type: 'content', text: CANNED_RESPONSE }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'done' }) + '\n');
    process.exit(0);
  }
});
