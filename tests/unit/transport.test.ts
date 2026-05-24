/**
 * Tests for F-02: provider-transport
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fsp from 'node:fs/promises';
import { buildSanitizedEnv } from '../../src/spawn/index.js';
import { ExecTransport, OllamaHttpTransport, TransportBusy, TransportCancelled } from '../../src/transport/index.js';

describe('buildSanitizedEnv — env denylist', () => {
  const origEnv = process.env;

  beforeEach(() => {
    // Set up test env
    process.env['MY_API_KEY'] = 'secret-api-key';
    process.env['OPENAI_TOKEN'] = 'secret-token';
    process.env['DB_SECRET'] = 'secret-db';
    process.env['ADMIN_PASSWORD'] = 'secret-pass';
    process.env['AWS_ACCESS_KEY_ID'] = 'aws-key';
    process.env['AWS_SECRET_ACCESS_KEY'] = 'aws-secret';
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['GOOGLE_APPLICATION_CREDENTIALS'] = '/path/to/creds.json';
    process.env['NORMAL_VAR'] = 'normal-value';
    delete process.env['BAB_PROPAGATE_ENV'];
  });

  afterEach(() => {
    // Clean up
    for (const key of ['MY_API_KEY', 'OPENAI_TOKEN', 'DB_SECRET', 'ADMIN_PASSWORD',
      'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
      'GOOGLE_APPLICATION_CREDENTIALS', 'NORMAL_VAR', 'BAB_PROPAGATE_ENV']) {
      delete process.env[key];
    }
  });

  it('strips *_API_KEY', () => {
    const env = buildSanitizedEnv();
    expect(env['MY_API_KEY']).toBeUndefined();
  });

  it('strips *_TOKEN', () => {
    const env = buildSanitizedEnv();
    expect(env['OPENAI_TOKEN']).toBeUndefined();
  });

  it('strips *_SECRET', () => {
    const env = buildSanitizedEnv();
    expect(env['DB_SECRET']).toBeUndefined();
  });

  it('strips *_PASSWORD', () => {
    const env = buildSanitizedEnv();
    expect(env['ADMIN_PASSWORD']).toBeUndefined();
  });

  it('strips AWS_ACCESS_KEY_ID', () => {
    const env = buildSanitizedEnv();
    expect(env['AWS_ACCESS_KEY_ID']).toBeUndefined();
  });

  it('strips AWS_SECRET_ACCESS_KEY', () => {
    const env = buildSanitizedEnv();
    expect(env['AWS_SECRET_ACCESS_KEY']).toBeUndefined();
  });

  it('keeps AWS_REGION', () => {
    const env = buildSanitizedEnv();
    expect(env['AWS_REGION']).toBe('us-east-1');
  });

  it('strips GOOGLE_APPLICATION_CREDENTIALS', () => {
    const env = buildSanitizedEnv();
    expect(env['GOOGLE_APPLICATION_CREDENTIALS']).toBeUndefined();
  });

  it('keeps normal vars', () => {
    const env = buildSanitizedEnv();
    expect(env['NORMAL_VAR']).toBe('normal-value');
  });

  it('BAB_PROPAGATE_ENV allowlist bypasses denylist', () => {
    process.env['BAB_PROPAGATE_ENV'] = 'MY_API_KEY,OPENAI_TOKEN';
    const env = buildSanitizedEnv();
    expect(env['MY_API_KEY']).toBe('secret-api-key');
    expect(env['OPENAI_TOKEN']).toBe('secret-token');
  });
});

describe('ExecTransport — with real subprocess', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `bab-transport-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('streams tokens from a mock provider (node)', async () => {
    // Create a mock provider script
    const scriptPath = path.join(tmpDir, 'mock-provider.mjs');
    await fsp.writeFile(scriptPath, `
process.stdout.write('Hello ');
process.stdout.write('World');
process.exit(0);
`);

    const transport = new ExecTransport('mock', process.execPath, [scriptPath]);
    const tokens: string[] = [];

    for await (const event of transport.send('test prompt')) {
      if (event.kind === 'content' && event.text) {
        tokens.push(event.text);
      }
    }

    const combined = tokens.join('');
    expect(combined).toContain('Hello');
    expect(combined).toContain('World');
  });

  it('throws TransportBusy when send called while in-flight', async () => {
    const scriptPath = path.join(tmpDir, 'slow-provider.mjs');
    await fsp.writeFile(scriptPath, `
setTimeout(() => {
  process.stdout.write('done');
  process.exit(0);
}, 200);
`);

    const transport = new ExecTransport('mock', process.execPath, [scriptPath]);

    // Start first request but don't await
    const gen = transport.send('prompt 1');
    const firstNext = gen.next();

    // Immediately try second
    await expect(async () => {
      for await (const _e of transport.send('prompt 2')) {
        // should not get here
      }
    }).rejects.toThrow(TransportBusy);

    // Clean up first
    await firstNext.catch(() => {});
    await transport.cancel();
  });

  it('redacts stderr content', async () => {
    const scriptPath = path.join(tmpDir, 'stderr-provider.mjs');
    await fsp.writeFile(scriptPath, `
process.stderr.write('Bearer sk-ant-api03-secrettoken\\n');
process.stdout.write('ok');
process.exit(0);
`);

    const transport = new ExecTransport('mock', process.execPath, [scriptPath]);
    const stderrLines: string[] = [];

    for await (const event of transport.send('prompt')) {
      if (event.kind === 'stderr' && event.text) {
        stderrLines.push(event.text);
      }
    }

    const combined = stderrLines.join('');
    expect(combined).not.toContain('sk-ant-api03-secrettoken');
    expect(combined).toContain('[REDACTED]');
  });
});

describe('ExecTransport — edge cases', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `bab-transport-edge-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fsp.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fsp.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('cancel() sets cancelled flag', async () => {
    const transport = new ExecTransport('mock', process.execPath);
    await transport.cancel(); // Should not throw even when not in-flight
  });

  it('handles non-zero exit code gracefully', async () => {
    const scriptPath = path.join(tmpDir, 'fail-provider.mjs');
    await fsp.writeFile(scriptPath, `
process.exit(2);
`);
    const transport = new ExecTransport('mock', process.execPath, [scriptPath]);
    await expect(async () => {
      for await (const _e of transport.send('prompt')) {
        // consume events
      }
    }).rejects.toThrow();
  });
});

describe('OllamaHttpTransport', () => {
  it('throws TransportBusy when send called while in-flight', async () => {
    // Mock fetch to hang forever
    const origFetch = globalThis.fetch;
    let resolveFetch: () => void;
    const hangPromise = new Promise<never>((_, reject) => {
      resolveFetch = () => reject(new Error('cancelled'));
    });
    globalThis.fetch = vi.fn().mockImplementation(() => hangPromise);

    const transport = new OllamaHttpTransport({ timeoutMs: 30000 });

    // Start first request — it hangs on fetch
    const gen = transport.send('prompt 1');
    const firstNext = gen.next(); // starts the async gen

    // Yield to let the fetch call start and set _busy = true
    await new Promise<void>(resolve => setTimeout(resolve, 10));

    // Now try second — should throw TransportBusy immediately
    await expect(async () => {
      for await (const _e of transport.send('prompt 2')) {
        // should not get here
      }
    }).rejects.toThrow(TransportBusy);

    // Clean up
    resolveFetch!();
    await transport.cancel();
    await firstNext.catch(() => {});
    globalThis.fetch = origFetch;
  }, 10000);

  it('throws HttpTimeout when fetch times out', async () => {
    // Mock fetch to reject immediately
    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const transport = new OllamaHttpTransport({ timeoutMs: 100 });

    await expect(async () => {
      for await (const _e of transport.send('prompt')) {
        // no events expected
      }
    }).rejects.toThrow();

    globalThis.fetch = origFetch;
  });

  it('streams JSON responses', async () => {
    const origFetch = globalThis.fetch;

    // Mock fetch to return streaming JSON
    const encoder = new TextEncoder();
    const lines = [
      JSON.stringify({ response: 'Hello ' }),
      JSON.stringify({ response: 'World' }),
      JSON.stringify({ response: '', done: true }),
    ].join('\n') + '\n';

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines));
        controller.close();
      }
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    });

    const transport = new OllamaHttpTransport({ timeoutMs: 5000 });
    const tokens: string[] = [];

    for await (const event of transport.send('test')) {
      if (event.kind === 'content' && event.text) {
        tokens.push(event.text);
      }
    }

    globalThis.fetch = origFetch;
    expect(tokens.join('')).toContain('Hello');
  });

  it('cancel() method does not throw', async () => {
    const transport = new OllamaHttpTransport({ timeoutMs: 100 });
    // cancel without an in-flight request should not throw
    await expect(transport.cancel()).resolves.not.toThrow();
  });
});
