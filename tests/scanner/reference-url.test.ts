/**
 * Tests for `referenceUrl` population across all scanners.
 *
 * Every scanner must set `referenceUrl` on every Finding it creates.
 * Tier A scanners compute a URL from finding data (repo, package, SPDX ID).
 * Tier B scanners set a static reference URL linking to the spec/standard.
 *
 * RED phase: tests fail until referenceUrl is populated in all scanners.
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

/**
 * Assert that every finding in the array has a non-empty referenceUrl string.
 */
function assertReferenceUrls(findings: Finding[]): void {
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) {
        expect(typeof finding.referenceUrl).toBe('string');
        expect((finding.referenceUrl as string).length).toBeGreaterThan(0);
        expect(finding.referenceUrl).toMatch(/^https?:\/\//);
    }
}

// ---------------------------------------------------------------------------
// Tier A — Computed referenceUrl (OpenSSF Scorecard)
// ---------------------------------------------------------------------------

describe('Tier A: OpenSSFScorecardScanner — computed referenceUrl', () => {
    it('sets referenceUrl to scorecard viewer URL when no remoteUrl (fallback to static)', async () => {
        const { OpenSSFScorecardScanner } = await import('../../src/scanner/security/openssf-scorecard.js');
        const scanner = new OpenSSFScorecardScanner();
        const ctx = makeContext('/tmp/fake-repo');
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
    });

    it('sets computed referenceUrl containing owner/repo when GitHub remote is present', async () => {
        const { OpenSSFScorecardScanner } = await import('../../src/scanner/security/openssf-scorecard.js');
        const scanner = new OpenSSFScorecardScanner();

        // Mock fetch to return a scorecard response so we get per-check findings
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
        });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeContext('/tmp/fake-repo', {
            git: {
                commitSha: null,
                branch: 'main',
                remoteUrl: 'https://github.com/testowner/testrepo',
            },
        });
        const findings = await scanner.run(ctx);

        // Each finding should have a referenceUrl containing owner/repo
        assertReferenceUrls(findings);
        for (const finding of findings) {
            expect(finding.referenceUrl).toContain('testowner');
            expect(finding.referenceUrl).toContain('testrepo');
        }

        vi.unstubAllGlobals();
    });
});

// ---------------------------------------------------------------------------
// Tier A — Computed referenceUrl (Branch Protection)
// ---------------------------------------------------------------------------

describe('Tier A: BranchProtectionScanner — computed referenceUrl', () => {
    it('sets referenceUrl with owner/repo in the URL when token is absent (fallback)', async () => {
        const { BranchProtectionScanner } = await import('../../src/scanner/security/branch-protection.js');
        const scanner = new BranchProtectionScanner();
        // No token → returns INFO finding; should still have a referenceUrl
        const ctx = makeContext('/tmp/fake-repo');
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
    });

    it('sets computed referenceUrl with owner/repo when 404 from GitHub API', async () => {
        const { BranchProtectionScanner } = await import('../../src/scanner/security/branch-protection.js');
        const scanner = new BranchProtectionScanner();

        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            statusText: 'Not Found',
        });
        vi.stubGlobal('fetch', mockFetch);

        const ctx = makeContext('/tmp/fake-repo', {
            config: { ...baseConfig(), githubToken: 'test-token' },
            git: {
                commitSha: null,
                branch: 'main',
                remoteUrl: 'https://github.com/myorg/myrepo',
            },
        });
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const finding of findings) {
            expect(finding.referenceUrl).toContain('myorg');
            expect(finding.referenceUrl).toContain('myrepo');
        }

        vi.unstubAllGlobals();
    });
});

// ---------------------------------------------------------------------------
// Tier A — Computed referenceUrl (ClearlyDefined)
// ---------------------------------------------------------------------------

describe('Tier A: ClearlyDefinedScanner — computed referenceUrl per dependency', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('sets referenceUrl containing package name and version in the ClearlyDefined URL', async () => {
        const { ClearlyDefinedScanner } = await import('../../src/scanner/governance/clearly-defined.js');

        // Write a package.json with a single dep
        fs.writeFileSync(
            path.join(tmpDir, 'package.json'),
            JSON.stringify({ dependencies: { axios: '^1.6.0' } }),
        );

        // Mock fetch — return NOASSERTION so we get an INFO finding
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ licensed: { declared: 'NOASSERTION' } }),
        });

        const scanner = new ClearlyDefinedScanner(mockFetch as unknown as typeof fetch);
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);

        assertReferenceUrls(findings);
        // The URL should be the ClearlyDefined definition URL containing the package name
        for (const finding of findings) {
            expect(finding.referenceUrl).toContain('clearlydefined.io');
            expect(finding.referenceUrl).toContain('axios');
        }
    });

    it('sets fallback referenceUrl when ClearlyDefined API is unavailable', async () => {
        const { ClearlyDefinedScanner } = await import('../../src/scanner/governance/clearly-defined.js');

        fs.writeFileSync(
            path.join(tmpDir, 'package.json'),
            JSON.stringify({ dependencies: { lodash: '4.17.21' } }),
        );

        const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });

        const scanner = new ClearlyDefinedScanner(mockFetch as unknown as typeof fetch);
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);

        assertReferenceUrls(findings);
    });
});

// ---------------------------------------------------------------------------
// Tier A — Computed referenceUrl (License Detection)
// ---------------------------------------------------------------------------

describe('Tier A: LicenseDetectionScanner — computed referenceUrl (SPDX)', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('sets SPDX URL when an MIT license file is detected', async () => {
        const { LicenseDetectionScanner } = await import('../../src/scanner/governance/license-detection.js');
        const scanner = new LicenseDetectionScanner();

        fs.writeFileSync(
            path.join(tmpDir, 'LICENSE'),
            'MIT License\nPermission is hereby granted, free of charge ...\nTHE SOFTWARE IS PROVIDED "AS IS"',
        );

        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);

        assertReferenceUrls(findings);
        expect(findings[0].referenceUrl).toContain('spdx.org/licenses/MIT');
    });

    it('sets a non-empty referenceUrl when no license is found', async () => {
        const { LicenseDetectionScanner } = await import('../../src/scanner/governance/license-detection.js');
        const scanner = new LicenseDetectionScanner();

        const ctx = makeContext(tmpDir); // empty dir — no LICENSE file
        const findings = await scanner.run(ctx);

        assertReferenceUrls(findings);
    });
});

// ---------------------------------------------------------------------------
// Tier A — Computed referenceUrl (License Content Validation)
// ---------------------------------------------------------------------------

describe('Tier A: LicenseContentValidationScanner — computed referenceUrl (SPDX)', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('sets SPDX URL when MIT license content matches', async () => {
        const { LicenseContentValidationScanner } = await import(
            '../../src/scanner/governance/license-content-validation.js'
        );
        const scanner = new LicenseContentValidationScanner();

        fs.writeFileSync(
            path.join(tmpDir, 'LICENSE'),
            'MIT License\nPermission is hereby granted, free of charge, ...\nTHE SOFTWARE IS PROVIDED "AS IS"',
        );

        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);

        assertReferenceUrls(findings);
        expect(findings[0].referenceUrl).toContain('spdx.org');
    });

    it('sets a non-empty referenceUrl when no LICENSE file exists', async () => {
        const { LicenseContentValidationScanner } = await import(
            '../../src/scanner/governance/license-content-validation.js'
        );
        const scanner = new LicenseContentValidationScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
    });
});

// ---------------------------------------------------------------------------
// Tier B — Security scanners
// ---------------------------------------------------------------------------

describe('Tier B: Security scanners — static referenceUrl', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('TokenPermissionsScanner: no workflow dir → empty findings (no assertions needed)', async () => {
        const { TokenPermissionsScanner } = await import('../../src/scanner/security/token-permissions.js');
        const scanner = new TokenPermissionsScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        // Empty dir returns no findings — test the referenceUrl when findings exist
        // We need to create a workflow file so findings are produced
        const workflowDir = path.join(tmpDir, '.github', 'workflows');
        fs.mkdirSync(workflowDir, { recursive: true });
        fs.writeFileSync(
            path.join(workflowDir, 'ci.yml'),
            'name: CI\non: push\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n',
        );
        const findings2 = await scanner.run(ctx);
        assertReferenceUrls(findings2);
        for (const f of findings2) {
            expect(f.referenceUrl).toContain('ossf/scorecard');
            expect(f.referenceUrl).toContain('token-permissions');
        }
    });

    it('DepPinningPackagesScanner: sets referenceUrl on all findings', async () => {
        const { DepPinningPackagesScanner } = await import('../../src/scanner/security/dep-pinning-packages.js');
        const scanner = new DepPinningPackagesScanner();

        // Write package.json with unpinned deps
        fs.writeFileSync(
            path.join(tmpDir, 'package.json'),
            JSON.stringify({ dependencies: { lodash: '*', express: '^4.18.0' } }),
        );

        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('ossf/scorecard');
            expect(f.referenceUrl).toContain('pinned-dependencies');
        }
    });

    it('DepPinningDockerScanner: sets referenceUrl on all findings', async () => {
        const { DepPinningDockerScanner } = await import('../../src/scanner/security/dep-pinning-docker.js');
        const scanner = new DepPinningDockerScanner();

        fs.writeFileSync(path.join(tmpDir, 'Dockerfile'), 'FROM ubuntu:latest\nRUN echo hello\n');

        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('ossf/scorecard');
            expect(f.referenceUrl).toContain('pinned-dependencies');
        }
    });

    it('BinaryArtifactScanner: sets referenceUrl on binary findings', async () => {
        const { BinaryArtifactScanner } = await import('../../src/scanner/security/binary-artifacts.js');
        const scanner = new BinaryArtifactScanner();

        // Create a fake .exe binary
        fs.writeFileSync(path.join(tmpDir, 'test.exe'), Buffer.from([0x4D, 0x5A, 0x00, 0x00]));

        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('ossf/scorecard');
            expect(f.referenceUrl).toContain('binary-artifacts');
        }
    });

    it('OpenSSFLocalChecksScanner: sets referenceUrl on all findings', async () => {
        const { OpenSSFLocalChecksScanner } = await import('../../src/scanner/security/openssf-local-checks.js');
        const scanner = new OpenSSFLocalChecksScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('ossf/scorecard');
        }
    });
});

// ---------------------------------------------------------------------------
// Tier B — Governance scanners
// ---------------------------------------------------------------------------

describe('Tier B: Governance scanners — static referenceUrl', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('DepLicenseScanningScanner: sets referenceUrl to spdx.org on all findings', async () => {
        const { DepLicenseScanningScanner } = await import('../../src/scanner/governance/dep-license-scanning.js');
        const scanner = new DepLicenseScanningScanner();
        const ctx = makeContext(tmpDir); // no manifest files → INFO finding
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('spdx.org');
        }
    });

    it('VendorNeutralityScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { VendorNeutralityScanner } = await import('../../src/scanner/governance/vendor-neutrality.js');
        const scanner = new VendorNeutralityScanner();
        // Run in a temp dir that has no git history → INFO finding
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });

    it('BusFactorScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { BusFactorScanner } = await import('../../src/scanner/governance/bus-factor.js');
        const scanner = new BusFactorScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });

    it('GovernanceDetectionScanner: sets referenceUrl to opensource.guide on all findings', async () => {
        const { GovernanceDetectionScanner } = await import('../../src/scanner/governance/governance-detection.js');
        const scanner = new GovernanceDetectionScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('opensource.guide');
        }
    });
});

// ---------------------------------------------------------------------------
// Tier B — Community scanners
// ---------------------------------------------------------------------------

describe('Tier B: Community scanners — static referenceUrl', () => {
    it('BurnoutDetectionScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { BurnoutDetectionScanner } = await import('../../src/scanner/community/burnout-detection.js');
        const scanner = new BurnoutDetectionScanner();
        // No token → INFO finding
        const ctx = makeContext('/tmp/fake-repo');
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });

    it('FundingScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { FundingScanner } = await import('../../src/scanner/community/funding.js');
        const scanner = new FundingScanner();
        const ctx = makeContext('/tmp/fake-repo');
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });

    it('IssueClosureScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { IssueClosureScanner } = await import('../../src/scanner/community/issue-closure.js');
        const scanner = new IssueClosureScanner();
        const ctx = makeContext('/tmp/fake-repo');
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });
});

// ---------------------------------------------------------------------------
// Tier B — AI Readiness scanners
// ---------------------------------------------------------------------------

describe('Tier B: AI Readiness scanners — static referenceUrl', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('AgenticRulesScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { AgenticRulesScanner } = await import('../../src/scanner/ai-readiness/agentic-rules.js');
        const scanner = new AgenticRulesScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });

    it('ModelCardDetectionScanner: sets referenceUrl to huggingface.co on all findings', async () => {
        const { ModelCardDetectionScanner } = await import('../../src/scanner/ai-readiness/model-card-detection.js');
        const scanner = new ModelCardDetectionScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('huggingface.co');
        }
    });
});

// ---------------------------------------------------------------------------
// Tier B — Inclusive scanners
// ---------------------------------------------------------------------------

describe('Tier B: Inclusive scanners — static referenceUrl', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('InclusiveCodeScanner: sets referenceUrl on all findings when terms are found', async () => {
        const { InclusiveCodeScanner } = await import('../../src/scanner/inclusive/code-scanner.js');
        const scanner = new InclusiveCodeScanner();

        // Write a JS file with a non-inclusive term in a comment
        fs.writeFileSync(path.join(tmpDir, 'test.js'), '// master branch config\nconst x = 1;\n');

        const ctx = makeContext(tmpDir, {
            config: {
                ...baseConfig(),
                inclusive: {
                    termListUrl: null,
                    customTerms: {
                        master: [{ term: 'master', tier: 1, replacements: ['main', 'primary'] }],
                    },
                    ignoredTerms: [],
                    excludePatterns: [],
                },
            },
        });
        const findings = await scanner.run(ctx);

        // If there are findings, they must have referenceUrl
        if (findings.length > 0) {
            assertReferenceUrls(findings);
            for (const f of findings) {
                expect(f.referenceUrl).toContain('inclusivenaming.org');
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Tier B — Technical scanners
// ---------------------------------------------------------------------------

describe('Tier B: Technical scanners — static referenceUrl', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ref-url-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('InteractionTemplateScanner: sets referenceUrl to docs.github.com on all findings', async () => {
        const { InteractionTemplateScanner } = await import('../../src/scanner/technical/interaction-templates.js');
        const scanner = new InteractionTemplateScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('docs.github.com');
        }
    });

    it('SemVerValidationScanner: sets referenceUrl to semver.org on all findings', async () => {
        const { SemVerValidationScanner } = await import('../../src/scanner/technical/semver-validation.js');
        const scanner = new SemVerValidationScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('semver.org');
        }
    });

    it('ReleaseCadenceScanner: sets referenceUrl to chaoss.community on all findings', async () => {
        const { ReleaseCadenceScanner } = await import('../../src/scanner/technical/release-cadence.js');
        const scanner = new ReleaseCadenceScanner();
        const ctx = makeContext(tmpDir);
        const findings = await scanner.run(ctx);
        assertReferenceUrls(findings);
        for (const f of findings) {
            expect(f.referenceUrl).toContain('chaoss.community');
        }
    });
});
