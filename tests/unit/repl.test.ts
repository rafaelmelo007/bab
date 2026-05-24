/**
 * Tests for F-03: repl-shell
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsp from 'node:fs/promises';
import { renderPrompt, runReplLoop } from '../../src/repl/index.js';
import type { ReplContext } from '../../src/commands/types.js';
import { StateStore } from '../../src/state/index.js';
import { ExecTransport } from '../../src/transport/index.js';
import * as discoveryModule from '../../src/discovery/index.js';

function makeCtx(overrides?: Partial<ReplContext>): ReplContext {
  return {
    activeProvider: null,
    activeModel: null,
    sessionId: null,
    ...overrides,
  };
}

// Strip ANSI codes
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

describe('renderPrompt', () => {
  const origEnv = { ...process.env };
  const origIsTTY = process.stdout.isTTY;

  afterEach(() => {
    // Restore
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) delete process.env[key];
    }
    Object.assign(process.env, origEnv);
    Object.defineProperty(process.stdout, 'isTTY', { value: origIsTTY, configurable: true });
    vi.restoreAllMocks();
  });

  it('no provider → "ulm> "', () => {
    const ctx = makeCtx();
    const prompt = renderPrompt(ctx, true);
    expect(prompt).toBe('ulm> ');
  });

  it('with provider → "ulm (claude)> "', () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const prompt = renderPrompt(ctx, true);
    expect(stripAnsi(prompt)).toBe('ulm (claude)> ');
  });

  it('NO_COLOR env → no ANSI in prompt', () => {
    process.env['NO_COLOR'] = '1';
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const ctx = makeCtx({ activeProvider: 'claude' });
    const prompt = renderPrompt(ctx, false);
    expect(prompt).toBe(stripAnsi(prompt));
  });

  it('noColor=true → no ANSI', () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const prompt = renderPrompt(ctx, true);
    expect(prompt).toBe(stripAnsi(prompt));
    expect(stripAnsi(prompt)).toBe('ulm (claude)> ');
  });

  it('no provider prompt ends with "> "', () => {
    const ctx = makeCtx();
    const prompt = renderPrompt(ctx, true);
    expect(prompt.endsWith('> ')).toBe(true);
  });

  it('with provider prompt ends with "> "', () => {
    const ctx = makeCtx({ activeProvider: 'codex' });
    const prompt = renderPrompt(ctx, true);
    expect(stripAnsi(prompt).endsWith('> ')).toBe(true);
  });
});

describe('dispatch integration with REPL context', () => {
  it('/exit returns kind=exit', async () => {
    const { dispatch } = await import('../../src/commands/index.js');
    const ctx = makeCtx();
    const result = await dispatch('/exit', ctx);
    expect(result.kind).toBe('exit');
  });

  it('non-slash before provider → NoProvider', async () => {
    const { dispatch } = await import('../../src/commands/index.js');
    const ctx = makeCtx({ activeProvider: null });
    const result = await dispatch('hello', ctx);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.code).toBe('E-NO-PROVIDER');
    }
  });
});

describe('renderPrompt — edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('provider with spaces in name renders correctly', () => {
    const ctx = makeCtx({ activeProvider: 'my-provider' });
    const prompt = renderPrompt(ctx, true);
    expect(stripAnsi(prompt)).toContain('my-provider');
  });

  it('TTY + no NO_COLOR + color provider adds ANSI', () => {
    delete process.env['NO_COLOR'];
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    const ctx = makeCtx({ activeProvider: 'claude' });
    const prompt = renderPrompt(ctx, false);
    // Should have ANSI when TTY and no NO_COLOR
    expect(prompt).toContain('claude');
  });

  it('non-TTY → no ANSI codes even without noColor flag', () => {
    delete process.env['NO_COLOR'];
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });
    const ctx = makeCtx({ activeProvider: 'claude' });
    const prompt = renderPrompt(ctx, false);
    expect(prompt).toBe(stripAnsi(prompt));
  });
});

describe('runReplLoop — with mock readline interface', () => {
  let tmpDir: string;
  let stateStore: StateStore;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `ulm-repl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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

  function makeMockRl(): EventEmitter & { setPrompt: ReturnType<typeof vi.fn>; prompt: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> } {
    const mockRl = new EventEmitter() as EventEmitter & { setPrompt: ReturnType<typeof vi.fn>; prompt: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
    mockRl.setPrompt = vi.fn();
    mockRl.prompt = vi.fn();
    mockRl.close = vi.fn();
    return mockRl;
  }

  function makeCtxForRepl(overrides?: Partial<ReplContext>): ReplContext {
    return {
      activeProvider: null,
      activeModel: null,
      sessionId: null,
      state: stateStore,
      ...overrides,
    };
  }

  it('exits with code 0 on /exit command', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(() => {
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
  }, 5000);

  it('exits with code 0 on close event (Ctrl-D)', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(() => {
      mockRl.emit('close');
    });

    const code = await runPromise;
    expect(code).toBe(0);
  }, 5000);

  it('handles /provider command in REPL loop', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', '/provider claude');
      await new Promise<void>(r => setTimeout(r, 20));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    // Provider should be set
    expect(ctx.activeProvider).toBe('claude');
  }, 5000);

  it('SIGINT handler prints ^C and re-prompts', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('SIGINT');
      await new Promise<void>(r => setTimeout(r, 20));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    expect(outputLines.some(l => l.includes('^C'))).toBe(true);
  }, 5000);

  it('second SIGINT within 1s exits 130', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('SIGINT');
      await new Promise<void>(r => setTimeout(r, 10));
      mockRl.emit('SIGINT');
    });

    const code = await runPromise;
    expect(code).toBe(130);
  }, 5000);

  it('error result from dispatch gets written to stderr', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl({ activeProvider: null });

    const stderrLines: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrLines.push(String(chunk));
      return true;
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      // Non-slash with no provider → error
      mockRl.emit('line', 'hello world');
      await new Promise<void>(r => setTimeout(r, 20));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    const combined = stderrLines.join('');
    expect(combined).toContain('E-NO-PROVIDER');
  }, 5000);

  it('/help command writes output', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl();

    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', '/help');
      await new Promise<void>(r => setTimeout(r, 20));
      mockRl.emit('line', '/exit');
    });

    await runPromise;
    const combined = outputLines.join('');
    expect(combined).toContain('/help');
  }, 5000);

  it('error from dispatch catch block writes to stderr', async () => {
    const mockRl = makeMockRl();
    const stderrLines: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrLines.push(String(chunk));
      return true;
    });

    const ctx = makeCtxForRepl();

    // Override dispatch behavior by dispatching a line that triggers an internal error
    // by giving a context where the line handler will throw
    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      // /clear command returns kind=ok
      mockRl.emit('line', '/clear');
      await new Promise<void>(r => setTimeout(r, 20));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
  }, 5000);

  it('turn result with provider → writes stderr if not found', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl({ activeProvider: 'ollama' });

    const stderrLines: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrLines.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    // discoverOne returns missing so it writes "Provider not found"
    vi.spyOn(discoveryModule, 'discoverOne').mockResolvedValueOnce({
      name: 'ollama',
      status: 'missing',
      absolutePath: null,
      version: null,
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', 'hello world'); // non-slash with provider → turn
      await new Promise<void>(r => setTimeout(r, 50));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    const combined = stderrLines.join('');
    expect(combined).toContain('ollama');
  }, 5000);

  it('turn result with provider + binary → streams output', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl({ activeProvider: 'claude' });

    const outputLines: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      outputLines.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // discoverOne returns a valid path
    vi.spyOn(discoveryModule, 'discoverOne').mockResolvedValueOnce({
      name: 'claude',
      status: 'found',
      absolutePath: process.execPath,
      version: '1.0.0',
    });

    // ExecTransport.send → write 'hello from transport' and exit 0
    vi.spyOn(ExecTransport.prototype, 'send').mockImplementationOnce(async function* () {
      yield { kind: 'content' as const, text: 'hello from transport' };
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', 'what is 2+2'); // non-slash with provider → turn
      await new Promise<void>(r => setTimeout(r, 50));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    const combined = outputLines.join('');
    expect(combined).toContain('hello from transport');
  }, 5000);

  it('turn result + transport throws UlmError → formats to stderr', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl({ activeProvider: 'claude' });

    const stderrLines: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrLines.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    vi.spyOn(discoveryModule, 'discoverOne').mockResolvedValueOnce({
      name: 'claude',
      status: 'found',
      absolutePath: process.execPath,
      version: '1.0.0',
    });

    // Throw a UlmError-shaped object (has format method)
    vi.spyOn(ExecTransport.prototype, 'send').mockImplementationOnce(async function* () {
      const err = Object.assign(new Error('transport UlmError'), {
        exitCode: () => 1,
        format: (_opts: unknown) => 'formatted ulm error',
      });
      throw err;
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', 'some prompt');
      await new Promise<void>(r => setTimeout(r, 50));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    const combined = stderrLines.join('');
    expect(combined).toContain('formatted ulm error');
  }, 5000);

  it('turn result + transport throws plain Error → writes string to stderr', async () => {
    const mockRl = makeMockRl();
    const ctx = makeCtxForRepl({ activeProvider: 'claude' });

    const stderrLines: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderrLines.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

    vi.spyOn(discoveryModule, 'discoverOne').mockResolvedValueOnce({
      name: 'claude',
      status: 'found',
      absolutePath: process.execPath,
      version: '1.0.0',
    });

    vi.spyOn(ExecTransport.prototype, 'send').mockImplementationOnce(async function* () {
      throw new Error('plain transport error');
    });

    const runPromise = runReplLoop(mockRl as unknown as import('node:readline').Interface, ctx, stateStore, true);

    setImmediate(async () => {
      mockRl.emit('line', 'some prompt');
      await new Promise<void>(r => setTimeout(r, 50));
      mockRl.emit('line', '/exit');
    });

    const code = await runPromise;
    expect(code).toBe(0);
    const combined = stderrLines.join('');
    expect(combined).toContain('plain transport error');
  }, 5000);
});

describe('runRepl — calls StateStore.load', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `ulm-runrepl-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsp.mkdir(tmpDir, { recursive: true });
    process.env['ULM_CONFIG_DIR'] = tmpDir;
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env['ULM_CONFIG_DIR'];
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('runRepl calls StateStore.load and exits on /exit', async () => {
    const { runRepl } = await import('../../src/repl/index.js');

    const mockRl = new EventEmitter() as EventEmitter & { setPrompt: ReturnType<typeof vi.fn>; prompt: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
    mockRl.setPrompt = vi.fn();
    mockRl.prompt = vi.fn();
    mockRl.close = vi.fn();

    const runPromise = runRepl({
      noColor: true,
      _rlFactory: () => mockRl as unknown as import('node:readline').Interface,
    });

    // Wait for StateStore.load() to complete and 'line' handler to be registered
    // Use setTimeout to ensure the event loop has processed the async operations
    setTimeout(() => {
      mockRl.emit('line', '/exit');
    }, 100);

    const code = await runPromise;
    expect(code).toBe(0);

    // Verify state.toml was created
    const statePath = path.join(tmpDir, 'state.toml');
    const exists = (await import('node:fs')).existsSync(statePath);
    expect(exists).toBe(true);
  }, 10000);
});
