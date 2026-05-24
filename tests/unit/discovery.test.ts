/**
 * Tests for F-03: provider-discovery
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { formatProviders, discoverAll, discoverOne, type DiscoveryResult } from '../../src/discovery/index.js';
import { StateStore } from '../../src/state/index.js';

let tmpDir: string;
let stateStore: StateStore;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `ulm-discovery-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fsp.mkdir(tmpDir, { recursive: true });
  stateStore = await StateStore.load(tmpDir);
});

afterEach(async () => {
  vi.restoreAllMocks();
  try {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('formatProviders', () => {
  const mockResults: DiscoveryResult[] = [
    {
      name: 'claude',
      absolutePath: '/usr/local/bin/claude',
      version: '1.2.3',
      transport: 'exec',
      sha256: 'abc123',
      detectedAt: '2026-05-23T00:00:00.000Z',
      status: 'ok',
    },
    {
      name: 'codex',
      absolutePath: '',
      version: '',
      transport: '',
      sha256: '',
      detectedAt: '2026-05-23T00:00:00.000Z',
      status: 'missing',
    },
    {
      name: 'gemini',
      absolutePath: '/usr/bin/gemini',
      version: '0.5.0',
      transport: 'exec',
      sha256: 'def456',
      detectedAt: '2026-05-23T00:00:00.000Z',
      status: 'warn',
    },
    {
      name: 'ollama',
      absolutePath: '/usr/local/bin/ollama',
      version: '0.2.0',
      transport: 'http',
      sha256: 'ghi789',
      detectedAt: '2026-05-23T00:00:00.000Z',
      status: 'ok',
    },
  ];

  it('outputs 4-column table with header', () => {
    const out = formatProviders(mockResults, { color: false, unicode: true });
    expect(out).toContain('PROVIDER');
    expect(out).toContain('TRANSPORT');
    expect(out).toContain('VERSION');
    expect(out).toContain('STATUS');
  });

  it('snapshot: unicode mode', () => {
    const out = formatProviders(mockResults, { color: false, unicode: true });
    expect(out).toMatchSnapshot();
  });

  it('snapshot: ASCII mode', () => {
    const out = formatProviders(mockResults, { color: false, unicode: false });
    expect(out).toMatchSnapshot();
  });

  it('uses ✓ for ok status', () => {
    const out = formatProviders(mockResults, { color: false, unicode: true });
    expect(out).toContain('✓');
  });

  it('uses ✗ for missing status', () => {
    const out = formatProviders(mockResults, { color: false, unicode: true });
    expect(out).toContain('✗');
  });

  it('uses ⚠ for warn status', () => {
    const out = formatProviders(mockResults, { color: false, unicode: true });
    expect(out).toContain('⚠');
  });

  it('ASCII mode uses [ok], [x], [!]', () => {
    const out = formatProviders(mockResults, { color: false, unicode: false });
    expect(out).toContain('[ok]');
    expect(out).toContain('[x]');
    expect(out).toContain('[!]');
  });
});

describe('discoverAll — with mocked PATH', () => {
  it('returns 4 results (one per provider)', async () => {
    // With no real providers installed, all should be missing
    const origPath = process.env['PATH'];
    process.env['PATH'] = tmpDir; // No providers in empty tmpDir
    try {
      const results = await discoverAll(stateStore);
      expect(results).toHaveLength(4);
      expect(results.map(r => r.name)).toEqual(['claude', 'codex', 'gemini', 'ollama']);
    } finally {
      process.env['PATH'] = origPath;
    }
  });

  it('missing providers have status=missing', async () => {
    const origPath = process.env['PATH'];
    process.env['PATH'] = tmpDir;
    try {
      const results = await discoverAll(stateStore);
      const claude = results.find(r => r.name === 'claude');
      expect(claude?.status).toBe('missing');
    } finally {
      process.env['PATH'] = origPath;
    }
  });
});

describe('discoverOne — mocked binary', () => {
  it('discovers a binary in PATH', async () => {
    // Create a fake binary in tmpDir
    const fakeBin = path.join(tmpDir, process.platform === 'win32' ? 'claude.cmd' : 'claude');
    if (process.platform === 'win32') {
      await fsp.writeFile(fakeBin, '@echo claude version 1.2.3\r\n');
    } else {
      await fsp.writeFile(fakeBin, '#!/bin/sh\necho "claude version 1.2.3"\n', { mode: 0o755 });
    }

    const origPath = process.env['PATH'];
    process.env['PATH'] = tmpDir + path.delimiter + (origPath ?? '');
    try {
      const result = await discoverOne('claude', stateStore);
      // On Windows the cmd might not execute properly - just check the path is found
      expect(result.absolutePath).toBeTruthy();
      expect(result.name).toBe('claude');
    } finally {
      process.env['PATH'] = origPath;
    }
  });
});
