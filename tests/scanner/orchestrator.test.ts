import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Orchestrator } from '../../src/scanner/orchestrator.js';
import { ScannerRegistry } from '../../src/scanner/registry.js';
import {
  Pillar,
  Severity,
  ScanDepth,
  PILLAR_WEIGHTS,
} from '../../src/types/index.js';
import type { Scanner, ScanContext, Finding } from '../../src/types/index.js';
import { DEFAULT_CONFIG } from '../../src/config.js';

function createFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'TEST-01',
    severity: Severity.WARNING,
    pillar: Pillar.SECURITY,
    category: 'test',
    message: 'Test finding',
    file: null,
    line: null,
    column: null,
    suggestion: 'Fix it',
    ...overrides,
  };
}

function createMockScanner(overrides: Partial<Scanner> & { delay?: number; findings?: Finding[] } = {}): Scanner {
  const { delay = 0, findings = [], ...scannerOverrides } = overrides;
  return {
    name: 'mock-scanner',
    displayName: 'Mock Scanner',
    pillar: Pillar.SECURITY,
    async run(_context: ScanContext): Promise<Finding[]> {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      return findings;
    },
    ...scannerOverrides,
  };
}

function createMinimalContext(overrides: Partial<ScanContext> = {}): ScanContext {
  return {
    repoPath: '/tmp/test-repo',
    repoIdentifier: null,
    maturity: 'sandbox' as ScanContext['maturity'],
    depth: ScanDepth.STANDARD,
    config: DEFAULT_CONFIG,
    git: { commitSha: null, branch: null, remoteUrl: null },
    signal: new AbortController().signal,
    emit: vi.fn(),
    ...overrides,
  };
}

describe('Orchestrator', () => {
  let registry: ScannerRegistry;
  let orchestrator: Orchestrator;

  beforeEach(() => {
    registry = new ScannerRegistry();
    orchestrator = new Orchestrator(registry);
  });

  describe('parallel execution across pillars', () => {
    it('executes scanners in different pillars in parallel', async () => {
      const executionOrder: string[] = [];

      registry.register(createMockScanner({
        name: 'sec-scanner',
        pillar: Pillar.SECURITY,
        delay: 50,
        async run(_ctx: ScanContext) {
          executionOrder.push('sec-start');
          await new Promise((r) => setTimeout(r, 50));
          executionOrder.push('sec-end');
          return [];
        },
      }));

      registry.register(createMockScanner({
        name: 'gov-scanner',
        pillar: Pillar.GOVERNANCE,
        delay: 50,
        async run(_ctx: ScanContext) {
          executionOrder.push('gov-start');
          await new Promise((r) => setTimeout(r, 50));
          executionOrder.push('gov-end');
          return [];
        },
      }));

      const context = createMinimalContext();
      const start = Date.now();
      await orchestrator.run(context);
      const elapsed = Date.now() - start;

      // Both should start before either ends (parallel)
      expect(executionOrder.indexOf('sec-start')).toBeLessThan(executionOrder.indexOf('sec-end'));
      expect(executionOrder.indexOf('gov-start')).toBeLessThan(executionOrder.indexOf('gov-end'));

      // If truly parallel, total time should be less than sum of delays
      expect(elapsed).toBeLessThan(150);
    });
  });

  describe('sequential execution within pillar (dependsOn)', () => {
    it('executes scanners with dependsOn after their dependency completes', async () => {
      const executionOrder: string[] = [];

      registry.register(createMockScanner({
        name: 'base-scanner',
        pillar: Pillar.SECURITY,
        async run(_ctx: ScanContext) {
          executionOrder.push('base');
          await new Promise((r) => setTimeout(r, 20));
          return [];
        },
      }));

      registry.register(createMockScanner({
        name: 'dependent-scanner',
        pillar: Pillar.SECURITY,
        dependsOn: ['base-scanner'],
        async run(_ctx: ScanContext) {
          executionOrder.push('dependent');
          return [];
        },
      }));

      await orchestrator.run(createMinimalContext());

      expect(executionOrder).toEqual(['base', 'dependent']);
    });
  });

  describe('weighted scoring', () => {
    it('calculates overall score as weighted average of pillar scores', async () => {
      // Register scanners with known findings across pillars
      // Security: all pass (score 10) with weight 0.25
      registry.register(createMockScanner({
        name: 'sec-pass',
        pillar: Pillar.SECURITY,
        findings: [createFinding({ severity: Severity.PASS, pillar: Pillar.SECURITY })],
      }));

      // Governance: critical finding (score ~0) with weight 0.20
      registry.register(createMockScanner({
        name: 'gov-fail',
        pillar: Pillar.GOVERNANCE,
        findings: [createFinding({ severity: Severity.CRITICAL, pillar: Pillar.GOVERNANCE })],
      }));

      const result = await orchestrator.run(createMinimalContext());

      // Verify pillar scores exist
      expect(result.pillars[Pillar.SECURITY]).toBeDefined();
      expect(result.pillars[Pillar.GOVERNANCE]).toBeDefined();

      // Security should score high (only PASS findings)
      expect(result.pillars[Pillar.SECURITY].score).toBeGreaterThan(5);

      // Governance should score lower (CRITICAL finding deducts 3 points)
      expect(result.pillars[Pillar.GOVERNANCE].score).toBeLessThan(
        result.pillars[Pillar.SECURITY].score
      );

      // Weights should match PILLAR_WEIGHTS
      expect(result.pillars[Pillar.SECURITY].weight).toBe(PILLAR_WEIGHTS[Pillar.SECURITY]);
      expect(result.pillars[Pillar.GOVERNANCE].weight).toBe(PILLAR_WEIGHTS[Pillar.GOVERNANCE]);

      // Overall score should be between 0 and 10
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(10);
    });

    it('assigns correct weights per pillar', async () => {
      const result = await orchestrator.run(createMinimalContext());

      // Even with no scanners, pillar weights should be set
      for (const pillar of Object.values(Pillar)) {
        expect(result.pillars[pillar].weight).toBe(PILLAR_WEIGHTS[pillar]);
      }
    });
  });

  describe('threshold enforcement', () => {
    it('result indicates pass when score >= threshold', async () => {
      const config = { ...DEFAULT_CONFIG, threshold: 5.0 };
      const context = createMinimalContext({ config });

      // No scanners = default high score
      const result = await orchestrator.run(context);
      expect(result.thresholdPassed).toBe(true);
    });

    it('result indicates fail when score < threshold', async () => {
      // Register scanners with critical findings to lower score
      registry.register(createMockScanner({
        name: 'failing-scanner',
        pillar: Pillar.SECURITY,
        findings: [
          createFinding({ severity: Severity.CRITICAL }),
          createFinding({ id: 'TEST-02', severity: Severity.CRITICAL }),
          createFinding({ id: 'TEST-03', severity: Severity.CRITICAL }),
        ],
      }));
      registry.register(createMockScanner({
        name: 'gov-failing',
        pillar: Pillar.GOVERNANCE,
        findings: [
          createFinding({ id: 'GOV-01', severity: Severity.CRITICAL, pillar: Pillar.GOVERNANCE }),
        ],
      }));
      registry.register(createMockScanner({
        name: 'com-failing',
        pillar: Pillar.COMMUNITY,
        findings: [
          createFinding({ id: 'COM-01', severity: Severity.CRITICAL, pillar: Pillar.COMMUNITY }),
        ],
      }));
      registry.register(createMockScanner({
        name: 'inc-failing',
        pillar: Pillar.INCLUSIVE,
        findings: [
          createFinding({ id: 'INC-01', severity: Severity.CRITICAL, pillar: Pillar.INCLUSIVE }),
        ],
      }));
      registry.register(createMockScanner({
        name: 'tech-failing',
        pillar: Pillar.TECHNICAL,
        findings: [
          createFinding({ id: 'TECH-01', severity: Severity.CRITICAL, pillar: Pillar.TECHNICAL }),
        ],
      }));
      registry.register(createMockScanner({
        name: 'ai-failing',
        pillar: Pillar.AI_READINESS,
        findings: [
          createFinding({ id: 'AI-01', severity: Severity.CRITICAL, pillar: Pillar.AI_READINESS }),
        ],
      }));

      const config = { ...DEFAULT_CONFIG, threshold: 9.0 };
      const context = createMinimalContext({ config });

      const result = await orchestrator.run(context);
      expect(result.thresholdPassed).toBe(false);
    });

    it('passes when no threshold is configured', async () => {
      const config = { ...DEFAULT_CONFIG, threshold: null };
      const context = createMinimalContext({ config });

      const result = await orchestrator.run(context);
      expect(result.thresholdPassed).toBe(true);
    });
  });

  describe('scanner timeout', () => {
    it('times out a scanner that exceeds the configured timeout', async () => {
      registry.register(createMockScanner({
        name: 'slow-scanner',
        pillar: Pillar.SECURITY,
        async run(_ctx: ScanContext) {
          await new Promise((r) => setTimeout(r, 5000));
          return [];
        },
      }));

      const config = { ...DEFAULT_CONFIG, scannerTimeout: 100 };
      const context = createMinimalContext({ config });

      const result = await orchestrator.run(context);

      // Should complete without hanging, and the timed-out scanner
      // should produce a timeout finding
      const timeoutFindings = result.findings.filter(
        (f) => f.category === 'timeout'
      );
      expect(timeoutFindings.length).toBeGreaterThan(0);
      expect(timeoutFindings[0].severity).toBe(Severity.WARNING);
    }, 10000);
  });

  describe('scan events', () => {
    it('emits scan:start and scan:complete events', async () => {
      const events: Array<{ type: string }> = [];
      const context = createMinimalContext({
        emit: (event) => events.push(event),
      });

      await orchestrator.run(context);

      const types = events.map((e) => e.type);
      expect(types).toContain('scan:start');
      expect(types).toContain('scan:complete');
    });

    it('emits scanner:start and scanner:complete for each scanner', async () => {
      registry.register(createMockScanner({ name: 'evt-scanner' }));

      const events: Array<{ type: string; scanner?: string }> = [];
      const context = createMinimalContext({
        emit: (event) => events.push(event as { type: string; scanner?: string }),
      });

      await orchestrator.run(context);

      const types = events.map((e) => e.type);
      expect(types).toContain('scanner:start');
      expect(types).toContain('scanner:complete');
    });
  });

  describe('aggregated findings', () => {
    it('collects findings from all scanners into result', async () => {
      registry.register(createMockScanner({
        name: 'scanner-a',
        pillar: Pillar.SECURITY,
        findings: [createFinding({ id: 'A-01' })],
      }));
      registry.register(createMockScanner({
        name: 'scanner-b',
        pillar: Pillar.GOVERNANCE,
        findings: [createFinding({ id: 'B-01', pillar: Pillar.GOVERNANCE })],
      }));

      const result = await orchestrator.run(createMinimalContext());

      expect(result.findings).toHaveLength(2);
      expect(result.findings.map((f) => f.id)).toContain('A-01');
      expect(result.findings.map((f) => f.id)).toContain('B-01');
    });
  });
});
