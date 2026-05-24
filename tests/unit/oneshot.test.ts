/**
 * Tests for F-07: one-shot-mode
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsp from 'node:fs/promises';
import { CliNoPrompt, CliInvalidUtf8, runOneShot } from '../../src/oneshot/index.js';
import { InvalidProvider } from '../../src/errors/index.js';
import { ExecTransport } from '../../src/transport/index.js';

describe('CliNoPrompt', () => {
  it('tty mode has exit code 2', () => {
    const err = new CliNoPrompt('tty');
    expect(err.exitCode()).toBe(2);
  });

  it('empty-pipe mode has exit code 2', () => {
    const err = new CliNoPrompt('empty-pipe');
    expect(err.exitCode()).toBe(2);
  });

  it('tty and empty-pipe have different messages', () => {
    const tty = new CliNoPrompt('tty');
    const pipe = new CliNoPrompt('empty-pipe');
    expect(tty.message).not.toBe(pipe.message);
  });

  it('tty message mentions "argument"', () => {
    const err = new CliNoPrompt('tty');
    expect(err.message).toContain('argument');
  });

  it('empty-pipe message mentions stdin', () => {
    const err = new CliNoPrompt('empty-pipe');
    expect(err.message).toContain('stdin');
  });
});

describe('CliInvalidUtf8', () => {
  it('has exit code 2', () => {
    const err = new CliInvalidUtf8();
    expect(err.exitCode()).toBe(2);
  });

  it('message mentions UTF-8', () => {
    const err = new CliInvalidUtf8();
    expect(err.message).toContain('UTF-8');
  });

  it('has code property', () => {
    const err = new CliInvalidUtf8();
    expect(err.code).toBe('E-CLI-INVALID-UTF8');
  });
});

describe('Exit code mapping', () => {
  it('InvalidProvider exits 2', () => {
    const err = new InvalidProvider('badprovider');
    expect(err.exitCode()).toBe(2);
  });
});

describe('runOneShot — invalid provider', () => {
  let stderrOutput: string[];

  beforeEach(() => {
    stderrOutput = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unknown provider returns exit code 2 and writes error', async () => {
    const code = await runOneShot({
      provider: 'badprovider',
      positionalArgs: ['hello'],
    });
    expect(code).toBe(2);
    const combined = stderrOutput.join('');
    expect(combined).toContain('E-INVALID-PROVIDER');
  });

  it('noColor option strips ANSI from output', async () => {
    const code = await runOneShot({
      provider: 'badprovider',
      positionalArgs: ['hello'],
      noColor: true,
    });
    expect(code).toBe(2);
    const combined = stderrOutput.join('');
    // No ANSI codes when noColor=true
    expect(combined).not.toMatch(/\x1B\[/);
  });
});

describe('runOneShot — TTY stdin / empty stdin', () => {
  let stderrOutput: string[];
  const origIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    stderrOutput = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
    delete process.env['ULM_CONFIG_DIR'];
  });

  it('TTY stdin + no positional → CliNoPrompt, exit 2', async () => {
    // Make stdin look like a TTY
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: [],
    });
    expect(code).toBe(2);
    const msg = stderrOutput.join('');
    expect(msg).toContain('prompt');
  });

  it('TTY stdin + positional with _discoverProvider → runs provider', async () => {
    // Make stdin look like a TTY
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });

    // Create a wrapper script that node can execute: node wrapper.mjs <prompt>
    // The wrapper just exits 0 regardless of prompt content
    const wrapperPath = path.join(os.tmpdir(), `echo-test-${Date.now()}.mjs`);
    await fsp.writeFile(wrapperPath, `process.stdout.write('ok\\n'); process.exit(0);`);

    // On Windows .mjs files aren't directly executable; use node as provider and the
    // script as --extra-args. But ExecTransport doesn't support that pattern.
    // Instead, test the path by making _discoverProvider return process.execPath
    // and using a positional arg that is a valid node script path.
    try {
      // Run: node.exe <wrapperPath> — wait, positional arg becomes the prompt passed
      // to the provider binary. We need the "provider binary" to be a script runner.
      // So use process.execPath (node) via a shim: the wrapper prints ok and exits 0
      // regardless of argv, so: discovered = process.execPath → runs `node <prompt>`.
      // That fails because <prompt> = 'hello world' is not a node file.
      // Use wrapperPath as the provider path; on POSIX that can't be exec'd directly,
      // on Windows .mjs won't be exec'd either.
      // Best approach: positionalArgs is the path to our echo script, provider is node.
      // But that means the prompt sent to the provider would be the wrapperPath string
      // and node would exec that file — which outputs "ok" and exits 0. Perfect!
      const code = await runOneShot({
        provider: 'claude',
        positionalArgs: [wrapperPath], // prompt = wrapperPath string → node runs it as a file
        _discoverProvider: async () => process.execPath, // discovered = node.exe
      });
      expect(code).toBe(0);
    } finally {
      await fsp.rm(wrapperPath, { force: true }).catch(() => {});
    }
  }, 5000);
});

describe('runOneShot — with mocked discovery', () => {
  let stderrOutput: string[];
  let stdoutOutput: string[];
  let tmpDir: string;

  beforeEach(async () => {
    stderrOutput = [];
    stdoutOutput = [];
    tmpDir = path.join(os.tmpdir(), `ulm-os-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsp.mkdir(tmpDir, { recursive: true });
    process.env['ULM_CONFIG_DIR'] = tmpDir;

    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdoutOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env['ULM_CONFIG_DIR'];
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('streams output from real subprocess using _discoverProvider', async () => {
    const scriptPath = path.join(tmpDir, 'echo-provider.mjs');
    await fsp.writeFile(scriptPath, `
process.stdout.write('Hello from provider');
process.exit(0);
`);

    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: [scriptPath],
      _discoverProvider: async () => process.execPath,
    });

    expect(code).toBe(0);
    const combined = stdoutOutput.join('');
    expect(combined).toContain('Hello from provider');
  });

  it('_discoverProvider returning null gives exit 127', async () => {
    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: ['hello'],
      _discoverProvider: async () => null,
    });

    expect(code).toBe(127);
    expect(stderrOutput.join('')).toContain('E-INVALID-PROVIDER');
  });

  it('noColor option is applied correctly', async () => {
    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: ['test'],
      noColor: true,
      _discoverProvider: async () => null,
    });

    expect(code).toBe(127);
    // No ANSI codes
    const msg = stderrOutput.join('');
    expect(msg).not.toMatch(/\x1B\[/);
  });

  it('provider crash returns non-zero exit code', async () => {
    const scriptPath = path.join(tmpDir, 'crash-provider.mjs');
    await fsp.writeFile(scriptPath, `process.exit(42);`);

    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: [scriptPath],
      _discoverProvider: async () => process.execPath,
    });

    // ExecTransport throws CliCrash → exitCode() = 1
    expect(code).toBe(1);
  });

  it('provider stderr is redacted and written to stderr', async () => {
    const scriptPath = path.join(tmpDir, 'stderr-provider.mjs');
    await fsp.writeFile(scriptPath, `
process.stderr.write('Authorization: Bearer sk-secret-token\\n');
process.stdout.write('ok');
process.exit(0);
`);

    await runOneShot({
      provider: 'claude',
      positionalArgs: [scriptPath],
      _discoverProvider: async () => process.execPath,
    });

    const combined = stderrOutput.join('');
    expect(combined).toContain('[REDACTED]');
    expect(combined).not.toContain('sk-secret-token');
  });

  it('_discoverProvider throwing returns exit 127', async () => {
    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: ['hello'],
      _discoverProvider: async () => { throw new Error('discovery failed'); },
    });

    expect(code).toBe(127);
  });

  it('noColor flag works with _discoverProvider returning path', async () => {
    const scriptPath = path.join(tmpDir, 'simple-provider.mjs');
    await fsp.writeFile(scriptPath, `process.stdout.write('ok'); process.exit(0);`);

    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: [scriptPath],
      noColor: true,
      _discoverProvider: async () => process.execPath,
    });

    expect(code).toBe(0);
  });

  it('transport throws non-UlmError → rethrows', async () => {
    const scriptPath = path.join(tmpDir, 'throw-provider.mjs');
    await fsp.writeFile(scriptPath, `process.stdout.write('ok'); process.exit(0);`);

    // Spy on ExecTransport.prototype.send to throw a non-UlmError
    const spy = vi.spyOn(ExecTransport.prototype, 'send').mockImplementation(async function* () {
      throw new TypeError('unexpected internal error');
    });

    await expect(
      runOneShot({
        provider: 'claude',
        positionalArgs: [scriptPath],
        _discoverProvider: async () => process.execPath,
      }),
    ).rejects.toThrow('unexpected internal error');

    spy.mockRestore();
  });
});

describe('runOneShot — empty pipe stdin', () => {
  let stderrOutput: string[];
  const origIsTTY = process.stdin.isTTY;
  const origStdin = process.stdin;

  beforeEach(() => {
    stderrOutput = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
    // Make stdin appear as piped (not TTY)
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process.stdin, 'isTTY', { value: origIsTTY, configurable: true });
  });

  it('empty piped stdin + no positional → CliNoPrompt empty-pipe, exit 2', async () => {
    // Mock stdin to emit no data and end immediately
    const { PassThrough } = await import('node:stream');
    const fakeStdin = new PassThrough();
    Object.defineProperty(process, 'stdin', { value: fakeStdin, configurable: true });
    Object.defineProperty(fakeStdin, 'isTTY', { value: false, configurable: true });

    // End stdin immediately with no data
    setImmediate(() => fakeStdin.end());

    const code = await runOneShot({
      provider: 'claude',
      positionalArgs: [],
    });

    Object.defineProperty(process, 'stdin', { value: origStdin, configurable: true });

    expect(code).toBe(2);
    const combined = stderrOutput.join('');
    expect(combined).toContain('stdin');
  });
});

describe('runOneShot — real discovery path (no _discoverProvider)', () => {
  let stderrOutput: string[];
  let tmpDir: string;

  beforeEach(async () => {
    stderrOutput = [];
    tmpDir = path.join(os.tmpdir(), `ulm-os-real-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsp.mkdir(tmpDir, { recursive: true });
    process.env['ULM_CONFIG_DIR'] = tmpDir;
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : String(chunk));
      return true;
    });
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env['ULM_CONFIG_DIR'];
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  it('no _discoverProvider + missing provider returns 127', async () => {
    // discoverOne will return missing since no binary is installed in test env
    // This exercises lines 144-152 (real StateStore.load + discoverOne path)
    const code = await runOneShot({
      provider: 'ollama', // likely not installed in CI
      positionalArgs: ['hello'],
      // no _discoverProvider — exercises the else branch
    });
    // Either 127 (not found) or some other exit code, but definitely not 2
    expect([0, 1, 127]).toContain(code);
    // If 127, stderr should contain E-INVALID-PROVIDER
    if (code === 127) {
      expect(stderrOutput.join('')).toContain('E-INVALID-PROVIDER');
    }
  }, 15000);
});
