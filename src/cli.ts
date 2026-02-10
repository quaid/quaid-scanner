#!/usr/bin/env node

/**
 * CLI entry point for quaid-scanner
 *
 * Parses command-line arguments and builds the scanner configuration.
 * Actual scan execution is handled by the orchestrator (Story 1.3b).
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildConfig, validateTarget } from './config.js';

/** Result of parsing CLI arguments */
export interface ParseResult {
  target: string | undefined;
  options: Record<string, unknown>;
}

/**
 * Reads the package.json version string.
 *
 * @returns The version from package.json
 */
function getVersion(): string {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // Walk up from src/ or dist/ to find package.json at the project root
  let dir = currentDir;
  for (let i = 0; i < 5; i++) {
    const candidate = resolve(dir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(candidate, 'utf-8')) as Record<
        string,
        unknown
      >;
      if (pkg.name === 'quaid-scanner') {
        return pkg.version as string;
      }
    } catch {
      // file not found at this level, keep walking up
    }
    dir = resolve(dir, '..');
  }
  return '0.0.0';
}

/**
 * Creates and configures the Commander program instance.
 *
 * @returns The configured Commander program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('quaid-scanner')
    .description(
      'Agent-first OSS repository health scanner based on CHAOSS metrics, ' +
        'The Open Source Way 2.0, and Inclusive Naming Initiative',
    )
    .version(getVersion())
    .argument('[target]', 'Path to local repo or GitHub URL (https://github.com/owner/repo)')
    .option(
      '--depth <level>',
      'Scan depth: quick, standard, or thorough',
      'standard',
    )
    .option('--format <type>', 'Output format: json or markdown', 'json')
    .option('--output <file>', 'Write output to file instead of stdout')
    .option('--config <file>', 'Path to .quaid-scanner.yaml config file')
    .option(
      '--threshold <score>',
      'Minimum score (0-10); exit with failure if below',
    )
    .option(
      '--maturity <level>',
      'Maturity level: sandbox, incubating, graduated, archived, or auto',
      'auto',
    )
    .option('--quiet', 'Suppress progress output')
    .option('--verbose', 'Show detailed progress');

  // Prevent commander from calling process.exit on errors during testing
  program.exitOverride();

  return program;
}

/**
 * Parses command-line arguments and returns the parsed target and options.
 *
 * @param argv - The argument array (typically process.argv)
 * @returns The parsed target and option values
 */
export function parseArgs(argv: string[]): ParseResult {
  const program = createProgram();
  program.parse(argv);

  const options = program.opts<Record<string, unknown>>();
  const args = program.args;
  const target = args.length > 0 ? args[0] : undefined;

  return { target, options };
}

/**
 * Main CLI entry point. Parses arguments, validates input,
 * builds configuration, and (in the future) runs the scan.
 */
async function main(): Promise<void> {
  const { target, options } = parseArgs(process.argv);

  if (!target) {
    // If no target is provided, show help and exit
    const program = createProgram();
    program.outputHelp();
    process.exit(1);
  }

  const validatedTarget = validateTarget(target);
  const config = buildConfig(options);

  if (!config.quiet) {
    const targetDisplay =
      validatedTarget.type === 'github'
        ? `github:${validatedTarget.value}`
        : validatedTarget.value;
    console.log(`Scanning: ${targetDisplay}`);
    console.log(`Depth: ${config.depth}`);
    console.log(`Format: ${config.format}`);
  }

  // Placeholder: orchestrator integration happens in Story 1.3b
  console.log(
    'Scan orchestrator not yet implemented. Configuration parsed successfully.',
  );
}

// Only run main() when executed directly, not when imported for testing
const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('/cli.js') || process.argv[1].endsWith('/cli.ts'));

if (isDirectExecution) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
}
