/**
 * Error Surfaces — F-08
 * Provides all 13 UlmError subclasses, ANSI formatting, and exit-code mapping.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type UlmErrorCode =
  | 'E-CLI-MISSING'
  | 'E-CLI-UNAUTH'
  | 'E-CLI-CRASH'
  | 'E-CLI-TIMEOUT'
  | 'E-ACP-PROTOCOL'
  | 'E-HTTP-TIMEOUT'
  | 'E-INVALID-PROVIDER'
  | 'E-NO-PROVIDER'
  | 'E-STATE-LOCK-FAILED'
  | 'E-STATE-CORRUPT'
  | 'E-STATE-SCHEMA'
  | 'E-PROVIDER-VERSION'
  | 'E-PERMS';

export interface RenderOpts {
  color?: boolean;
  unicode?: boolean;
}

// ─── ANSI helpers ─────────────────────────────────────────────────────────────

function sgr(...codes: number[]): string {
  return `\x1B[${codes.join(';')}m`;
}

const RESET = sgr(0);
const RED = sgr(31);
const YELLOW = sgr(33);
const BOLD = sgr(1);

function ansi(text: string, ...codes: number[]): string {
  return `${sgr(...codes)}${text}${RESET}`;
}

// ─── Opts resolver ────────────────────────────────────────────────────────────

export function resolveRenderOpts(): RenderOpts {
  // Color: NO_COLOR disables, FORCE_COLOR enables, TTY otherwise
  let color: boolean;
  if (process.env['NO_COLOR'] !== undefined && process.env['NO_COLOR'] !== '') {
    color = false;
  } else if (process.env['FORCE_COLOR'] !== undefined && process.env['FORCE_COLOR'] !== '') {
    color = true;
  } else {
    color = process.stdout.isTTY === true;
  }

  // Unicode: check LANG and LC_ALL for UTF-8
  const lang = process.env['LANG'] ?? process.env['LC_ALL'] ?? '';
  const unicode = /utf-?8/i.test(lang) || process.platform !== 'win32';

  return { color, unicode };
}

// ─── Glyph helpers ────────────────────────────────────────────────────────────

function errorGlyph(opts: RenderOpts): string {
  return opts.unicode !== false ? '✗' : '[err]';
}

function warnGlyph(opts: RenderOpts): string {
  return opts.unicode !== false ? '⚠' : '[!]';
}

function formatPrefix(
  glyph: string,
  code: UlmErrorCode,
  glyphAnsi: string,
  opts: RenderOpts,
): string {
  if (opts.color) {
    return `${glyphAnsi}${glyph}${RESET} ${BOLD}${code}${RESET}:`;
  }
  return `${glyph} ${code}:`;
}

// ─── Abstract base ────────────────────────────────────────────────────────────

export abstract class UlmError extends Error {
  abstract readonly code: UlmErrorCode;
  abstract exitCode(): number;
  abstract isWarning(): boolean;
  abstract messageText(): string;

  format(opts?: RenderOpts): string {
    const resolved: RenderOpts = opts ?? resolveRenderOpts();
    const warning = this.isWarning();
    const glyph = warning ? warnGlyph(resolved) : errorGlyph(resolved);
    const glyphColor = warning ? YELLOW : RED;
    const prefix = formatPrefix(glyph, this.code, glyphColor, resolved);
    return `${prefix} ${this.messageText()}`;
  }
}

// ─── 13 concrete error classes ────────────────────────────────────────────────

export class CliMissing extends UlmError {
  readonly code = 'E-CLI-MISSING' as const;
  constructor(
    private readonly provider: string,
    private readonly docUrl: string,
  ) {
    super(`provider '${provider}': not installed. Install: ${docUrl}`);
  }
  messageText(): string {
    return `provider '${this.provider}': not installed. Install: ${this.docUrl}`;
  }
  exitCode(): number { return 127; }
  isWarning(): boolean { return false; }
}

export class CliUnauth extends UlmError {
  readonly code = 'E-CLI-UNAUTH' as const;
  constructor(private readonly provider: string) {
    super(`provider '${provider}' not authenticated. Run: ${provider} login`);
  }
  messageText(): string {
    return `provider '${this.provider}' not authenticated. Run: ${this.provider} login`;
  }
  exitCode(): number { return 126; }
  isWarning(): boolean { return false; }
}

export class CliCrash extends UlmError {
  readonly code = 'E-CLI-CRASH' as const;
  constructor(
    private readonly provider: string,
    private readonly providerExitCode: number,
  ) {
    super(`provider '${provider}' crashed (exit ${providerExitCode}). Output above may be partial.`);
  }
  messageText(): string {
    return `provider '${this.provider}' crashed (exit ${this.providerExitCode}). Output above may be partial.`;
  }
  exitCode(): number { return 1; }
  isWarning(): boolean { return false; }
}

export class CliTimeout extends UlmError {
  readonly code = 'E-CLI-TIMEOUT' as const;
  constructor(
    private readonly provider: string,
    private readonly seconds: number,
  ) {
    super(`provider '${provider}' timed out after ${seconds}s. Set ULM_TURN_TIMEOUT to extend.`);
  }
  messageText(): string {
    return `provider '${this.provider}' timed out after ${this.seconds}s. Set ULM_TURN_TIMEOUT to extend.`;
  }
  exitCode(): number { return 124; }
  isWarning(): boolean { return false; }
}

export class AcpProtocol extends UlmError {
  readonly code = 'E-ACP-PROTOCOL' as const;
  constructor(
    private readonly provider: string,
    private readonly detail: string,
  ) {
    super(`provider '${provider}' ACP error: ${detail}. Falling back to exec mode this turn.`);
  }
  messageText(): string {
    return `provider '${this.provider}' ACP error: ${this.detail}. Falling back to exec mode this turn.`;
  }
  exitCode(): number { return 69; }
  isWarning(): boolean { return false; }
}

export class HttpTimeout extends UlmError {
  readonly code = 'E-HTTP-TIMEOUT' as const;
  constructor() {
    super('ollama timeout after 30s. Is the daemon running?');
  }
  messageText(): string {
    return 'ollama timeout after 30s. Is the daemon running?';
  }
  exitCode(): number { return 1; }
  isWarning(): boolean { return false; }
}

export class InvalidProvider extends UlmError {
  readonly code = 'E-INVALID-PROVIDER' as const;
  constructor(private readonly providerName: string) {
    super(`unknown provider '${providerName}'. Valid: claude, codex, gemini, ollama`);
  }
  messageText(): string {
    return `unknown provider '${this.providerName}'. Valid: claude, codex, gemini, ollama`;
  }
  exitCode(): number { return 2; }
  isWarning(): boolean { return false; }
}

export class NoProvider extends UlmError {
  readonly code = 'E-NO-PROVIDER' as const;
  constructor() {
    super('no provider selected. Run: /provider <name>');
  }
  messageText(): string {
    return 'no provider selected. Run: /provider <name>';
  }
  exitCode(): number { return 2; }
  isWarning(): boolean { return false; }
}

export class StateLocked extends UlmError {
  readonly code = 'E-STATE-LOCK-FAILED' as const;
  constructor() {
    super('another ulm process is writing state. Retrying...');
  }
  messageText(): string {
    return 'another ulm process is writing state. Retrying...';
  }
  exitCode(): number { return 74; }
  isWarning(): boolean { return false; }
}

export class StateCorrupt extends UlmError {
  readonly code = 'E-STATE-CORRUPT' as const;
  constructor(private readonly path: string) {
    super(`${path} is corrupt. Move it aside and re-run.`);
  }
  messageText(): string {
    return `${this.path} is corrupt. Move it aside and re-run.`;
  }
  exitCode(): number { return 74; }
  isWarning(): boolean { return false; }
}

export class StateSchema extends UlmError {
  readonly code = 'E-STATE-SCHEMA' as const;
  constructor(
    private readonly found: number,
    private readonly supported: number,
  ) {
    super(`state.toml is from a newer ulm (v${found}, this is v${supported}). Upgrade ulm or use ULM_CONFIG_DIR.`);
  }
  messageText(): string {
    return `state.toml is from a newer ulm (v${this.found}, this is v${this.supported}). Upgrade ulm or use ULM_CONFIG_DIR.`;
  }
  exitCode(): number { return 74; }
  isWarning(): boolean { return false; }
}

export class ProviderVersion extends UlmError {
  readonly code = 'E-PROVIDER-VERSION' as const;
  constructor(
    private readonly provider: string,
    private readonly found: string,
    private readonly minimum: string,
  ) {
    super(`provider '${provider}' is v${found}, minimum v${minimum}. Some features may not work.`);
  }
  messageText(): string {
    return `provider '${this.provider}' is v${this.found}, minimum v${this.minimum}. Some features may not work.`;
  }
  exitCode(): number { return 0; }
  isWarning(): boolean { return true; }
}

export class Perms extends UlmError {
  readonly code = 'E-PERMS' as const;
  constructor(private readonly path: string) {
    super(`state.toml has insecure permissions. Run: chmod 0600 ${path}`);
  }
  messageText(): string {
    return `state.toml has insecure permissions. Run: chmod 0600 ${this.path}`;
  }
  exitCode(): number { return 77; }
  isWarning(): boolean { return false; }
}
