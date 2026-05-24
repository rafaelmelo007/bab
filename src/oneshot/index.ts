/**
 * One-Shot Mode — F-07
 * Reads prompt from positional args and/or stdin, runs it through the transport, streams to stdout.
 */

import * as readline from 'node:readline';
import { resolveRenderOpts, InvalidProvider, NoProvider, type BabError } from '../errors/index.js';
import { ExecTransport } from '../transport/index.js';
import { StateStore } from '../state/index.js';
import { discoverOne } from '../discovery/index.js';

// Extra error types for one-shot mode
export class CliNoPrompt extends Error {
  readonly code = 'E-CLI-NO-PROMPT' as const;
  readonly message_: string;

  constructor(kind: 'tty' | 'empty-pipe') {
    const msg = kind === 'tty'
      ? 'No prompt provided. Pass a prompt as an argument or pipe via stdin.'
      : 'Empty stdin. Pass a prompt as an argument or pipe via stdin.';
    super(msg);
    this.message_ = msg;
  }

  exitCode(): number { return 2; }
}

export class CliInvalidUtf8 extends Error {
  readonly code = 'E-CLI-INVALID-UTF8' as const;

  constructor() {
    super('stdin contains invalid UTF-8. Only UTF-8 encoded input is supported.');
  }

  exitCode(): number { return 2; }
}

export interface OneShotOpts {
  provider: string;
  positionalArgs: string[];
  noColor?: boolean;
  model?: string;
  /** Override discovery function for testing */
  _discoverProvider?: (provider: string) => Promise<string | null>;
}

/**
 * Read stdin to EOF and return the content.
 */
async function readStdin(): Promise<string | null> {
  if (process.stdin.isTTY) {
    return null; // TTY stdin — no piped input
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    process.stdin.on('end', () => {
      const combined = Buffer.concat(chunks);
      // Validate UTF-8
      try {
        const text = combined.toString('utf-8');
        resolve(text);
      } catch {
        reject(new CliInvalidUtf8());
      }
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Run a one-shot prompt through the given provider.
 * Returns process exit code.
 */
export async function runOneShot(opts: OneShotOpts): Promise<number> {
  const renderOpts = resolveRenderOpts();
  if (opts.noColor) renderOpts.color = false;

  // Validate provider
  const validProviders = ['claude', 'codex', 'gemini', 'ollama'];
  if (!validProviders.includes(opts.provider)) {
    const err = new InvalidProvider(opts.provider);
    process.stderr.write(err.format(renderOpts) + '\n');
    return err.exitCode();
  }

  // Build prompt
  const positional = opts.positionalArgs.join(' ');
  let stdinText: string | null = null;

  try {
    stdinText = await readStdin();
  } catch (err) {
    if (err instanceof CliInvalidUtf8) {
      process.stderr.write(err.message + '\n');
      return err.exitCode();
    }
    throw err;
  }

  // Remove trailing newline from stdin
  if (stdinText !== null) {
    stdinText = stdinText.replace(/\n$/, '');
  }

  let prompt: string;
  if (positional && stdinText !== null && stdinText !== '') {
    // Both positional and stdin: concatenate with \n\n
    prompt = positional + '\n\n' + stdinText;
  } else if (positional) {
    prompt = positional;
  } else if (stdinText !== null && stdinText !== '') {
    prompt = stdinText;
  } else if (stdinText === null) {
    // TTY stdin and no positional
    const err = new CliNoPrompt('tty');
    process.stderr.write(err.message + '\n');
    return err.exitCode();
  } else {
    // Empty piped stdin and no positional
    const err = new CliNoPrompt('empty-pipe');
    process.stderr.write(err.message + '\n');
    return err.exitCode();
  }

  // Discover provider
  let absolutePath: string;
  try {
    if (opts._discoverProvider) {
      const discovered = await opts._discoverProvider(opts.provider);
      if (!discovered) {
        const err = new InvalidProvider(opts.provider);
        process.stderr.write(err.format(renderOpts) + '\n');
        return 127;
      }
      absolutePath = discovered;
    } else {
      const state = await StateStore.load();
      const result = await discoverOne(opts.provider as Parameters<typeof discoverOne>[0], state);
      if (result.status === 'missing' || !result.absolutePath) {
        const err = new InvalidProvider(opts.provider);
        process.stderr.write(err.format(renderOpts) + '\n');
        return 127;
      }
      absolutePath = result.absolutePath;
    }
  } catch {
    const err = new InvalidProvider(opts.provider);
    process.stderr.write(err.format(renderOpts) + '\n');
    return 127;
  }

  // Stream output
  const transport = new ExecTransport(opts.provider, absolutePath);
  try {
    for await (const event of transport.send(prompt)) {
      if (event.kind === 'content' && event.text) {
        process.stdout.write(event.text);
      } else if (event.kind === 'stderr' && event.text) {
        process.stderr.write(event.text);
      }
    }
    return 0;
  } catch (err) {
    if (err && typeof err === 'object' && 'exitCode' in err && typeof (err as BabError).exitCode === 'function') {
      const babErr = err as BabError;
      process.stderr.write(babErr.format(renderOpts) + '\n');
      return babErr.exitCode();
    }
    throw err;
  }
}
