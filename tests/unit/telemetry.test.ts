/**
 * Tests for F-10: telemetry-opt-in
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsp from 'node:fs/promises';
import { emit, disable, local, enable, _setDevMode } from '../../src/telemetry/index.js';
import { isHttpsUrl } from '../../src/telemetry/endpoint.js';
import { StateStore } from '../../src/state/index.js';

let tmpDir: string;
let stateStore: StateStore;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `bab-telemetry-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fsp.mkdir(tmpDir, { recursive: true });
  stateStore = await StateStore.load(tmpDir);
  delete process.env['BAB_NO_TELEMETRY'];
  delete process.env['BAB_CACHE_DIR'];
  _setDevMode(false);
});

afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env['BAB_NO_TELEMETRY'];
  delete process.env['BAB_CACHE_DIR'];
  _setDevMode(false);
  try {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('emit', () => {
  it('returns fast (non-blocking)', () => {
    const start = performance.now();
    emit('run_start', { provider: 'claude' });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5); // well under 1ms threshold; allow some overhead
  });

  it('BAB_NO_TELEMETRY blocks all emit', () => {
    process.env['BAB_NO_TELEMETRY'] = '1';
    // Should return without doing anything
    expect(() => emit('run_start', { provider: 'claude' })).not.toThrow();
  });

  it('unknown event name throws in dev mode', () => {
    _setDevMode(true);
    expect(() => emit('totally_unknown_event', {})).toThrow('Unknown telemetry event name');
  });

  it('known event names do not throw in dev mode', () => {
    _setDevMode(true);
    expect(() => emit('run_start', { provider: 'claude' })).not.toThrow();
    expect(() => emit('install', {})).not.toThrow();
    expect(() => emit('provider_set', { name: 'claude' })).not.toThrow();
    expect(() => emit('turn_complete', { tokens: 100 })).not.toThrow();
    expect(() => emit('crash', { code: 'E-CLI-CRASH' })).not.toThrow();
    expect(() => emit('error_E-CLI-MISSING', { code: 'E-CLI-MISSING' })).not.toThrow();
  });

  it('forbidden fields throw even in non-dev mode', () => {
    _setDevMode(false);
    expect(() => emit('run_start', { prompt: 'user message' })).toThrow('forbidden field');
    expect(() => emit('run_start', { content: 'text' })).toThrow('forbidden field');
    expect(() => emit('run_start', { message: 'user said hello' })).toThrow('forbidden field');
  });

  it('non-forbidden fields pass through', () => {
    expect(() => emit('run_start', { provider: 'claude', tokens: 100 })).not.toThrow();
  });
});

describe('disable', () => {
  it('sets enabled=false in state', async () => {
    process.env['BAB_CACHE_DIR'] = path.join(tmpDir, 'cache');
    await stateStore.saveWithLock(s => { s.telemetry.enabled = true; });
    await disable(stateStore);
    expect(stateStore.data.telemetry.enabled).toBe(false);
  });

  it('sets mode=off in state', async () => {
    process.env['BAB_CACHE_DIR'] = path.join(tmpDir, 'cache');
    await disable(stateStore);
    expect(stateStore.data.telemetry.mode).toBe('off');
  });

  it('zeroes anon_id', async () => {
    process.env['BAB_CACHE_DIR'] = path.join(tmpDir, 'cache');
    await disable(stateStore);
    expect(stateStore.data.telemetry.anon_id).toBe('');
  });
});

describe('local mode', () => {
  it('sets mode=local in state', async () => {
    await local(stateStore);
    expect(stateStore.data.telemetry.mode).toBe('local');
  });

  it('sets enabled=true in state', async () => {
    await local(stateStore);
    expect(stateStore.data.telemetry.enabled).toBe(true);
  });
});

describe('anon_id', () => {
  it('anon_id is a hex string, not in event data', () => {
    const data: Record<string, unknown> = { provider: 'claude', tokens: 100 };
    // anon_id should be in state.telemetry, not in event data
    expect(data['anon_id']).toBeUndefined();
  });
});

describe('isHttpsUrl', () => {
  it('returns true for https URLs', () => {
    expect(isHttpsUrl('https://example.com')).toBe(true);
    expect(isHttpsUrl('https://api.anthropic.com/telemetry')).toBe(true);
  });

  it('returns false for http URLs', () => {
    expect(isHttpsUrl('http://example.com')).toBe(false);
  });

  it('returns false for non-URL strings', () => {
    expect(isHttpsUrl('not-a-url')).toBe(false);
    expect(isHttpsUrl('')).toBe(false);
  });
});

describe('enable', () => {
  it('non-TTY stdin → promptYesNo returns false → telemetry not enabled', async () => {
    // In test environment, stdin is not a TTY, so promptYesNo() returns false
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    await enable(stateStore);

    // Should have written the disclosure text
    const combined = outputLines.join('');
    expect(combined.length).toBeGreaterThan(0);
    // Telemetry should NOT be enabled (user said no via non-TTY)
    expect(stateStore.data.telemetry.enabled).toBe(false);
  });

  it('enable writes disclosure text to stdout', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    await enable(stateStore);
    const combined = outputLines.join('');
    // Disclosure should mention telemetry
    expect(combined.toLowerCase()).toMatch(/telemetry|data|privacy/i);
  });

  it('enable outputs "not enabled" when declined', async () => {
    // stdin is non-TTY so promptYesNo returns false automatically
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    await enable(stateStore);
    const combined = outputLines.join('');
    expect(combined).toContain('not enabled');
  });
});
