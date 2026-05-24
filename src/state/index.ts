/**
 * State Store — F-04
 * Manages bab's persistent state in state.toml with atomic writes and cross-process locking.
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import toml from '@iarna/toml';
import lockfile from 'proper-lockfile';
import { StateCorrupt, StateSchema, Perms, StateLocked } from '../errors/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEntry {
  id: string;
  last_used?: string;
}

export interface TelemetryData {
  enabled: boolean;
  mode: string;
  anon_id: string;
}

export interface StateData {
  schema_version: number;
  sessions: Record<string, SessionEntry>;
  telemetry: TelemetryData;
  [key: string]: unknown;
}

const MAX_SCHEMA_VERSION = 1;
const LOCK_RETRIES = 3;
const LOCK_RETRY_DELAY = 50; // ms

// ─── Config dir resolution ────────────────────────────────────────────────────

export function resolveConfigDir(): string {
  if (process.env['BAB_CONFIG_DIR']) {
    return process.env['BAB_CONFIG_DIR'];
  }

  if (process.platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'bab');
  }

  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'bab');
  }

  // Linux / other: XDG
  const xdgConfig = process.env['XDG_CONFIG_HOME'] ?? path.join(os.homedir(), '.config');
  return path.join(xdgConfig, 'bab');
}

// ─── Minimal initial state ────────────────────────────────────────────────────

function makeInitialState(): StateData {
  return {
    schema_version: 1,
    sessions: {},
    telemetry: {
      enabled: false,
      mode: 'off',
      anon_id: crypto.randomBytes(16).toString('hex'),
    },
  };
}

// ─── StateStore class ─────────────────────────────────────────────────────────

export class StateStore {
  private _data: StateData;
  private _configDir: string;
  private _filePath: string;

  private constructor(data: StateData, configDir: string) {
    this._data = data;
    this._configDir = configDir;
    this._filePath = path.join(configDir, 'state.toml');
  }

  get data(): StateData {
    return this._data;
  }

  get filePath(): string {
    return this._filePath;
  }

  get configDir(): string {
    return this._configDir;
  }

  /**
   * Load or create state.toml from the given config directory.
   */
  static async load(configDir?: string): Promise<StateStore> {
    const dir = configDir ?? resolveConfigDir();
    const filePath = path.join(dir, 'state.toml');

    // Ensure directory exists
    await fsp.mkdir(dir, { recursive: true });

    // Set directory permissions (Unix)
    if (process.platform !== 'win32') {
      try {
        await fsp.chmod(dir, 0o700);
      } catch {
        // Ignore if already set
      }
    }

    // Check if file exists
    let exists = false;
    try {
      await fsp.access(filePath, fs.constants.F_OK);
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) {
      // First run: create minimal state
      const initial = makeInitialState();
      const store = new StateStore(initial, dir);
      await store._writeFile(initial);
      return store;
    }

    // Check file permissions on Unix
    if (process.platform !== 'win32') {
      const stat = await fsp.stat(filePath);
      const mode = stat.mode & 0o777;
      if (mode !== 0o600 && mode !== 0o400) {
        throw new Perms(filePath);
      }
    }

    // Read and parse
    const raw = await fsp.readFile(filePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = toml.parse(raw);
    } catch {
      throw new StateCorrupt(filePath);
    }

    // Validate
    if (typeof parsed !== 'object' || parsed === null) {
      throw new StateCorrupt(filePath);
    }

    const obj = parsed as Record<string, unknown>;

    // schema_version must be present and an integer
    if (!('schema_version' in obj)) {
      throw new StateCorrupt(filePath);
    }

    const schemaVersion = obj['schema_version'];
    if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
      throw new StateCorrupt(filePath);
    }

    if (schemaVersion > MAX_SCHEMA_VERSION) {
      throw new StateSchema(schemaVersion, MAX_SCHEMA_VERSION);
    }

    // Build StateData — preserving unknown keys
    const sessions = (typeof obj['sessions'] === 'object' && obj['sessions'] !== null)
      ? (obj['sessions'] as Record<string, SessionEntry>)
      : {};

    const rawTelemetry = obj['telemetry'];
    const telemetry: TelemetryData = (typeof rawTelemetry === 'object' && rawTelemetry !== null)
      ? (rawTelemetry as TelemetryData)
      : { enabled: false, mode: 'off', anon_id: '' };

    const data: StateData = {
      ...obj,
      schema_version: schemaVersion,
      sessions,
      telemetry,
    };

    return new StateStore(data, dir);
  }

  /**
   * Write file atomically (tmp → fsync → rename).
   */
  private async _writeFile(data: StateData): Promise<void> {
    const tmpPath = this._filePath + '.tmp';
    const content = toml.stringify(data as unknown as toml.JsonMap);

    // Write to tmp
    const fd = await fsp.open(tmpPath, 'w', 0o600);
    try {
      await fd.writeFile(content, 'utf-8');
      await fd.sync();
    } finally {
      await fd.close();
    }

    // fsync parent dir (Unix only)
    if (process.platform !== 'win32') {
      try {
        const dirFd = await fsp.open(this._configDir, 'r');
        try {
          await dirFd.sync();
        } finally {
          await dirFd.close();
        }
      } catch {
        // Best effort
      }
    }

    // Atomic rename
    await fsp.rename(tmpPath, this._filePath);
  }

  /**
   * Save with proper-lockfile and per-key merge.
   */
  async saveWithLock(callback: (state: StateData) => void): Promise<void> {
    let release: (() => Promise<void>) | null = null;
    let retryCount = 0;
    let lastError: unknown;

    // Ensure file exists before locking
    try {
      await fsp.access(this._filePath, fs.constants.F_OK);
    } catch {
      // Create an empty file to lock on
      await fsp.writeFile(this._filePath, '', { flag: 'wx', mode: 0o600 }).catch(() => {});
    }

    while (retryCount < LOCK_RETRIES) {
      try {
        release = await lockfile.lock(this._filePath, {
          retries: 0,
          stale: 10000,
        });
        break;
      } catch (err) {
        lastError = err;
        retryCount++;
        if (retryCount < LOCK_RETRIES) {
          await new Promise<void>(resolve => setTimeout(resolve, LOCK_RETRY_DELAY));
        }
      }
    }

    if (release === null) {
      throw new StateLocked();
    }

    try {
      // Re-read on-disk state
      let onDisk: StateData;
      try {
        const raw = await fsp.readFile(this._filePath, 'utf-8');
        if (raw.trim() === '') {
          onDisk = { ...this._data };
        } else {
          const parsed = toml.parse(raw) as unknown as StateData;
          onDisk = parsed;
        }
      } catch {
        onDisk = { ...this._data };
      }

      // Apply the callback mutation
      callback(onDisk);

      // Write merged result
      await this._writeFile(onDisk);
      this._data = onDisk;
    } finally {
      await release();
    }
  }

  /**
   * Run schema migration if needed.
   */
  async migrate(): Promise<void> {
    // v1 is the initial version; no migrations needed yet
    // Future migrations would go here
    if (this._data.schema_version === 1) {
      return;
    }
  }
}
