/**
 * Scanner orchestrator for quaid-scanner.
 *
 * Coordinates parallel execution of scanners across pillars,
 * calculates weighted scores, and enforces timeouts.
 */

import {
  Pillar,
  Severity,
  PILLAR_WEIGHTS,
  RiskLevel,
} from '../types/index.js';
import type {
  Finding,
  ScanContext,
  PillarScore,
  Scanner,
} from '../types/index.js';
import { ScannerRegistry } from './registry.js';

export interface OrchestratorResult {
  overallScore: number;
  riskLevel: RiskLevel;
  pillars: Record<Pillar, PillarScore>;
  findings: Finding[];
  thresholdPassed: boolean;
  durationMs: number;
}

export class Orchestrator {
  constructor(private readonly registry: ScannerRegistry) {}

  async run(context: ScanContext): Promise<OrchestratorResult> {
    const start = Date.now();

    context.emit({ type: 'scan:start', repoPath: context.repoPath, depth: context.depth });

    const allFindings: Finding[] = [];
    const pillarScannerNames: Record<string, string[]> = {};

    // Group scanners by pillar for parallel execution
    const pillarGroups = new Map<Pillar, Scanner[]>();
    for (const pillar of Object.values(Pillar)) {
      const scanners = this.registry.getByPillar(pillar);
      if (scanners.length > 0) {
        pillarGroups.set(pillar, scanners);
      }
    }

    // Execute pillar groups in parallel, scanners within a pillar respecting dependsOn
    const pillarPromises = Array.from(pillarGroups.entries()).map(
      async ([pillar, scanners]) => {
        const findings = await this.executePillarScanners(scanners, context);
        return { pillar, findings, scannerNames: scanners.map((s) => s.name) };
      },
    );

    const pillarResults = await Promise.all(pillarPromises);

    for (const result of pillarResults) {
      allFindings.push(...result.findings);
      pillarScannerNames[result.pillar] = result.scannerNames;
    }

    // Build pillar scores
    const pillars = {} as Record<Pillar, PillarScore>;
    for (const pillar of Object.values(Pillar)) {
      const pillarFindings = allFindings.filter((f) => f.pillar === pillar);
      const weight = PILLAR_WEIGHTS[pillar];
      const score = this.calculatePillarScore(pillarFindings);

      pillars[pillar] = {
        score,
        weight,
        weightedScore: score * weight,
        counts: {
          critical: pillarFindings.filter((f) => f.severity === Severity.CRITICAL).length,
          warning: pillarFindings.filter((f) => f.severity === Severity.WARNING).length,
          info: pillarFindings.filter((f) => f.severity === Severity.INFO).length,
          pass: pillarFindings.filter((f) => f.severity === Severity.PASS).length,
        },
        scanners: pillarScannerNames[pillar] || [],
      };
    }

    // Calculate overall weighted score
    const overallScore = this.calculateOverallScore(pillars);
    const riskLevel = this.deriveRiskLevel(overallScore);

    // Threshold check
    const threshold = context.config.threshold;
    const thresholdPassed = threshold === null || overallScore >= threshold;

    const durationMs = Date.now() - start;

    context.emit({ type: 'scan:complete', totalFindings: allFindings.length, durationMs });

    return {
      overallScore,
      riskLevel,
      pillars,
      findings: allFindings,
      thresholdPassed,
      durationMs,
    };
  }

  private async executePillarScanners(
    scanners: Scanner[],
    context: ScanContext,
  ): Promise<Finding[]> {
    const findings: Finding[] = [];
    const completed = new Set<string>();
    const remaining = [...scanners];

    while (remaining.length > 0) {
      // Find scanners whose dependencies are satisfied
      const ready: Scanner[] = [];
      const blocked: Scanner[] = [];

      for (const scanner of remaining) {
        const deps = scanner.dependsOn || [];
        if (deps.every((dep) => completed.has(dep))) {
          ready.push(scanner);
        } else {
          blocked.push(scanner);
        }
      }

      if (ready.length === 0 && blocked.length > 0) {
        // Circular dependency or missing dependency — run remaining anyway
        ready.push(...blocked);
        blocked.length = 0;
      }

      // Execute ready scanners (could be parallel if no deps between them)
      const results = await Promise.all(
        ready.map((scanner) => this.executeScanner(scanner, context)),
      );

      for (const result of results) {
        findings.push(...result.findings);
        completed.add(result.name);
      }

      remaining.length = 0;
      remaining.push(...blocked);
    }

    return findings;
  }

  private async executeScanner(
    scanner: Scanner,
    context: ScanContext,
  ): Promise<{ name: string; findings: Finding[] }> {
    const timeout = context.config.scannerTimeout;

    context.emit({
      type: 'scanner:start',
      scanner: scanner.name,
      pillar: scanner.pillar,
    });

    const start = Date.now();

    try {
      const findings = await this.withTimeout(
        scanner.run(context),
        timeout,
        scanner.name,
      );

      const durationMs = Date.now() - start;
      context.emit({
        type: 'scanner:complete',
        scanner: scanner.name,
        findingCount: findings.length,
        durationMs,
      });

      return { name: scanner.name, findings };
    } catch (error) {
      const durationMs = Date.now() - start;
      const isTimeout = error instanceof Error && error.message.includes('timed out');

      const finding: Finding = {
        id: `TIMEOUT-${scanner.name}`,
        severity: Severity.WARNING,
        pillar: scanner.pillar,
        category: isTimeout ? 'timeout' : 'error',
        message: isTimeout
          ? `Scanner "${scanner.name}" timed out after ${timeout}ms`
          : `Scanner "${scanner.name}" failed: ${error instanceof Error ? error.message : String(error)}`,
        file: null,
        line: null,
        column: null,
        suggestion: isTimeout
          ? 'Increase scannerTimeout in configuration or check network connectivity'
          : 'Check scanner implementation for errors',
      };

      context.emit({
        type: 'scanner:complete',
        scanner: scanner.name,
        findingCount: 1,
        durationMs,
      });

      return { name: scanner.name, findings: [finding] };
    }
  }

  private withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    name: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Scanner "${name}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private calculatePillarScore(findings: Finding[]): number {
    if (findings.length === 0) {
      return 10.0;
    }

    const criticalCount = findings.filter((f) => f.severity === Severity.CRITICAL).length;
    const warningCount = findings.filter((f) => f.severity === Severity.WARNING).length;
    const infoCount = findings.filter((f) => f.severity === Severity.INFO).length;
    const passCount = findings.filter((f) => f.severity === Severity.PASS).length;

    const total = criticalCount + warningCount + infoCount + passCount;
    if (total === 0) return 10.0;

    // Deductions: critical = 3 points, warning = 1.5 points, info = 0.5 points
    const deductions = criticalCount * 3 + warningCount * 1.5 + infoCount * 0.5;
    const score = Math.max(0, 10.0 - deductions);

    return Math.round(score * 10) / 10;
  }

  private calculateOverallScore(pillars: Record<Pillar, PillarScore>): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const pillar of Object.values(Pillar)) {
      const pillarScore = pillars[pillar];
      weightedSum += pillarScore.score * pillarScore.weight;
      totalWeight += pillarScore.weight;
    }

    if (totalWeight === 0) return 10.0;

    const score = weightedSum / totalWeight;
    return Math.round(score * 10) / 10;
  }

  private deriveRiskLevel(score: number): RiskLevel {
    if (score < 4.0) return RiskLevel.CRITICAL;
    if (score < 6.0) return RiskLevel.HIGH;
    if (score < 8.0) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
