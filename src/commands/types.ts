/**
 * Slash command types — F-06
 */

import type { UlmError } from '../errors/index.js';

export type DispatchResult =
  | { kind: 'ok'; output: string }
  | { kind: 'exit'; code: number }
  | { kind: 'error'; error: UlmError }
  | { kind: 'turn'; prompt: string }; // non-slash passthrough

export type Handler = (args: string[], ctx: ReplContext) => Promise<DispatchResult>;

export const HELP_ORDER = [
  '/help',
  '/provider',
  '/providers',
  '/model',
  '/sessions',
  '/resume',
  '/new',
  '/clear',
  '/exit',
] as const;

export type KnownCommand = (typeof HELP_ORDER)[number];

export interface ReplContext {
  activeProvider: string | null;
  activeModel: string | null;
  sessionId: string | null;
  state?: import('../state/index.js').StateStore;
  /** Override session store directory (for testing) */
  _sessionStoreDir?: string;
}
