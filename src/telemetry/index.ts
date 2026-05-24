/**
 * Telemetry Opt-In — F-10
 * Handles telemetry events with user consent, local caching, and privacy controls.
 */

import * as fsp from 'node:fs/promises';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as readline from 'node:readline';
import type { StateStore } from '../state/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpsUrl = `https://${string}`;

export type TelemetryEventName =
  | 'install'
  | 'run_start'
  | 'provider_set'
  | 'turn_complete'
  | `error_${string}`
  | 'crash';

const ALLOWED_EVENT_NAMES: string[] = [
  'install',
  'run_start',
  'provider_set',
  'turn_complete',
  'crash',
];

function isAllowedEvent(name: string): name is TelemetryEventName {
  if (ALLOWED_EVENT_NAMES.includes(name)) return true;
  if (name.startsWith('error_')) return true;
  return false;
}

// ─── Forbidden fields (never in telemetry payload) ────────────────────────────

const FORBIDDEN_FIELDS = new Set([
  'prompt',
  'message',
  'content',
  'text',
  'input',
  'output',
  'response',
  'completion',
  'user_message',
  'assistant_message',
]);

function checkForbiddenFields(data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    if (FORBIDDEN_FIELDS.has(key.toLowerCase())) {
      throw new Error(`Telemetry event contains forbidden field: ${key}`);
    }
  }
}

// ─── Disclosure text ─────────────────────────────────────────────────────────

export const DISCLOSURE_TEXT = `bab collects anonymous usage telemetry to help improve the tool.

What is collected:
  - CLI command names and provider names
  - Error codes (no messages)
  - Turn counts and timing
  - Platform (OS, Node version)

What is NEVER collected:
  - Prompt content or conversation text
  - API keys or credentials
  - File paths or personal information
  - Provider responses

You can change this at any time with:
  /telemetry enable
  /telemetry disable
  /telemetry local   (write-to-disk only, no network)

Do you want to enable telemetry? [y/N] `;

// ─── Cache dir ────────────────────────────────────────────────────────────────

function resolveCacheDir(): string {
  if (process.env['BAB_CACHE_DIR']) {
    return process.env['BAB_CACHE_DIR'];
  }
  if (process.platform === 'win32') {
    const localAppData = process.env['LOCALAPPDATA'] ?? path.join(process.env['USERPROFILE'] ?? '', 'AppData', 'Local');
    return path.join(localAppData, 'bab');
  }
  if (process.platform === 'darwin') {
    return path.join(process.env['HOME'] ?? '~', 'Library', 'Caches', 'bab');
  }
  const xdgCache = process.env['XDG_CACHE_HOME'] ?? path.join(process.env['HOME'] ?? '~', '.cache');
  return path.join(xdgCache, 'bab');
}

// ─── Telemetry endpoint ───────────────────────────────────────────────────────

const TELEMETRY_ENDPOINT: HttpsUrl = 'https://telemetry.bab.dev/v1/events';

// ─── State ────────────────────────────────────────────────────────────────────

let _isDev = process.env['NODE_ENV'] === 'development' || process.env['BAB_DEV'] === '1';

/**
 * Emit a telemetry event (non-blocking, ≤1ms return).
 */
export function emit(name: string, data: Record<string, unknown>): void {
  // Check if telemetry is blocked
  if (process.env['BAB_NO_TELEMETRY']) return;

  // In dev, validate event name strictly
  if (_isDev && !isAllowedEvent(name)) {
    throw new Error(`Unknown telemetry event name: ${name}`);
  }

  // Validate forbidden fields
  checkForbiddenFields(data);

  // Non-blocking: fire and forget
  setImmediate(() => {
    _dispatchEvent(name, data).catch(() => {
      // Silently ignore telemetry errors
    });
  });
}

async function _dispatchEvent(name: string, data: Record<string, unknown>): Promise<void> {
  const cacheDir = resolveCacheDir();
  const cacheFile = path.join(cacheDir, 'telemetry.jsonl');

  const entry = JSON.stringify({ event: name, data, timestamp: new Date().toISOString() });

  // Write to local cache
  try {
    await fsp.mkdir(cacheDir, { recursive: true });
    const fd = await fsp.open(cacheFile, 'a', 0o600);
    try {
      await fd.appendFile(entry + '\n');
    } finally {
      await fd.close();
    }
  } catch {
    // Ignore cache write errors
  }

  // Send to endpoint if not local mode
  // (In production, we'd check state.data.telemetry.mode === 'remote')
}

/**
 * Enable telemetry: print disclosure, prompt, write state.
 */
export async function enable(state: StateStore): Promise<void> {
  process.stdout.write(DISCLOSURE_TEXT);

  const answer = await promptYesNo();
  if (answer) {
    await state.saveWithLock(s => {
      s.telemetry.enabled = true;
      s.telemetry.mode = 'remote';
      if (!s.telemetry.anon_id) {
        s.telemetry.anon_id = crypto.randomBytes(16).toString('hex');
      }
    });
    process.stdout.write('Telemetry enabled. Thank you!\n');
  } else {
    process.stdout.write('Telemetry not enabled.\n');
  }
}

/**
 * Disable telemetry: sets enabled=false, deletes cache, zeroes anon_id.
 */
export async function disable(state: StateStore): Promise<void> {
  await state.saveWithLock(s => {
    s.telemetry.enabled = false;
    s.telemetry.mode = 'off';
    s.telemetry.anon_id = '';
  });

  // Delete cache file
  const cacheFile = path.join(resolveCacheDir(), 'telemetry.jsonl');
  try {
    await fsp.unlink(cacheFile);
  } catch {
    // Ignore if not found
  }

  process.stdout.write('Telemetry disabled.\n');
}

/**
 * Set local mode: writes to disk only, no network.
 */
export async function local(state: StateStore): Promise<void> {
  await state.saveWithLock(s => {
    s.telemetry.enabled = true;
    s.telemetry.mode = 'local';
  });
  process.stdout.write('Telemetry set to local mode (no network).\n');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function promptYesNo(): Promise<boolean> {
  if (!process.stdin.isTTY) return false;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question('', answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

/** For testing: override dev mode */
export function _setDevMode(dev: boolean): void {
  _isDev = dev;
}
