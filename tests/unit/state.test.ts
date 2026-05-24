/**
 * Tests for F-04: state-store
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { StateStore, resolveConfigDir } from '../../src/state/index.js';
import { StateCorrupt, StateSchema, Perms } from '../../src/errors/index.js';

// Create a unique tmp dir for each test
let tmpDir: string;

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `ulm-test-state-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fsp.mkdir(tmpDir, { recursive: true });
});

afterEach(async () => {
  try {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('StateStore.load — well-formed TOML', () => {
  it('AC-01: parses minimal v1 state.toml', async () => {
    const tomlContent = `schema_version = 1

[sessions]

[telemetry]
enabled = false
mode = "off"
anon_id = "abc123"
`;
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), tomlContent, { mode: 0o600 });
    const store = await StateStore.load(tmpDir);
    expect(store.data.schema_version).toBe(1);
    expect(store.data.telemetry.anon_id).toBe('abc123');
    expect(store.data.telemetry.enabled).toBe(false);
  });

  it('AC-01: preserves unknown top-level keys', async () => {
    const tomlContent = `schema_version = 1
future_flag = "x"

[sessions]

[telemetry]
enabled = false
mode = "off"
anon_id = "abc"

[experimental]
cool_thing = true
`;
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), tomlContent, { mode: 0o600 });
    const store = await StateStore.load(tmpDir);
    expect(store.data['future_flag']).toBe('x');
    expect((store.data['experimental'] as Record<string, unknown>)['cool_thing']).toBe(true);
  });
});

describe('StateStore.load — first-run', () => {
  it('AC-02: creates state.toml on first-run', async () => {
    const newDir = path.join(tmpDir, 'new-config');
    const store = await StateStore.load(newDir);
    expect(store.data.schema_version).toBe(1);
    const exists = fs.existsSync(path.join(newDir, 'state.toml'));
    expect(exists).toBe(true);
  });

  it('AC-02: created file has valid structure', async () => {
    const newDir = path.join(tmpDir, 'new-config2');
    const store = await StateStore.load(newDir);
    expect(store.data.sessions).toBeDefined();
    expect(store.data.telemetry).toBeDefined();
    expect(typeof store.data.telemetry.anon_id).toBe('string');
  });
});

describe('StateStore.load — error paths', () => {
  it('AC-13: truncated TOML throws StateCorrupt', async () => {
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), 'schema_version = [truncated', { mode: 0o600 });
    await expect(StateStore.load(tmpDir)).rejects.toThrow(StateCorrupt);
  });

  it('AC-13: missing schema_version throws StateCorrupt', async () => {
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), '[sessions]\n', { mode: 0o600 });
    await expect(StateStore.load(tmpDir)).rejects.toThrow(StateCorrupt);
  });

  it('AC-08: schema_version > MAX throws StateSchema', async () => {
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), 'schema_version = 999\n', { mode: 0o600 });
    await expect(StateStore.load(tmpDir)).rejects.toThrow(StateSchema);
  });

  it('AC-08: StateSchema carries correct version numbers', async () => {
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), 'schema_version = 999\n', { mode: 0o600 });
    try {
      await StateStore.load(tmpDir);
      expect(false).toBe(true); // should not reach
    } catch (err) {
      expect(err).toBeInstanceOf(StateSchema);
      const msg = (err as StateSchema).format({ color: false, unicode: true });
      expect(msg).toContain('999');
      expect(msg).toContain('1');
    }
  });

  it('AC-13: malformed TOML throws StateCorrupt', async () => {
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), '===not toml===', { mode: 0o600 });
    await expect(StateStore.load(tmpDir)).rejects.toThrow(StateCorrupt);
  });
});

describe('StateStore — Unix file permissions', () => {
  const isWindows = process.platform === 'win32';

  it('AC-11: mode 0644 throws Perms (Unix)', async () => {
    if (isWindows) return; // Skip on Windows
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), 'schema_version = 1\n[sessions]\n[telemetry]\nenabled=false\nmode="off"\nanon_id="x"\n');
    await fsp.chmod(path.join(tmpDir, 'state.toml'), 0o644);
    await expect(StateStore.load(tmpDir)).rejects.toThrow(Perms);
  });

  it('AC-11: mode 0600 loads successfully (Unix)', async () => {
    if (isWindows) return; // Skip on Windows
    await fsp.writeFile(
      path.join(tmpDir, 'state.toml'),
      'schema_version = 1\n[sessions]\n[telemetry]\nenabled=false\nmode="off"\nanon_id="x"\n',
      { mode: 0o600 },
    );
    const store = await StateStore.load(tmpDir);
    expect(store.data.schema_version).toBe(1);
  });
});

describe('StateStore.saveWithLock', () => {
  it('AC-04: saves state correctly', async () => {
    const store = await StateStore.load(tmpDir);
    await store.saveWithLock(state => {
      state.sessions['claude'] = { id: 'session-abc-123' };
    });

    // Re-load to verify
    const store2 = await StateStore.load(tmpDir);
    expect(store2.data.sessions['claude']?.id).toBe('session-abc-123');
  });

  it('AC-04: per-key merge preserves existing keys', async () => {
    const store = await StateStore.load(tmpDir);
    await store.saveWithLock(state => {
      state.sessions['claude'] = { id: 'session-A' };
    });
    await store.saveWithLock(state => {
      state.sessions['codex'] = { id: 'session-B' };
    });

    const store2 = await StateStore.load(tmpDir);
    expect(store2.data.sessions['claude']?.id).toBe('session-A');
    expect(store2.data.sessions['codex']?.id).toBe('session-B');
  });

  it('AC-07: unknown keys preserved through save', async () => {
    const tomlContent = `schema_version = 1
future_flag = "x"

[sessions]

[telemetry]
enabled = false
mode = "off"
anon_id = "abc"

[experimental]
cool_thing = true
`;
    await fsp.writeFile(path.join(tmpDir, 'state.toml'), tomlContent, { mode: 0o600 });
    const store = await StateStore.load(tmpDir);

    await store.saveWithLock(state => {
      state.sessions['claude'] = { id: 'new-session' };
    });

    const store2 = await StateStore.load(tmpDir);
    expect(store2.data['future_flag']).toBe('x');
    expect((store2.data['experimental'] as Record<string, unknown>)['cool_thing']).toBe(true);
  });
});

describe('StateStore.migrate', () => {
  it('migrate() returns without error for schema_version=1', async () => {
    const store = await StateStore.load(tmpDir);
    // Should not throw
    await expect(store.migrate()).resolves.toBeUndefined();
  });

  it('migrate() is a no-op for current schema version', async () => {
    const store = await StateStore.load(tmpDir);
    const beforeData = JSON.stringify(store.data);
    await store.migrate();
    expect(JSON.stringify(store.data)).toBe(beforeData);
  });
});

describe('resolveConfigDir', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore env vars
    for (const key of ['ULM_CONFIG_DIR', 'XDG_CONFIG_HOME', 'APPDATA']) {
      if (origEnv[key] !== undefined) {
        process.env[key] = origEnv[key];
      } else {
        delete process.env[key];
      }
    }
  });

  it('AC-14: ULM_CONFIG_DIR overrides everything', () => {
    process.env['ULM_CONFIG_DIR'] = '/custom/ulm/config';
    expect(resolveConfigDir()).toBe('/custom/ulm/config');
  });

  it('AC-14: falls back to platform default when not set', () => {
    delete process.env['ULM_CONFIG_DIR'];
    const dir = resolveConfigDir();
    expect(dir).toBeTruthy();
    expect(dir.length).toBeGreaterThan(0);
    // Should end with 'ulm'
    expect(path.basename(dir)).toBe('ulm');
  });
});
