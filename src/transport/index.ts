/**
 * Provider Transport — F-02
 * Abstractions for streaming tokens from different provider backends.
 */

import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';
import treeKill from 'tree-kill';
import { scrub } from '../redact/index.js';
import { spawnProvider, buildSanitizedEnv } from '../spawn/index.js';
import { CliTimeout, CliCrash, HttpTimeout } from '../errors/index.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenEvent {
  kind: 'content' | 'stderr' | 'meta';
  text?: string;
  frame?: unknown;
}

export interface SendOpts {
  sessionId?: string;
  timeoutMs?: number;
}

export interface ProviderTransport {
  send(prompt: string, sessionId?: string, opts?: SendOpts): AsyncIterable<TokenEvent>;
  cancel(): Promise<void>;
}

// Error classes for transport-level issues
export class TransportBusy extends Error {
  constructor() {
    super('Transport is already busy with a request. Cancel the current request first.');
    this.name = 'TransportBusy';
  }
}

export class TransportCancelled extends Error {
  constructor() {
    super('Transport request was cancelled.');
    this.name = 'TransportCancelled';
  }
}

// ─── ExecTransport ────────────────────────────────────────────────────────────

export class ExecTransport implements ProviderTransport {
  private _busy = false;
  private _child: ChildProcess | null = null;
  private _cancelled = false;
  private readonly _provider: string;
  private readonly _absolutePath: string;
  private readonly _extraArgs: string[];

  constructor(provider: string, absolutePath: string, extraArgs: string[] = []) {
    this._provider = provider;
    this._absolutePath = absolutePath;
    this._extraArgs = extraArgs;
  }

  async *send(prompt: string, sessionId?: string, opts?: SendOpts): AsyncIterable<TokenEvent> {
    if (this._busy) {
      throw new TransportBusy();
    }
    this._busy = true;
    this._cancelled = false;

    const timeoutMs = opts?.timeoutMs
      ?? (process.env['ULM_TURN_TIMEOUT'] ? parseInt(process.env['ULM_TURN_TIMEOUT'], 10) * 1000 : 60_000);

    const args = [...this._extraArgs];
    if (sessionId) {
      args.push('--session', sessionId);
    }
    args.push(prompt);

    const env = buildSanitizedEnv();
    const child = spawnProvider(this._absolutePath, args, { env });
    this._child = child;

    // Timeout
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      this._killChild();
    }, timeoutMs);

    try {
      yield* this._streamChild(child, timedOut);

      if (timedOut) {
        throw new CliTimeout(this._provider, Math.round(timeoutMs / 1000));
      }
    } finally {
      clearTimeout(timer);
      this._busy = false;
      this._child = null;
    }
  }

  private async *_streamChild(child: ChildProcess, timedOut: boolean): AsyncIterable<TokenEvent> {
    const events: TokenEvent[] = [];
    let done = false;
    let exitCode: number | null = null;
    const emitter = new EventEmitter();

    child.stdout?.on('data', (chunk: Buffer) => {
      events.push({ kind: 'content', text: chunk.toString('utf-8') });
      emitter.emit('data');
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = scrub(chunk.toString('utf-8'));
      events.push({ kind: 'stderr', text });
      emitter.emit('data');
    });

    child.on('close', (code) => {
      exitCode = code;
      done = true;
      emitter.emit('done');
    });

    child.on('error', () => {
      done = true;
      emitter.emit('done');
    });

    // Yield events as they arrive
    while (!done) {
      if (this._cancelled) {
        throw new TransportCancelled();
      }

      while (events.length > 0) {
        yield events.shift()!;
      }

      if (!done) {
        await new Promise<void>(resolve => {
          const onData = () => { emitter.off('done', onDone); resolve(); };
          const onDone = () => { emitter.off('data', onData); resolve(); };
          emitter.once('data', onData);
          emitter.once('done', onDone);
        });
      }
    }

    // Drain remaining
    while (events.length > 0) {
      yield events.shift()!;
    }

    if (this._cancelled) {
      throw new TransportCancelled();
    }

    if (timedOut) {
      return;
    }

    if (exitCode !== null && exitCode !== 0) {
      throw new CliCrash(this._provider, exitCode);
    }
  }

  private _killChild(): void {
    if (this._child?.pid) {
      setTimeout(() => {
        if (this._child?.pid) {
          treeKill(this._child.pid, 'SIGTERM');
        }
      }, 500);
      setTimeout(() => {
        if (this._child?.pid) {
          treeKill(this._child.pid, 'SIGKILL');
        }
      }, 1000);
    }
  }

  async cancel(): Promise<void> {
    this._cancelled = true;
    this._killChild();
  }
}

// ─── OllamaHttpTransport ──────────────────────────────────────────────────────

export interface OllamaOpts {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export class OllamaHttpTransport implements ProviderTransport {
  private _busy = false;
  private _cancelled = false;
  private _controller: AbortController | null = null;
  private readonly _baseUrl: string;
  private readonly _model: string;
  private readonly _timeoutMs: number;

  constructor(opts?: OllamaOpts) {
    this._baseUrl = opts?.baseUrl ?? 'http://127.0.0.1:11434';
    this._model = opts?.model ?? 'llama3';
    this._timeoutMs = opts?.timeoutMs ?? 30_000;
  }

  async *send(prompt: string, _sessionId?: string, _opts?: SendOpts): AsyncIterable<TokenEvent> {
    if (this._busy) {
      throw new TransportBusy();
    }
    this._busy = true;
    this._cancelled = false;

    const controller = new AbortController();
    this._controller = controller;

    const timer = setTimeout(() => controller.abort(), this._timeoutMs);

    try {
      let response: Response;
      try {
        response = await fetch(`${this._baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: this._model, prompt, stream: true }),
          signal: controller.signal,
        });
      } catch (err) {
        if (this._cancelled) {
          throw new TransportCancelled();
        }
        throw new HttpTimeout();
      }

      if (!response.ok) {
        throw new HttpTimeout();
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new HttpTimeout();
      }

      const decoder = new TextDecoder();
      try {
        while (true) {
          if (this._cancelled) {
            throw new TransportCancelled();
          }

          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            if (!line.trim()) continue;
            try {
              const obj = JSON.parse(line) as Record<string, unknown>;
              if (typeof obj['response'] === 'string') {
                yield { kind: 'content', text: obj['response'] };
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } finally {
      clearTimeout(timer);
      this._busy = false;
      this._controller = null;
    }
  }

  async cancel(): Promise<void> {
    this._cancelled = true;
    this._controller?.abort();
  }
}

// ─── DaemonSocketTransport (stub) ─────────────────────────────────────────────

export class DaemonSocketTransport implements ProviderTransport {
  private readonly _delegate: ExecTransport;

  constructor(provider: string, absolutePath: string) {
    // Stub: delegates to ExecTransport
    this._delegate = new ExecTransport(provider, absolutePath);
  }

  async *send(prompt: string, sessionId?: string, opts?: SendOpts): AsyncIterable<TokenEvent> {
    yield* this._delegate.send(prompt, sessionId, opts);
  }

  async cancel(): Promise<void> {
    return this._delegate.cancel();
  }
}
