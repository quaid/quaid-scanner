/**
 * Tests for the `dataSource` field on the Finding interface.
 *
 * Verifies that every scanner populates `dataSource` with one of:
 *   'api' | 'local' | 'heuristic'
 *
 * Tests are organized by pillar. Representative scanners from each pillar
 * are tested. Additional targeted tests verify the correct tier value.
 *
 * RED phase: these tests FAIL until `dataSource` is added to Finding
 * and populated in every scanner.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
    Pillar,
    Severity,
    MaturityLevel,
    ScanDepth,
    OutputFormat,
} from '../../src/types/index.js';
import type { ScanContext, ScannerConfig, Finding } from '../../src/types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_SOURCES = new Set(['api', 'local', 'heuristic']);

function isValidDataSource(value: unknown): value is 'api' | 'local' | 'heuristic' {
    return VALID_SOURCES.has(value as string);
}

function assertFindingsHaveDataSource(findings: Finding[], expectedSource: 'api' | 'local' | 'heuristic'): void {
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
        expect(isValidDataSource(finding.dataSource)).toBe(true);
        expect(finding.dataSource).toBe(expectedSource);
    }
}

function baseConfig(): ScannerConfig {
    return {
        maturity: MaturityLevel.INCUBATING,
        depth: ScanDepth.STANDARD,
        format: OutputFormat.JSON,
        output: null,
        threshold: null,
        quiet: false,
        verbose: false,
        scannerTimeout: 30_000,
        githubToken: null,
        zerodbApiKey: null,
        zerodbProjectId: null,
        ecosystem: false,
        ecosystemDepth: 'static',
        pillars: { disabled: [], weights: {}, disabledScanners: [] },
        bots: { enabled: true, additional: [], exclude: [] },
        inclusive: {
            termListUrl: null,
            customTerms: {},
            ignoredTerms: [],
            excludePatterns: [],
        },
    };
}

function makeContext(repoPath: string, overrides: Partial<ScanContext> = {}): ScanContext {
    return {
        repoPath,
        repoIdentifier: null,
        maturity: MaturityLevel.INCUBATING,
        depth: ScanDepth.STANDARD,
        config: baseConfig(),
        git: { commitSha: null, branch: null, remoteUrl: null },
        signal: AbortSignal.timeout(30_000),
        emit: () => {},
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Type-level test: Finding interface must include dataSource
// ---------------------------------------------------------------------------

describe('Finding interface', () => {
    it('accepts dataSource field with valid values', () => {
        const finding: Finding = {
            id: 'test-1',
            severity: Severity.INFO,
            pillar: Pillar.SECURITY,
            category: 'test',
            message: 'test message',
            file: null,
            line: null,
            column: null,
            suggestion: 'test suggestion',
            dataSource: 'api',
        };
        expect(finding.dataSource).toBe('api');
    });

    it('accepts local as a dataSource', () => {
        const finding: Finding = {
            id: 'test-2',
            severity: Severity.INFO,
            pillar: Pillar.SECURITY,
            category: 'test',
            message: 'test message',
            file: null,
            line: null,
            column: null,
            suggestion: 'test suggestion',
            dataSource: 'local',
        };
        expect(finding.dataSource).toBe('local');
    });

    it('accepts heuristic as a dataSource', () => {
        const finding: Finding = {
            id: 'test-3',
            severity: Severity.INFO,
            pillar: Pillar.SECURITY,
            category: 'test',
            message: 'test message',
            file: null,
            line: null,
            column: null,
            suggestion: 'test suggestion',
            dataSource: 'heuristic',
        };
        expect(finding.dataSource).toBe('heuristic');
    });

    it('dataSource is optional — findings without it still type-check', () => {
        const finding: Finding = {
            id: 'test-4',
            severity: Severity.INFO,
            pillar: Pillar.SECURITY,
            category: 'test',
            message: 'test message',
            file: null,
            line: null,
            column: null,
            suggestion: 'test suggestion',
        };
        expect(finding.dataSource).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Security scanners
// ---------------------------------------------------------------------------

describe('Security scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('OpenSSFScorecardScanner emits dataSource: api', async () => {
        const { OpenSSFScorecardScanner } = await import('../../src/scanner/security/openssf-scorecard.js');
        const scanner = new OpenSSFScorecardScanner();
        const ctx = makeContext(tmpDir); // no remoteUrl → INFO finding
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('BranchProtectionScanner emits dataSource: api', async () => {
        const { BranchProtectionScanner } = await import('../../src/scanner/security/branch-protection.js');
        const scanner = new BranchProtectionScanner();
        const ctx = makeContext(tmpDir); // no token → INFO finding
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('TokenPermissionsScanner emits dataSource: local', async () => {
        const { TokenPermissionsScanner } = await import('../../src/scanner/security/token-permissions.js');
        const scanner = new TokenPermissionsScanner();
        // No .github/workflows dir → returns []
        // Create a minimal workflow to get a finding
        const workflowDir = path.join(tmpDir, '.github', 'workflows');
        fs.mkdirSync(workflowDir, { recursive: true });
        fs.writeFileSync(path.join(workflowDir, 'ci.yml'), 'on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n');
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('DepPinningPackagesScanner emits dataSource: local', async () => {
        const { DepPinningPackagesScanner } = await import('../../src/scanner/security/dep-pinning-packages.js');
        const scanner = new DepPinningPackagesScanner();
        // Create package.json with loosely pinned dep
        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { 'lodash': '^4.17.21' },
        }));
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('BinaryArtifactScanner emits dataSource: local', async () => {
        const { BinaryArtifactScanner } = await import('../../src/scanner/security/binary-artifacts.js');
        const scanner = new BinaryArtifactScanner();
        // Create a fake .exe file
        fs.writeFileSync(path.join(tmpDir, 'app.exe'), Buffer.from([0x4d, 0x5a, 0x00, 0x00]));
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('OpenSSFLocalChecksScanner emits dataSource: local', async () => {
        const { OpenSSFLocalChecksScanner } = await import('../../src/scanner/security/openssf-local-checks.js');
        const scanner = new OpenSSFLocalChecksScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('DepPinningDockerScanner emits dataSource: local', async () => {
        const { DepPinningDockerScanner } = await import('../../src/scanner/security/dep-pinning-docker.js');
        const scanner = new DepPinningDockerScanner();
        // Create a Dockerfile with latest tag
        fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), 'FROM node:latest\nRUN echo hi\n');
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });
});

// ---------------------------------------------------------------------------
// Governance scanners
// ---------------------------------------------------------------------------

describe('Governance scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-gov-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('LicenseDetectionScanner emits dataSource: local', async () => {
        const { LicenseDetectionScanner } = await import('../../src/scanner/governance/license-detection.js');
        const scanner = new LicenseDetectionScanner();
        const ctx = makeContext(tmpDir); // no license file → CRITICAL finding
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('BusFactorScanner emits dataSource: heuristic', async () => {
        const { BusFactorScanner } = await import('../../src/scanner/governance/bus-factor.js');

        // Mock execSync so we don't need a real git repo
        vi.mock('node:child_process', () => ({
            execSync: vi.fn().mockReturnValue('dev@example.com\ndev@example.com\nother@example.com\n'),
        }));

        const scanner = new BusFactorScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('heuristic');
        }
    });

    it('ClearlyDefinedScanner emits dataSource: api', async () => {
        const { ClearlyDefinedScanner } = await import('../../src/scanner/governance/clearly-defined.js');
        // Mock fetch to return network error → INFO finding
        const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
        const scanner = new ClearlyDefinedScanner(mockFetch as unknown as typeof fetch);
        // Need package.json with at least one dep
        fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
            dependencies: { 'lodash': '4.17.21' },
        }));
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });
});

// ---------------------------------------------------------------------------
// Community scanners
// ---------------------------------------------------------------------------

describe('Community scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-com-test-'));
        vi.resetAllMocks();
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('FundingScanner emits dataSource: local', async () => {
        const { FundingScanner } = await import('../../src/scanner/community/funding.js');
        const scanner = new FundingScanner();
        const ctx = makeContext(tmpDir); // no .github/FUNDING.yml → finding about missing funding
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('PsychSafetyScanner emits dataSource: local', async () => {
        const { PsychSafetyScanner } = await import('../../src/scanner/community/psych-safety.js');
        const scanner = new PsychSafetyScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('StaleBotScanner emits dataSource: local', async () => {
        const { StaleBotScanner } = await import('../../src/scanner/community/stale-bot.js');
        const scanner = new StaleBotScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('SupportChannelScanner emits dataSource: local', async () => {
        const { SupportChannelScanner } = await import('../../src/scanner/community/support-channels.js');
        const scanner = new SupportChannelScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('BurnoutDetectionScanner emits dataSource: api when API call fails gracefully', async () => {
        const { BurnoutDetectionScanner } = await import('../../src/scanner/community/burnout-detection.js');
        const scanner = new BurnoutDetectionScanner();
        const ctx = makeContext(tmpDir); // no remoteUrl → skipped/INFO
        const findings = await scanner.run(ctx);
        // When no remote URL, scanner may return [] or skip — just check populated ones
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('IssueClosureScanner emits dataSource: api', async () => {
        const { IssueClosureScanner } = await import('../../src/scanner/community/issue-closure.js');
        const scanner = new IssueClosureScanner();
        const ctx = makeContext(tmpDir); // no token/remoteUrl → early-exit or INFO
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('ResponseTimeScanner emits dataSource: api', async () => {
        const { ResponseTimeScanner } = await import('../../src/scanner/community/response-time.js');
        const scanner = new ResponseTimeScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('ResponseClassificationScanner emits dataSource: api', async () => {
        const { ResponseClassificationScanner } = await import('../../src/scanner/community/response-classification.js');
        const scanner = new ResponseClassificationScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('api');
        }
    });

    it('ContributorDataScanner emits dataSource: heuristic', async () => {
        // Uses git log data but computes stats — heuristic
        const { ContributorDataScanner } = await import('../../src/scanner/community/contributor-data.js');
        vi.mock('node:child_process', () => ({
            execSync: vi.fn().mockReturnValue('dev@example.com\ndev@example.com\n'),
        }));
        const scanner = new ContributorDataScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('heuristic');
        }
    });

    it('ContributorFunnelScanner emits dataSource: heuristic', async () => {
        const { ContributorFunnelScanner } = await import('../../src/scanner/community/contributor-funnel.js');
        vi.mock('node:child_process', () => ({
            execSync: vi.fn().mockReturnValue('dev@example.com\ndev@example.com\n'),
        }));
        const scanner = new ContributorFunnelScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('heuristic');
        }
    });
});

// ---------------------------------------------------------------------------
// AI-readiness scanners
// ---------------------------------------------------------------------------

describe('AI-readiness scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-ai-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('AgenticRulesScanner emits dataSource: local', async () => {
        const { AgenticRulesScanner } = await import('../../src/scanner/ai-readiness/agentic-rules.js');
        const scanner = new AgenticRulesScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('AIRepoDetectionScanner emits dataSource: local', async () => {
        const { AIRepoDetectionScanner } = await import('../../src/scanner/ai-readiness/ai-repo-detection.js');
        const scanner = new AIRepoDetectionScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('ModelCardDetectionScanner emits dataSource: local', async () => {
        const { ModelCardDetectionScanner } = await import('../../src/scanner/ai-readiness/model-card-detection.js');
        const scanner = new ModelCardDetectionScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });
});

// ---------------------------------------------------------------------------
// Inclusive scanners
// ---------------------------------------------------------------------------

describe('Inclusive scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-inc-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('InclusiveCodeScanner emits dataSource: local', async () => {
        const { InclusiveCodeScanner } = await import('../../src/scanner/inclusive/code-scanner.js');
        const scanner = new InclusiveCodeScanner();
        const ctx = makeContext(tmpDir);
        // InclusiveCodeScanner on empty dir may return []
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('InclusiveDocScanner emits dataSource: local', async () => {
        const { InclusiveDocScanner } = await import('../../src/scanner/inclusive/doc-scanner.js');
        const scanner = new InclusiveDocScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });
});

// ---------------------------------------------------------------------------
// Technical scanners
// ---------------------------------------------------------------------------

describe('Technical scanner dataSource values', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-tech-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('InteractionTemplateScanner emits dataSource: local', async () => {
        const { InteractionTemplateScanner } = await import('../../src/scanner/technical/interaction-templates.js');
        const scanner = new InteractionTemplateScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('LinterConfigScanner emits dataSource: local', async () => {
        const { LinterConfigScanner } = await import('../../src/scanner/technical/linter-config.js');
        const scanner = new LinterConfigScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });

    it('TestCoverageScanner emits dataSource: local', async () => {
        const { TestCoverageScanner } = await import('../../src/scanner/technical/test-coverage.js');
        const scanner = new TestCoverageScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        expect(findings.length).toBeGreaterThan(0);
        for (const f of findings) {
            expect(f.dataSource).toBe('local');
        }
    });
});
