/**
 * CLI entry point — F-07, F-03
 * Parses command-line arguments and routes to one-shot or REPL mode.
 */

import { Command } from 'commander';
import { runOneShot } from '../oneshot/index.js';
import { runRepl } from '../repl/index.js';

export interface CliOpts {
  provider?: string;
  noColor?: boolean;
  model?: string;
}

/**
 * Main CLI entry point.
 */
export async function main(argv: string[] = process.argv): Promise<number> {
  const program = new Command();

  program
    .name('bab')
    .description('Unified CLI gateway to Claude, Codex, Gemini, and Ollama')
    .option('-p, --provider <name>', 'Provider to use (claude, codex, gemini, ollama)')
    .option('--no-color', 'Disable ANSI color output')
    .option('-m, --model <name>', 'Model to use with the provider')
    .allowUnknownOption(false)
    .allowExcessArguments(true);

  program.parse(argv);

  const opts = program.opts<CliOpts>();
  const args = program.args;

  if (opts.provider) {
    // One-shot mode: provider specified
    return runOneShot({
      provider: opts.provider,
      positionalArgs: args,
      noColor: opts.noColor,
      model: opts.model,
    });
  } else {
    // REPL mode
    return runRepl({
      noColor: opts.noColor,
      model: opts.model,
    });
  }
}
