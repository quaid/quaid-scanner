#!/usr/bin/env node

/**
 * CLI entry point for quaid-scanner
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildConfig, validateTarget } from './config.js';
import { buildContext } from './context-builder.js';
import { createDefaultRegistry } from './scanner/registry-factory.js';
import { Orchestrator } from './scanner/orchestrator.js';
import { buildScanReport, serializeJson } from './reporters/json.js';
import { renderMarkdown } from './reporters/markdown.js';
import { EcosystemOrchestrator } from './ecosystem/orchestrator.js';
import { OutputFormat } from './types/index.js';

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
    .option('--verbose', 'Show detailed progress')
    .option('--ecosystem', 'Run ecosystem intelligence analysis (rivals, partners, communities)')
    .option('--ecosystem-depth <level>', 'Ecosystem analysis depth: static or assisted', 'static');

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
    console.error(`Scanning: ${targetDisplay}`);
    console.error(`Depth: ${config.depth} | Format: ${config.format}`);
  }

  const version = getVersion();
  const { context, cleanup } = buildContext(validatedTarget, config, version);

  try {
    if (config.verbose) {
      context.emit = (event) => {
        if (event.type === 'scanner:complete') {
          console.error(`  ✓ ${event.scanner} (${event.findingCount} findings, ${event.durationMs}ms)`);
        }
      };
    }

    const registry = createDefaultRegistry();
    const orchestrator = new Orchestrator(registry);
    const result = await orchestrator.run(context);

    const report = buildScanReport(validatedTarget, result, config, context.maturity, version);

    // Populate git metadata from context
    report.metadata.commitSha = context.git.commitSha;
    report.metadata.branch = context.git.branch;
    report.metadata.remoteUrl = context.git.remoteUrl;

    // Ecosystem intelligence (opt-in, non-scoring)
    if (config.ecosystem) {
      if (!config.quiet) context.emit({ type: 'ecosystem:start' });
      try {
        const ecoContext = {
          ...context,
          existingReport: report,
          zerodbAvailable: !!(config.zerodbApiKey && config.zerodbProjectId),
        };
        const ecoOrchestrator = new EcosystemOrchestrator();
        report.ecosystem = await ecoOrchestrator.analyze(ecoContext);
        if (!config.quiet) context.emit({ type: 'ecosystem:complete', dataSource: report.ecosystem.dataSource });
      } catch (err) {
        if (!config.quiet) console.error(`Ecosystem analysis failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const output =
      config.format === OutputFormat.MARKDOWN
        ? renderMarkdown(report)
        : serializeJson(report);

    if (config.output) {
      writeFileSync(config.output, output, 'utf-8');
      if (!config.quiet) console.error(`Output written to ${config.output}`);
    } else {
      process.stdout.write(output + '\n');
    }

    if (!config.quiet) {
      console.error(`\nScore: ${result.overallScore.toFixed(1)}/10 (${result.riskLevel})`);
    }

    // Exit codes: 0 = low risk (≥8), 1 = medium (5–7.9), 2 = high/critical (<5) or threshold missed
    if (!result.thresholdPassed) {
      cleanup();
      process.exit(2);
    }
    cleanup();
    process.exit(result.overallScore >= 8.0 ? 0 : result.overallScore >= 5.0 ? 1 : 2);
  } catch (err) {
    cleanup();
    throw err;
  }
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
