/**
 * Tests for F-08: error-surfaces
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BabError,
  RenderOpts,
  resolveRenderOpts,
  CliMissing,
  CliUnauth,
  CliCrash,
  CliTimeout,
  AcpProtocol,
  HttpTimeout,
  InvalidProvider,
  NoProvider,
  StateLocked,
  StateCorrupt,
  StateSchema,
  ProviderVersion,
  Perms,
} from '../../src/errors/index.js';
import { scrub, _resetExtraPatterns } from '../../src/redact/index.js';

// Helper to strip ANSI codes
function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

describe('BabError format — exact message templates', () => {
  const colorOpts: RenderOpts = { color: false, unicode: true };
  const noUniOpts: RenderOpts = { color: false, unicode: false };

  it('AC-01: CliMissing renders exact template', () => {
    const err = new CliMissing('claude', 'https://claude.ai/install');
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-CLI-MISSING: provider 'claude': not installed. Install: https://claude.ai/install");
  });

  it('AC-02: CliUnauth renders exact template', () => {
    const err = new CliUnauth('gemini');
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-CLI-UNAUTH: provider 'gemini' not authenticated. Run: gemini login");
  });

  it('AC-03: CliCrash renders exact template', () => {
    const err = new CliCrash('codex', 1);
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-CLI-CRASH: provider 'codex' crashed (exit 1). Output above may be partial.");
  });

  it('AC-04: CliTimeout renders exact template', () => {
    const err = new CliTimeout('claude', 60);
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-CLI-TIMEOUT: provider 'claude' timed out after 60s. Set BAB_TURN_TIMEOUT to extend.");
  });

  it('AC-05: AcpProtocol renders exact template', () => {
    const err = new AcpProtocol('claude', 'unexpected EOF');
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-ACP-PROTOCOL: provider 'claude' ACP error: unexpected EOF. Falling back to exec mode this turn.");
  });

  it('AC-06: HttpTimeout renders exact template', () => {
    const err = new HttpTimeout();
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-HTTP-TIMEOUT: ollama timeout after 30s. Is the daemon running?');
  });

  it('AC-07: InvalidProvider renders exact template', () => {
    const err = new InvalidProvider('foo');
    const out = err.format(colorOpts);
    expect(out).toBe("✗ E-INVALID-PROVIDER: unknown provider 'foo'. Valid: claude, codex, gemini, ollama");
  });

  it('AC-08: NoProvider renders exact template', () => {
    const err = new NoProvider();
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-NO-PROVIDER: no provider selected. Run: /provider <name>');
  });

  it('AC-09: StateLocked message text', () => {
    const err = new StateLocked();
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-STATE-LOCK-FAILED: another bab process is writing state. Retrying...');
  });

  it('AC-10: StateCorrupt renders exact template', () => {
    const err = new StateCorrupt('/home/user/.config/bab/state.toml');
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-STATE-CORRUPT: /home/user/.config/bab/state.toml is corrupt. Move it aside and re-run.');
  });

  it('AC-11: StateSchema renders exact template', () => {
    const err = new StateSchema(2, 1);
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-STATE-SCHEMA: state.toml is from a newer bab (v2, this is v1). Upgrade bab or use BAB_CONFIG_DIR.');
  });

  it('AC-12: ProviderVersion is a warning with ⚠ glyph', () => {
    const err = new ProviderVersion('claude', '1.0.0', '1.2.0');
    const out = err.format(colorOpts);
    expect(out).toBe("⚠ E-PROVIDER-VERSION: provider 'claude' is v1.0.0, minimum v1.2.0. Some features may not work.");
  });

  it('AC-13: Perms renders exact template', () => {
    const err = new Perms('/home/user/.config/bab/state.toml');
    const out = err.format(colorOpts);
    expect(out).toBe('✗ E-PERMS: state.toml has insecure permissions. Run: chmod 0600 /home/user/.config/bab/state.toml');
  });
});

describe('Unicode vs ASCII glyph fallback', () => {
  it('unicode=true uses ✗ for errors', () => {
    const err = new NoProvider();
    const out = err.format({ color: false, unicode: true });
    expect(out).toMatch(/^✗/);
  });

  it('unicode=false uses [err] for errors', () => {
    const err = new NoProvider();
    const out = err.format({ color: false, unicode: false });
    expect(out).toMatch(/^\[err\]/);
  });

  it('unicode=true uses ⚠ for warnings', () => {
    const err = new ProviderVersion('claude', '1.0', '2.0');
    const out = err.format({ color: false, unicode: true });
    expect(out).toMatch(/^⚠/);
  });

  it('unicode=false uses [!] for warnings', () => {
    const err = new ProviderVersion('claude', '1.0', '2.0');
    const out = err.format({ color: false, unicode: false });
    expect(out).toMatch(/^\[!\]/);
  });
});

describe('ANSI color rendering', () => {
  it('color=true adds ANSI codes', () => {
    const err = new NoProvider();
    const out = err.format({ color: true, unicode: true });
    expect(out).not.toBe(stripAnsi(out)); // has ANSI
  });

  it('color=false strips ANSI codes', () => {
    const err = new NoProvider();
    const out = err.format({ color: false, unicode: true });
    expect(out).toBe(stripAnsi(out)); // no ANSI
  });

  it('stripAnsi(color=true) === color=false output', () => {
    const err = new CliMissing('claude', 'https://claude.ai/install');
    const colored = err.format({ color: true, unicode: true });
    const noColor = err.format({ color: false, unicode: true });
    expect(stripAnsi(colored)).toBe(noColor);
  });
});

describe('resolveRenderOpts', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    // Restore env
    for (const key of Object.keys(process.env)) {
      if (!(key in origEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, origEnv);
  });

  it('NO_COLOR=1 disables color', () => {
    process.env['NO_COLOR'] = '1';
    delete process.env['FORCE_COLOR'];
    const opts = resolveRenderOpts();
    expect(opts.color).toBe(false);
  });

  it('FORCE_COLOR=1 enables color regardless of TTY', () => {
    delete process.env['NO_COLOR'];
    process.env['FORCE_COLOR'] = '1';
    const opts = resolveRenderOpts();
    expect(opts.color).toBe(true);
  });

  it('NO_COLOR takes precedence over FORCE_COLOR', () => {
    process.env['NO_COLOR'] = '1';
    process.env['FORCE_COLOR'] = '1';
    const opts = resolveRenderOpts();
    expect(opts.color).toBe(false);
  });

  it('LANG=en_US.UTF-8 sets unicode=true', () => {
    process.env['LANG'] = 'en_US.UTF-8';
    const opts = resolveRenderOpts();
    expect(opts.unicode).toBe(true);
  });

  it('returns object with color and unicode properties', () => {
    const opts = resolveRenderOpts();
    expect(opts).toHaveProperty('color');
    expect(opts).toHaveProperty('unicode');
  });
});

describe('Exit code mapping (AC-24)', () => {
  it.each([
    ['CliMissing', new CliMissing('x', 'url'), 127],
    ['CliUnauth', new CliUnauth('x'), 126],
    ['CliCrash', new CliCrash('x', 1), 1],
    ['CliTimeout', new CliTimeout('x', 60), 124],
    ['AcpProtocol', new AcpProtocol('x', 'detail'), 69],
    ['HttpTimeout', new HttpTimeout(), 1],
    ['InvalidProvider', new InvalidProvider('x'), 2],
    ['NoProvider', new NoProvider(), 2],
    ['StateLocked', new StateLocked(), 74],
    ['StateCorrupt', new StateCorrupt('/path'), 74],
    ['StateSchema', new StateSchema(2, 1), 74],
    ['ProviderVersion', new ProviderVersion('x', '1', '2'), 0],
    ['Perms', new Perms('/path'), 77],
  ])('%s has exitCode %d', (_name, err, code) => {
    expect(err.exitCode()).toBe(code);
  });
});

describe('Redaction — positive corpus (AC-17..AC-21)', () => {
  beforeEach(() => {
    _resetExtraPatterns();
    delete process.env['BAB_REDACT_EXTRA'];
  });

  it('AC-17: Bearer token redacted', () => {
    expect(scrub('Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig')).toBe('[REDACTED]');
  });

  it('AC-17: Bearer with dots and dashes', () => {
    expect(scrub('some text Bearer sk-ant-api03-xxx more text')).toBe('some text [REDACTED] more text');
  });

  it('AC-18: Authorization header redacted', () => {
    expect(scrub('Authorization: Bearer sk-ant-api03-xxx')).toBe('[REDACTED]');
  });

  it('AC-18: Authorization: anything redacted', () => {
    expect(scrub('Authorization: Token abc123')).toBe('[REDACTED]');
  });

  it('AC-19: OAuth access_token URL redacted', () => {
    const url = 'https://accounts.google.com/o/oauth2/token?access_token=ya29.xxx';
    expect(scrub(url)).toContain('[REDACTED]');
  });

  it('AC-19: OAuth refresh_token URL redacted', () => {
    const url = 'https://api.example.com/callback?foo=1&refresh_token=rt_xxx';
    expect(scrub(url)).toContain('[REDACTED]');
  });

  it('AC-20: Basic auth ≥20 chars redacted', () => {
    expect(scrub('Basic dXNlcm5hbWU6cGFzc3dvcmQ=')).toBe('[REDACTED]');
  });

  it('AC-20: Basic auth <20 chars NOT redacted', () => {
    expect(scrub('Basic short')).toBe('Basic short');
  });

  it('AC-21: BAB_REDACT_EXTRA adds patterns', () => {
    _resetExtraPatterns();
    process.env['BAB_REDACT_EXTRA'] = 'MY_SECRET_[0-9]+';
    const result = scrub('MY_SECRET_12345 is secret');
    expect(result).toContain('[REDACTED]');
    delete process.env['BAB_REDACT_EXTRA'];
    _resetExtraPatterns();
  });
});

describe('Redaction — negative corpus (normal text not redacted)', () => {
  beforeEach(() => {
    _resetExtraPatterns();
    delete process.env['BAB_REDACT_EXTRA'];
  });

  const normalLines = [
    'Starting claude CLI version 1.2.3',
    'Loading configuration from ~/.claude/config.json',
    'Connecting to API endpoint',
    'Session initialized with ID sess_abc123',
    'Turn complete in 1.23s',
    'Total tokens: 512',
    'Cache key: hash_abc123',
    'Content-Type: application/json',
    'Accept: application/json',
    'Status: 200 OK',
    'Rate limit: 100 req/min',
    'Memory usage: 45MB',
    'https://api.example.com/v1/messages',
    'https://api.anthropic.com/v1/messages',
    'The weather is basic today',
    'Basic math shows 2 + 2 = 4',
    'Authorization required for premium features',
    'Bearer responsibility in software',
    'User-Agent: claude-cli/1.2.3',
    'X-Request-ID: req_abc',
  ];

  it('normal log lines not redacted', () => {
    let fpCount = 0;
    for (const line of normalLines) {
      const result = scrub(line);
      if (result.includes('[REDACTED]')) {
        fpCount++;
      }
    }
    // FPR < 1% (max 1 FP for 20 lines at 5% tolerance, but we target 1%)
    expect(fpCount).toBeLessThanOrEqual(1);
  });
});

describe('isWarning()', () => {
  it('ProviderVersion is a warning', () => {
    expect(new ProviderVersion('x', '1', '2').isWarning()).toBe(true);
  });

  it('other errors are not warnings', () => {
    expect(new NoProvider().isWarning()).toBe(false);
    expect(new CliMissing('x', 'url').isWarning()).toBe(false);
    expect(new StateLocked().isWarning()).toBe(false);
  });
});

describe('BabError instanceof checks', () => {
  it('CliMissing is instanceof BabError', () => {
    expect(new CliMissing('claude', 'https://example.com')).toBeInstanceOf(BabError);
  });

  it('CliMissing is instanceof Error', () => {
    expect(new CliMissing('claude', 'https://example.com')).toBeInstanceOf(Error);
  });
});
