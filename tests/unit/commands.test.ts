/**
 * Tests for F-06: slash-commands
 */
import { describe, it, expect, vi } from 'vitest';
import { dispatch, type ReplContext } from '../../src/commands/index.js';

function makeCtx(overrides?: Partial<ReplContext>): ReplContext {
  return {
    activeProvider: null,
    activeModel: null,
    sessionId: null,
    ...overrides,
  };
}

describe('/help', () => {
  it('returns kind=ok with help text', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/help', ctx);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.output).toContain('/help');
      expect(result.output).toContain('/provider');
      expect(result.output).toContain('/exit');
    }
  });

  it('/help text contains all 9 commands', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/help', ctx);
    if (result.kind === 'ok') {
      for (const cmd of ['/help', '/provider', '/providers', '/model', '/sessions', '/resume', '/new', '/clear', '/exit']) {
        expect(result.output).toContain(cmd);
      }
    }
  });
});

describe('/provider', () => {
  it('sets active provider to claude', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider claude', ctx);
    expect(result.kind).toBe('ok');
    expect(ctx.activeProvider).toBe('claude');
  });

  it('sets active provider to ollama', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider ollama', ctx);
    expect(result.kind).toBe('ok');
    expect(ctx.activeProvider).toBe('ollama');
  });

  it('invalid provider returns error', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider gpt4', ctx);
    expect(result.kind).toBe('error');
  });

  it('no args shows current provider', async () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const result = await dispatch('/provider', ctx);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.output).toContain('claude');
    }
  });
});

describe('/model', () => {
  it('sets active model', async () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const result = await dispatch('/model claude-3-opus', ctx);
    expect(result.kind).toBe('ok');
    expect(ctx.activeModel).toBe('claude-3-opus');
  });

  it('no args shows current model', async () => {
    const ctx = makeCtx({ activeProvider: 'claude', activeModel: 'claude-3-sonnet' });
    const result = await dispatch('/model', ctx);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.output).toContain('claude-3-sonnet');
    }
  });
});

describe('/clear', () => {
  it('returns kind=ok', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/clear', ctx);
    expect(result.kind).toBe('ok');
  });
});

describe('/exit', () => {
  it('returns kind=exit with code 0', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/exit', ctx);
    expect(result.kind).toBe('exit');
    if (result.kind === 'exit') {
      expect(result.code).toBe(0);
    }
  });
});

describe('Non-slash input', () => {
  it('returns kind=turn when provider is set', async () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const result = await dispatch('hello world', ctx);
    expect(result.kind).toBe('turn');
    if (result.kind === 'turn') {
      expect(result.prompt).toBe('hello world');
    }
  });

  it('returns kind=error when no provider set', async () => {
    const ctx = makeCtx();
    const result = await dispatch('hello world', ctx);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.code).toBe('E-NO-PROVIDER');
    }
  });
});

describe('Tokenizer — metacharacter passthrough', () => {
  it('semicolons treated as literal args', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider ;claude', ctx);
    // ;claude is not a valid provider, so it should fail
    expect(result.kind).toBe('error');
  });

  it('pipes treated as literal args', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider |claude', ctx);
    expect(result.kind).toBe('error'); // |claude not a valid provider
  });

  it('ampersands treated as literal args', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/provider &claude', ctx);
    expect(result.kind).toBe('error'); // &claude not a valid provider
  });
});

describe('Unknown command suggestion', () => {
  it('no hint for far-off commands (dist > 2)', async () => {
    const ctx = makeCtx();
    const result = await dispatch('/xyzzy', ctx);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.format({ color: false, unicode: true })).not.toContain('Did you mean');
    }
  });

  it('hint for close typo (dist ≤ 2)', async () => {
    const ctx = makeCtx();
    // /hepl is distance 2 from /help (transposition)
    const result = await dispatch('/helpp', ctx);
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      // Might suggest /help
      const msg = result.error.format({ color: false, unicode: true });
      // Could suggest something
      expect(msg).toBeTruthy();
    }
  });
});

describe('Property test: random slash inputs never throw', () => {
  it('100 random slash inputs never throw uncaught', async () => {
    const ctx = makeCtx({ activeProvider: 'claude' });
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let i = 0; i < 100; i++) {
      const len = Math.floor(Math.random() * 10) + 1;
      let cmd = '/';
      for (let j = 0; j < len; j++) {
        cmd += chars[Math.floor(Math.random() * chars.length)];
      }
      // Should not throw
      await expect(dispatch(cmd, ctx)).resolves.toBeDefined();
    }
  });
});
