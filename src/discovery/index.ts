/**
 * Provider Discovery — F-03
 * Probes installed providers (claude, codex, gemini, ollama) and caches results.
 */

import * as path from 'node:path';
import * as fsp from 'node:fs/promises';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { StateStore } from '../state/index.js';
import type { RenderOpts } from '../errors/index.js';

const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscoveryResult {
  name: string;
  absolutePath: string;
  version: string;
  transport: 'acp' | 'exec' | 'http' | '';
  sha256: string;
  detectedAt: string;
  status: 'ok' | 'warn' | 'missing';
}

export type ProviderName = 'claude' | 'codex' | 'gemini' | 'ollama';

export const KNOWN_PROVIDERS: ProviderName[] = ['claude', 'codex', 'gemini', 'ollama'];

// Minimum versions per provider
const MIN_VERSIONS: Record<ProviderName, [number, number, number]> = {
  claude: [1, 0, 0],
  codex: [1, 0, 0],
  gemini: [1, 0, 0],
  ollama: [0, 1, 0],
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseVersion(raw: string): string {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(raw);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : raw.trim().slice(0, 20);
}

function compareVersion(v: string, min: [number, number, number]): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(v);
  if (!match) return true; // can't compare, assume ok
  const [, ma, mi, pa] = match.map(Number);
  const [mma, mmi, mpa] = min;
  if (ma! > mma!) return true;
  if (ma! < mma!) return false;
  if (mi! > mmi!) return true;
  if (mi! < mmi!) return false;
  return pa! >= mpa!;
}

async function sha256OfFile(filePath: string): Promise<string> {
  try {
    const content = await fsp.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}

async function findInPath(name: string): Promise<string> {
  const pathEnv = process.env['PATH'] ?? '';
  const entries = pathEnv.split(path.delimiter);
  const exts = process.platform === 'win32'
    ? (process.env['PATHEXT'] ?? '.EXE;.CMD;.BAT').split(';')
    : [''];

  for (const dir of entries) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      try {
        await fsp.access(candidate, fs.constants.X_OK);
        return candidate;
      } catch {
        // continue
      }
    }
  }
  return '';
}

async function probeVersion(absolutePath: string, timeoutMs = 500): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { stdout } = await execFileAsync(absolutePath, ['--version'], {
      signal: controller.signal,
      timeout: timeoutMs,
    });
    return parseVersion(stdout);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function probeOllama(timeoutMs = 500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('http://127.0.0.1:11434/api/tags', {
        signal: controller.signal,
      });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// ─── Single provider probe ────────────────────────────────────────────────────

async function probeProvider(
  name: ProviderName,
  state: StateStore,
): Promise<DiscoveryResult> {
  // Special case: ollama uses HTTP
  if (name === 'ollama') {
    const absolutePath = await findInPath('ollama');
    const reachable = await probeOllama();

    if (!reachable && !absolutePath) {
      return {
        name,
        absolutePath: '',
        version: '',
        transport: 'http',
        sha256: '',
        detectedAt: new Date().toISOString(),
        status: 'missing',
      };
    }

    const version = absolutePath ? await probeVersion(absolutePath) : 'unknown';
    const sha256 = absolutePath ? await sha256OfFile(absolutePath) : '';

    // Check cache
    const cached = getCached(state, name);
    if (cached && cached.absolutePath === absolutePath && cached.sha256 === sha256 && sha256 !== '') {
      return cached;
    }

    const minVer = MIN_VERSIONS[name];
    const status = reachable ? (compareVersion(version, minVer) ? 'ok' : 'warn') : 'missing';

    return {
      name,
      absolutePath,
      version,
      transport: 'http',
      sha256,
      detectedAt: new Date().toISOString(),
      status,
    };
  }

  // Find binary in PATH
  const absolutePath = await findInPath(name);
  if (!absolutePath) {
    return {
      name,
      absolutePath: '',
      version: '',
      transport: '',
      sha256: '',
      detectedAt: new Date().toISOString(),
      status: 'missing',
    };
  }

  const sha256 = await sha256OfFile(absolutePath);

  // Check cache
  const cached = getCached(state, name);
  if (cached && cached.absolutePath === absolutePath && cached.sha256 === sha256 && sha256 !== '') {
    return cached;
  }

  // Probe version
  const version = await probeVersion(absolutePath);
  const minVer = MIN_VERSIONS[name];
  const meetsMin = !version || compareVersion(version, minVer);

  // Determine transport
  let transport: 'acp' | 'exec' | 'http' = 'exec';
  if (name === 'claude') {
    // Try ACP initialize (simplified: just mark as exec for now)
    // A real impl would try a socket handshake
    transport = 'exec';
  }

  return {
    name,
    absolutePath,
    version,
    transport,
    sha256,
    detectedAt: new Date().toISOString(),
    status: meetsMin ? 'ok' : 'warn',
  };
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function getCached(state: StateStore, name: string): DiscoveryResult | null {
  const raw = state.data[`discovery_${name}`] as DiscoveryResult | undefined;
  return raw ?? null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Discover all providers in parallel.
 */
export async function discoverAll(state: StateStore): Promise<DiscoveryResult[]> {
  const results = await Promise.all(
    KNOWN_PROVIDERS.map(name => probeProvider(name, state)),
  );
  return results;
}

/**
 * Discover a single provider.
 */
export async function discoverOne(name: ProviderName, state: StateStore): Promise<DiscoveryResult> {
  return probeProvider(name, state);
}

// ─── Formatting ───────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, string> = {
  ok: '✓',
  warn: '⚠',
  missing: '✗',
};

const STATUS_ICONS_ASCII: Record<string, string> = {
  ok: '[ok]',
  warn: '[!]',
  missing: '[x]',
};

/**
 * Format discovery results as a 4-column table.
 */
export function formatProviders(results: DiscoveryResult[], opts: RenderOpts): string {
  const useUnicode = opts.unicode !== false;
  const icons = useUnicode ? STATUS_ICONS : STATUS_ICONS_ASCII;

  const header = 'PROVIDER    TRANSPORT   VERSION              STATUS';
  const sep = '─'.repeat(52);

  const rows = results.map(r => {
    const name = r.name.padEnd(12);
    const transport = (r.transport || 'n/a').padEnd(12);
    const version = (r.version || 'n/a').padEnd(20);
    const status = icons[r.status] ?? r.status;
    return `${name}${transport}${version} ${status}`;
  });

  return [header, useUnicode ? sep : '-'.repeat(52), ...rows].join('\n');
}
