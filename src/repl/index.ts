/**
 * REPL Shell — F-03
 * Interactive REPL loop with readline, prompt rendering, and signal handling.
 */

import * as readline from 'node:readline';
import { resolveRenderOpts } from '../errors/index.js';
import { StateStore } from '../state/index.js';
import { dispatch, type ReplContext } from '../commands/index.js';
import { ExecTransport } from '../transport/index.js';
import { discoverOne } from '../discovery/index.js';

export interface ReplOpts {
  noColor?: boolean;
  model?: string;
  provider?: string;
  /** Optional factory for readline interface (for testing) */
  _rlFactory?: (opts: readline.ReadLineOptions) => readline.Interface;
}

/**
 * Render the REPL prompt string.
 */
export function renderPrompt(ctx: ReplContext, noColor = false): string {
  const useColor = !noColor && !process.env['NO_COLOR'] && process.stdout.isTTY === true;

  if (!ctx.activeProvider) {
    return 'bab> ';
  }

  if (useColor) {
    return `\x1B[1mbab (${ctx.activeProvider})>\x1B[0m `;
  }
  return `bab (${ctx.activeProvider})> `;
}

/**
 * Run the REPL loop given a readline interface (extracted for testability).
 */
export async function runReplLoop(
  rl: readline.Interface,
  ctx: ReplContext,
  state: StateStore,
  noColor: boolean,
): Promise<number> {
  return new Promise<number>((resolve) => {
    let lastCtrlC = 0;

    rl.setPrompt(renderPrompt(ctx, noColor));
    rl.prompt();

    rl.on('line', async (line: string) => {
      try {
        const result = await dispatch(line, ctx);

        if (result.kind === 'exit') {
          rl.close();
          resolve(result.code);
          return;
        }

        if (result.kind === 'ok') {
          if (result.output) {
            process.stdout.write(result.output + '\n');
          }
        } else if (result.kind === 'error') {
          const renderOpts = resolveRenderOpts();
          if (noColor) renderOpts.color = false;
          process.stderr.write(result.error.format(renderOpts) + '\n');
        } else if (result.kind === 'turn') {
          // Stream turn through transport
          if (ctx.activeProvider) {
            try {
              const discResult = await discoverOne(ctx.activeProvider as Parameters<typeof discoverOne>[0], state);
              if (discResult.absolutePath) {
                const transport = new ExecTransport(ctx.activeProvider, discResult.absolutePath);
                for await (const event of transport.send(result.prompt, ctx.sessionId ?? undefined)) {
                  if (event.kind === 'content' && event.text) {
                    process.stdout.write(event.text);
                  } else if (event.kind === 'stderr' && event.text) {
                    process.stderr.write(event.text);
                  }
                }
                process.stdout.write('\n');
              } else {
                process.stderr.write(`Provider '${ctx.activeProvider}' not found.\n`);
              }
            } catch (err) {
              const renderOpts = resolveRenderOpts();
              if (noColor) renderOpts.color = false;
              if (err && typeof err === 'object' && 'format' in err) {
                process.stderr.write((err as { format: (o: typeof renderOpts) => string }).format(renderOpts) + '\n');
              } else {
                process.stderr.write(String(err) + '\n');
              }
            }
          }
        }
      } catch (err) {
        process.stderr.write(`Error: ${String(err)}\n`);
      }

      // Update prompt (provider may have changed)
      rl.setPrompt(renderPrompt(ctx, noColor));
      rl.prompt();
    });

    // Ctrl-D on empty buffer → exit 0
    rl.on('close', () => {
      resolve(0);
    });

    // Handle SIGINT (Ctrl-C)
    rl.on('SIGINT', () => {
      const now = Date.now();
      if (now - lastCtrlC < 1000) {
        rl.close();
        resolve(130);
        return;
      }
      lastCtrlC = now;
      process.stdout.write('^C\n');
      rl.setPrompt(renderPrompt(ctx, noColor));
      rl.prompt(true);
    });
  });
}

/**
 * Run the interactive REPL loop.
 */
export async function runRepl(opts: ReplOpts = {}): Promise<number> {
  const state = await StateStore.load();

  const ctx: ReplContext = {
    activeProvider: opts.provider ?? null,
    activeModel: opts.model ?? null,
    sessionId: null,
    state,
  };

  const noColor = opts.noColor === true || !!process.env['NO_COLOR'];

  const rlFactory = opts._rlFactory ?? readline.createInterface;
  const rl = rlFactory({
    input: process.stdin,
    output: process.stdout,
    historySize: 1000,
    prompt: renderPrompt(ctx, noColor),
  });

  return runReplLoop(rl, ctx, state, noColor);
}
