/**
 * bab — Unified CLI gateway to Claude, Codex, Gemini, and Ollama
 * Entry point — wires F-07 (one-shot) and F-03 (repl-shell).
 */

export { main } from './cli/index.js';
export * from './errors/index.js';
export * from './redact/index.js';
export { StateStore, resolveConfigDir } from './state/index.js';
export { discoverAll, discoverOne, formatProviders } from './discovery/index.js';
export { ExecTransport, OllamaHttpTransport, DaemonSocketTransport } from './transport/index.js';
export { spawnProvider, buildSanitizedEnv } from './spawn/index.js';
export { emit as emitTelemetry } from './telemetry/index.js';
export { dispatch } from './commands/index.js';
export { sessionList, sessionNew, sessionResume } from './sessions/index.js';
export { runOneShot } from './oneshot/index.js';
export { runRepl, renderPrompt } from './repl/index.js';
