/**
 * Provider spawn helper — F-02
 * Spawns provider subprocesses with a sanitized environment.
 */

import { spawn, type ChildProcess, type SpawnOptions } from 'node:child_process';

// ─── Env sanitization ─────────────────────────────────────────────────────────

/**
 * Patterns to strip from env.
 * Strips: *_API_KEY, *_TOKEN, *_SECRET, *_PASSWORD, AWS_* (except AWS_REGION),
 * GOOGLE_APPLICATION_CREDENTIALS
 */
const DENY_PATTERNS = [
  /_API_KEY$/,
  /_TOKEN$/,
  /_SECRET$/,
  /_PASSWORD$/,
  /^GOOGLE_APPLICATION_CREDENTIALS$/,
];

const AWS_DENY = /^AWS_(?!REGION$)/;

export function buildSanitizedEnv(): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = {};
  const propagate = (process.env['BAB_PROPAGATE_ENV'] ?? '').split(',').filter(Boolean);

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;

    // Check denylist
    const denied =
      DENY_PATTERNS.some(p => p.test(key)) ||
      AWS_DENY.test(key);

    if (denied && !propagate.includes(key)) {
      continue;
    }

    out[key] = value;
  }

  return out;
}

// ─── SpawnOpts ────────────────────────────────────────────────────────────────

export interface SpawnOpts {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

/**
 * Spawn a provider binary with sanitized environment.
 * Always uses shell: false.
 */
export function spawnProvider(
  absolutePath: string,
  args: string[],
  opts?: SpawnOpts,
): ChildProcess {
  const spawnOpts: SpawnOptions = {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false, // NEVER shell: true
    env: opts?.env ?? buildSanitizedEnv(),
    cwd: opts?.cwd,
  };

  return spawn(absolutePath, args, spawnOpts);
}
