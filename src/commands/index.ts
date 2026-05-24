/**
 * Slash commands dispatcher — F-06
 * Parses and dispatches slash commands from REPL input.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';
import { distance } from 'fastest-levenshtein';
import { NoProvider, InvalidProvider } from '../errors/index.js';
import type { DispatchResult, ReplContext, Handler } from './types.js';
import { HELP_ORDER } from './types.js';
import { discoverAll, formatProviders } from '../discovery/index.js';
import { StateStore } from '../state/index.js';

// Re-export types
export type { DispatchResult, ReplContext } from './types.js';
export { HELP_ORDER } from './types.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// ─── Help text ────────────────────────────────────────────────────────────────

const HELP_TEXT = `bab — unified CLI gateway to Claude, Codex, Gemini, and Ollama

Commands:
  /help                Show this help message
  /provider <name>     Set the active provider (claude, codex, gemini, ollama)
  /providers           List all discovered providers and their status
  /model <name>        Set the model for the active provider
  /sessions            List saved sessions for the active provider
  /resume <id>         Resume a saved session by ID
  /new                 Start a new session (clears current session ID)
  /clear               Clear the screen
  /exit                Exit bab

Type any non-command text to send a prompt to the active provider.
`;

const VALID_PROVIDERS = ['claude', 'codex', 'gemini', 'ollama'] as const;
type ValidProvider = (typeof VALID_PROVIDERS)[number];

// ─── Command handlers ─────────────────────────────────────────────────────────

const handlers: Record<string, Handler> = {
  '/help': async (_args, _ctx) => {
    return { kind: 'ok', output: HELP_TEXT };
  },

  '/provider': async (args, ctx) => {
    if (args.length === 0) {
      const current = ctx.activeProvider ?? '(none)';
      return { kind: 'ok', output: `Active provider: ${current}` };
    }
    const name = args[0]!;
    if (!VALID_PROVIDERS.includes(name as ValidProvider)) {
      return { kind: 'error', error: new InvalidProvider(name) };
    }
    ctx.activeProvider = name;
    return { kind: 'ok', output: `Provider set to: ${name}` };
  },

  '/providers': async (_args, ctx) => {
    try {
      const state = ctx.state ?? await StateStore.load();
      const results = await discoverAll(state);
      const output = formatProviders(results, { color: false, unicode: true });
      return { kind: 'ok', output };
    } catch {
      return { kind: 'ok', output: 'Failed to discover providers.' };
    }
  },

  '/model': async (args, ctx) => {
    if (args.length === 0) {
      const current = ctx.activeModel ?? '(none)';
      return { kind: 'ok', output: `Active model: ${current}` };
    }
    ctx.activeModel = args[0] ?? null;
    return { kind: 'ok', output: `Model set to: ${args[0]}` };
  },

  '/sessions': async (_args, ctx) => {
    // Delegate to session management (imported lazily to avoid circular deps)
    const { sessionList } = await import('../sessions/index.js');
    return sessionList(ctx);
  },

  '/resume': async (args, ctx) => {
    const { sessionResume } = await import('../sessions/index.js');
    return sessionResume(ctx, args);
  },

  '/new': async (_args, ctx) => {
    const { sessionNew } = await import('../sessions/index.js');
    return sessionNew(ctx);
  },

  '/clear': async (_args, _ctx) => {
    // Emit clear escape on TTY
    if (process.stdout.isTTY) {
      process.stdout.write('\x1B[2J\x1B[H');
    }
    return { kind: 'ok', output: '' };
  },

  '/exit': async (_args, _ctx) => {
    return { kind: 'exit', code: 0 };
  },
};

// ─── Tokenizer ────────────────────────────────────────────────────────────────

function tokenize(input: string): { cmd: string; args: string[] } {
  const parts = input.trim().split(/\s+/);
  return {
    cmd: parts[0] ?? '',
    args: parts.slice(1),
  };
}

// ─── Suggestion ───────────────────────────────────────────────────────────────

function suggest(cmd: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  let bestOrder = Infinity;

  for (const known of HELP_ORDER) {
    const dist = distance(cmd, known);
    const order = HELP_ORDER.indexOf(known as (typeof HELP_ORDER)[number]);
    if (dist < bestDist || (dist === bestDist && order < bestOrder)) {
      bestDist = dist;
      best = known;
      bestOrder = order;
    }
  }

  if (bestDist <= 2) return best;
  return null;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Dispatch a line of input from the REPL.
 */
export async function dispatch(input: string, ctx: ReplContext): Promise<DispatchResult> {
  const trimmed = input.trim();

  // Non-slash input: passthrough as prompt turn
  if (!trimmed.startsWith('/')) {
    if (!ctx.activeProvider) {
      return { kind: 'error', error: new NoProvider() };
    }
    return { kind: 'turn', prompt: trimmed };
  }

  const { cmd, args } = tokenize(trimmed);

  // Known command
  const handler = handlers[cmd];
  if (handler) {
    return handler(args, ctx);
  }

  // Unknown command: suggest
  const hint = suggest(cmd);
  const suggestion = hint ? ` Did you mean ${hint}?` : '';
  return {
    kind: 'error',
    error: new InvalidProvider(`${cmd} is not a known command.${suggestion}`),
  };
}
