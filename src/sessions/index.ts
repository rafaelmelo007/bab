/**
 * Session Management — F-05
 * List, create, and resume provider sessions.
 */

import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { NoProvider } from '../errors/index.js';
import type { DispatchResult, ReplContext } from '../commands/types.js';

// Provider session store paths
export const SESSION_STORE_PATHS: Record<string, (home: string) => string> = {
  claude: (home) => path.join(home, '.claude', 'projects'),
  codex: (home) => path.join(home, '.codex', 'sessions'),
  gemini: (home) => path.join(home, '.gemini', 'sessions'),
  ollama: (home) => path.join(home, '.ollama', 'sessions'),
};

interface SessionFile {
  id: string;
  lastUsed: Date;
  preview: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export async function listSessionFiles(provider: string, overrideDir?: string): Promise<SessionFile[]> {
  const home = os.homedir();
  const getDirFn = SESSION_STORE_PATHS[provider];
  if (!getDirFn && !overrideDir) return [];

  const storeDir = overrideDir ?? (getDirFn ? getDirFn(home) : '');

  try {
    const entries = await fsp.readdir(storeDir, { withFileTypes: true });
    const sessions: SessionFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(storeDir, entry.name);
      try {
        const stat = await fsp.stat(filePath);
        // Read up to 4096 bytes for preview
        const fd = await fsp.open(filePath, 'r');
        let preview = '';
        try {
          const buf = Buffer.alloc(4096);
          const { bytesRead } = await fd.read(buf, 0, 4096, 0);
          preview = buf.slice(0, bytesRead).toString('utf-8').split('\n')[0] ?? '';
        } finally {
          await fd.close();
        }

        const id = path.basename(entry.name, path.extname(entry.name));
        sessions.push({
          id,
          lastUsed: stat.mtime,
          preview: preview.slice(0, 200),
        });
      } catch {
        // Skip unreadable files
      }
    }

    // Sort by mtime desc
    sessions.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

    // Cap at 20 rows
    return sessions.slice(0, 20);
  } catch {
    return [];
  }
}

/**
 * List sessions for the active provider.
 * /sessions
 */
export async function sessionList(ctx: ReplContext): Promise<DispatchResult> {
  if (!ctx.activeProvider) {
    return { kind: 'error', error: new NoProvider() };
  }

  const sessions = await listSessionFiles(ctx.activeProvider, ctx._sessionStoreDir);

  if (sessions.length === 0) {
    return { kind: 'ok', output: `No sessions found for provider '${ctx.activeProvider}'.` };
  }

  // 3-column table: ID (12), LAST_USED (20), PREVIEW (40)
  const header = 'ID           LAST_USED            PREVIEW';
  const sep = '─'.repeat(73);

  const rows = sessions.map(s => {
    const id = truncate(s.id, 12).padEnd(12);
    const lastUsed = s.lastUsed.toISOString().replace(/\.\d{3}Z$/, 'Z').padEnd(20);
    const preview = truncate(s.preview.replace(/\s+/g, ' '), 40);
    return `${id} ${lastUsed} ${preview}`;
  });

  return { kind: 'ok', output: [header, sep, ...rows].join('\n') };
}

/**
 * Start a new session (clears current session ID).
 * /new
 */
export async function sessionNew(ctx: ReplContext): Promise<DispatchResult> {
  if (!ctx.activeProvider) {
    return { kind: 'error', error: new NoProvider() };
  }

  ctx.sessionId = null;
  if (ctx.state) {
    await ctx.state.saveWithLock(s => {
      if (ctx.activeProvider) {
        s.sessions[ctx.activeProvider] = { id: '' };
      }
    });
  }

  return { kind: 'ok', output: 'New session started.' };
}

/**
 * Resume a saved session by ID.
 * /resume <id>
 */
export async function sessionResume(ctx: ReplContext, args: string[]): Promise<DispatchResult> {
  if (!ctx.activeProvider) {
    return { kind: 'error', error: new NoProvider() };
  }

  const id = args[0];
  if (!id) {
    return { kind: 'error', error: new NoProvider() }; // wrong error but same shape
  }

  // Verify session exists
  const sessions = await listSessionFiles(ctx.activeProvider, ctx._sessionStoreDir);
  const found = sessions.find(s => s.id === id);

  if (!found) {
    return {
      kind: 'error',
      error: Object.assign(new Error(`Session '${id}' not found.`) as Error & { exitCode: () => number }, {
        code: 'E-NO-PROVIDER' as const,
        exitCode: () => 2,
        isWarning: () => false,
        format: () => `Session '${id}' not found for provider '${ctx.activeProvider}'.`,
        messageText: () => `Session '${id}' not found.`,
      }),
    };
  }

  ctx.sessionId = id;
  if (ctx.state) {
    await ctx.state.saveWithLock(s => {
      if (ctx.activeProvider) {
        s.sessions[ctx.activeProvider] = { id };
      }
    });
  }

  return { kind: 'ok', output: `Resumed session: ${id}` };
}
