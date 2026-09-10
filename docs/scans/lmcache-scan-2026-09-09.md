# quaid-scanner Report: LMCache/LMCache

> **Scan provenance.** Target: [LMCache/LMCache](https://github.com/LMCache/LMCache) branch
> `dev` @ `5eebe0d96a417e3c5605a8d59eb8c683aad276ab`, scanned 2026-09-09 with quaid-scanner
> v0.1.4 at `--depth standard`. Run against a pristine clone rather than a working tree, to
> keep a local `.venv/` out of the results (see #223).
>
> **The 2.3/10 headline is not a credible assessment of this repo — do not cite it.** It is
> dominated by three scanner defects found during this run:
>
> - **#221** — 142 of the 166 `dep-pinning-docker` warnings below are GitHub Actions that are
>   *already* pinned to a full 40-hex SHA, misparsed because of a trailing `# vX.Y.Z` comment.
>   This alone floors the Security pillar (25% weight) to 0.0.
> - **#223** — Python virtualenvs are not excluded from scanning.
> - **#222** — the global bin is a no-op; this scan was run via `node dist/cli.js`.
>
> For calibration, the OpenSSF Scorecard figure embedded in this very report puts LMCache at
> **6.6/10**. Findings that survive triage as genuine: 24 truly unpinned actions (major-only
> refs), untagged Docker base images in `docker/Dockerfile*`, 77 known vulnerabilities, no
> fuzzing, unsigned releases, a 0.14 issue-closure ratio, and 60% SemVer tag compliance.
> The `model-card-scoring` CRITICAL is a category error (LMCache is a KV-cache library, not a
> model), and most inclusive-language hits are third-party API names (`MOONCAKE_MASTER_SERVER_ADDRESS`,
> Redis Sentinel's `redismaster`) and vLLM request-lifecycle vocabulary (`_abort_request`).


**Score:** 🔴 2.3/10 — CRITICAL risk
**Maturity:** sandbox | **Depth:** standard | **Duration:** 3.6s
**Scanned:** 2026-09-09T10:07:29-07:00

## Pillar Scores

| Pillar | Score | Weight | Findings |
|--------|-------|--------|----------|
| Security | 0.0 | 25% | 23C 186W 0I |
| Governance | 7.6 | 20% | 0C 1W 9I |
| Community | 0.0 | 15% | 1C 5W 5I |
| AI Readiness | 2.4 | 15% | 1C 3W 1I |
| Inclusive Language | 0.0 | 15% | 0C 185W 42I |
| Technical Rigor | 3.8 | 10% | 1C 2W 2I |

## Critical Findings

### branch-protection-1
**Pillar:** Security | **Category:** branch-protection

No branch protection configured on branch "dev".

_(source: external API)_

**Details:**
Branch: dev

**Suggestion:** Enable branch protection rules in GitHub repository settings. At minimum, require pull request reviews and status checks before merging.

**Reference:** https://github.com/LMCache/LMCache/settings/branches

### dep-pinning-docker-1
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "${BASE_IMAGE}" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile`:17

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-2
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile`:49

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-3
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile`:104

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-4
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile`:132

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-5
**Pillar:** Security | **Category:** dependency-pinning

Docker base image uses ":latest" tag: "vllm/vllm-openai:latest"

_(source: local file check)_

> File: `docker/Dockerfile.lightweight`:3

**Suggestion:** Pin to a specific version tag or use @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-6
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "${SOURCE_IMAGE}" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.payload`:38

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-8
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "${BASE_IMAGE}" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.rocm`:20

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-9
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.rocm`:49

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-10
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.rocm`:99

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-11
**Pillar:** Security | **Category:** dependency-pinning

Docker base image uses ":latest" tag: "vllm/vllm-openai-rocm:latest"

_(source: local file check)_

> File: `docker/Dockerfile.rocm-lightweight`:7

**Suggestion:** Pin to a specific version tag or use @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-12
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "${BASE_IMAGE}" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.standalone`:14

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-13
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.standalone`:60

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-14
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.standalone`:88

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-15
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.standalone`:129

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### dep-pinning-docker-17
**Pillar:** Security | **Category:** dependency-pinning

Docker base image "base" has no tag (implies :latest)

_(source: local file check)_

> File: `docker/Dockerfile.xpu`:34

**Suggestion:** Add a version tag or @sha256: digest

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies

### openssf-scorecard-7
**Pillar:** Security | **Category:** openssf-scorecard

Scorecard check "Token-Permissions": 0/10 — detected GitHub workflow tokens with excessive permissions

_(source: external API)_

**Details:**
Check: Token-Permissions — 0/10

**Suggestion:** Improve the "Token-Permissions" check to strengthen supply chain security

**Reference:** https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache

### openssf-scorecard-10
**Pillar:** Security | **Category:** openssf-scorecard

Scorecard check "Vulnerabilities": 0/10 — 77 existing vulnerabilities detected

_(source: external API)_

**Details:**
Check: Vulnerabilities — 0/10

**Suggestion:** Improve the "Vulnerabilities" check to strengthen supply chain security

**Reference:** https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache

### openssf-scorecard-13
**Pillar:** Security | **Category:** openssf-scorecard

Scorecard check "Fuzzing": 0/10 — project is not fuzzed

_(source: external API)_

**Details:**
Check: Fuzzing — 0/10

**Suggestion:** Improve the "Fuzzing" check to strengthen supply chain security

**Reference:** https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache

### openssf-scorecard-16
**Pillar:** Security | **Category:** openssf-scorecard

Scorecard check "Signed-Releases": 0/10 — Project has not signed or included provenance with any releases.

_(source: external API)_

**Details:**
Check: Signed-Releases — 0/10

**Suggestion:** Improve the "Signed-Releases" check to strengthen supply chain security

**Reference:** https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache

### openssf-scorecard-17
**Pillar:** Security | **Category:** openssf-scorecard

Scorecard check "Pinned-Dependencies": 4/10 — dependency not pinned by hash detected -- score normalized to 4

_(source: external API)_

**Details:**
Check: Pinned-Dependencies — 4/10

**Suggestion:** Improve the "Pinned-Dependencies" check to strengthen supply chain security

**Reference:** https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache

### token-permissions-8
**Pillar:** Security | **Category:** token-permissions

Workflow ".github/workflows/build_doc.yml" has no top-level permissions block (inherits default read-write)

_(source: local file check)_

> File: `.github/workflows/build_doc.yml`

**Suggestion:** Add a "permissions:" block with minimal required permissions

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#token-permissions

### token-permissions-16
**Pillar:** Security | **Category:** token-permissions

Workflow ".github/workflows/codeql.yml" has no top-level permissions block (inherits default read-write)

_(source: local file check)_

> File: `.github/workflows/codeql.yml`

**Suggestion:** Add a "permissions:" block with minimal required permissions

**Reference:** https://github.com/ossf/scorecard/blob/main/docs/checks.md#token-permissions

### issue-closure-1
**Pillar:** Community | **Category:** issue-closure

Closure ratio: 0.14 (18 closed / 127 opened in 90 days)

_(source: external API)_

**Suggestion:** Team is overwhelmed — intervention needed to prevent maintainer burnout

**Reference:** https://chaoss.community/metric-issue-resolution-duration/

### model-card-scoring-1
**Pillar:** AI Readiness | **Category:** model-card-scoring

Model card critically incomplete: 5% — add required sections: Model Description, Intended Use, Limitations

_(source: local file check)_

> File: `README.md`

**Suggestion:** Improve model card in README.md by adding missing sections.

**Reference:** https://huggingface.co/docs/hub/en/model-cards

### semver-validation-1
**Pillar:** Technical Rigor | **Category:** semver

Only 60% of tags follow SemVer (39/65)

_(source: local file check)_

**Suggestion:** Adopt SemVer for all releases — consumers depend on predictable versioning

**Reference:** https://semver.org/

## Warnings

- **[dep-pinning-docker-7]** Docker base image "busybox:1.37" uses tag without digest *(Pin with digest: busybox:1.37@sha256:<hash>)*
- **[dep-pinning-docker-16]** Docker base image "${BASE_IMAGE}:${BASE_IMAGE_TAG}" uses tag without digest *(Pin with digest: ${BASE_IMAGE}:${BASE_IMAGE_TAG}@sha256:<hash>)*
- **[dep-pinning-docker-18]** Docker base image "golang:1.25" uses tag without digest *(Pin with digest: golang:1.25@sha256:<hash>)*
- **[dep-pinning-docker-19]** Docker base image "gcr.io/distroless/static:nonroot" uses tag without digest *(Pin with digest: gcr.io/distroless/static:nonroot@sha256:<hash>)*
- **[dep-pinning-docker-20]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/actionlint.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-21]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/actionlint.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-22]** Action "actions/checkout" uses version "@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2" in ".github/workflows/aerospike_integration.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-23]** Action "actions/setup-python" uses version "@a309ff8b426b58ec0e2a45f0f869d46889d02405 # v6.2.0" in ".github/workflows/aerospike_integration.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-24]** Action "ubuntudroid/automerge-labeler" uses major-only version "@v1" in ".github/workflows/automerge-labeler.yml" *(Consider pinning to a full semver (e.g., @v1.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-25]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/azure_integration.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-26]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/azure_integration.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-27]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/azure_integration.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-28]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_cli_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-29]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_cli_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-30]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_cli_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-31]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_cli_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-32]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_cpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-33]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_cpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-34]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_cpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-35]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_cpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-36]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_cu129_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-37]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_cu129_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-38]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/build_cu129_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-39]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_cu129_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-40]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_cu129_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-41]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-42]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-43]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-44]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-45]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-46]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-47]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_doc.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-48]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_main_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-49]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_main_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-50]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_main_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-51]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_main_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-52]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_main_artifacts_arm64.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-53]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_main_artifacts_arm64.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-54]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/build_main_artifacts_arm64.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-55]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_main_artifacts_arm64.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-56]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_musa_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-57]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_musa_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-58]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_musa_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-59]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_rocm_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-60]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_rocm_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-61]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/build_rocm_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-62]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_rocm_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-63]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_rocm_torch210_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-64]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_rocm_torch210_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-65]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/build_rocm_torch210_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-66]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_rocm_torch210_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-67]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/build_xpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-68]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/build_xpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-69]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/build_xpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-70]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/build_xpu_artifacts.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-71]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-72]** Action "dorny/paths-filter" uses major-only version "@v3" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a full semver (e.g., @v3.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-73]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-74]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-75]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-76]** Action "pre-commit/action" uses version "@2c7b3805fd2a0fd8c1884dcaebf91fc102a13ecd # v3.0.1" in ".github/workflows/code_quality_checks.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-77]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/codeql.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-78]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/codeql.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-79]** Action "github/codeql-action/init" uses version "@cdf488f595d80d6e07e03d4674febd5ab45fa938 # v4.37.9" in ".github/workflows/codeql.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-80]** Action "github/codeql-action/analyze" uses version "@cdf488f595d80d6e07e03d4674febd5ab45fa938 # v4.37.9" in ".github/workflows/codeql.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-81]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-82]** Action "dorny/paths-filter" uses major-only version "@v3" in ".github/workflows/cpu_device.yml" *(Consider pinning to a full semver (e.g., @v3.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-83]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-84]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-85]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-86]** Action "actions/cache" uses major-only version "@v4" in ".github/workflows/cpu_device.yml" *(Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-87]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-88]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/cpu_device.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-89]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-90]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-91]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-92]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-93]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-94]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-95]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-96]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-97]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-98]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-99]** Action "docker/setup-buildx-action" uses version "@e468171a9de216ec08956ac3ada2f0791b6bd435 # v3.11.1" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-100]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-101]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-102]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-103]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-104]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-105]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/nightly_build.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-106]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/operator_ci.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-107]** Action "dorny/paths-filter" uses major-only version "@v3" in ".github/workflows/operator_ci.yml" *(Consider pinning to a full semver (e.g., @v3.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-108]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/operator_ci.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-109]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/operator_ci.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-110]** Action "actions/setup-go" uses major-only version "@v5" in ".github/workflows/operator_ci.yml" *(Consider pinning to a full semver (e.g., @v5.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-111]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-112]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-113]** Action "docker/setup-buildx-action" uses version "@e468171a9de216ec08956ac3ada2f0791b6bd435 # v3.11.1" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-114]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-115]** Action "docker/build-push-action" uses major-only version "@v6" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a full semver (e.g., @v6.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-116]** Action "actions/setup-go" uses major-only version "@v5" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a full semver (e.g., @v5.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-117]** Action "softprops/action-gh-release" uses major-only version "@v2" in ".github/workflows/operator_nightly.yml" *(Consider pinning to a full semver (e.g., @v2.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-118]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/operator_release.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-119]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/operator_release.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-120]** Action "docker/setup-buildx-action" uses version "@e468171a9de216ec08956ac3ada2f0791b6bd435 # v3.11.1" in ".github/workflows/operator_release.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-121]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/operator_release.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-122]** Action "docker/build-push-action" uses major-only version "@v6" in ".github/workflows/operator_release.yml" *(Consider pinning to a full semver (e.g., @v6.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-123]** Action "actions/setup-go" uses major-only version "@v5" in ".github/workflows/operator_release.yml" *(Consider pinning to a full semver (e.g., @v5.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-124]** Action "softprops/action-gh-release" uses major-only version "@v2" in ".github/workflows/operator_release.yml" *(Consider pinning to a full semver (e.g., @v2.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-125]** Action "softprops/action-gh-release" uses major-only version "@v2" in ".github/workflows/operator_release.yml" *(Consider pinning to a full semver (e.g., @v2.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-126]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-127]** Action "dorny/paths-filter" uses major-only version "@v3" in ".github/workflows/publish.yml" *(Consider pinning to a full semver (e.g., @v3.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-128]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-129]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-130]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-131]** Action "pypa/gh-action-pypi-publish" uses version "@ed0c53931b1dc9bd32cbe73a98c7f6766f8a527e # v1.13.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-132]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-133]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-134]** Action "pypa/gh-action-pypi-publish" uses version "@ed0c53931b1dc9bd32cbe73a98c7f6766f8a527e # v1.13.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-135]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-136]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-137]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-138]** Action "pypa/gh-action-pypi-publish" uses version "@ed0c53931b1dc9bd32cbe73a98c7f6766f8a527e # v1.13.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-139]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-140]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-141]** Action "pypa/gh-action-pypi-publish" uses version "@ed0c53931b1dc9bd32cbe73a98c7f6766f8a527e # v1.13.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-142]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-143]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-144]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-145]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-146]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-147]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-148]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-149]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-150]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-151]** Action "actions/download-artifact" uses version "@37930b1c2abaa49bbe596cd826c3c89aef350131 # v7.0.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-152]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-153]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-154]** Action "docker/setup-buildx-action" uses version "@e468171a9de216ec08956ac3ada2f0791b6bd435 # v3.11.1" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-155]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-156]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-157]** Action "docker/login-action" uses version "@5e57cd118135c172c3672efd75eb46360885c0ef # v3.6.0" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-158]** Action "docker/setup-buildx-action" uses version "@e468171a9de216ec08956ac3ada2f0791b6bd435 # v3.11.1" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-159]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/publish.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-160]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/scorecard.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-161]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/scorecard.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-162]** Action "ossf/scorecard-action" uses version "@4eaacf0543bb3f2c246792bd56e8cdeffafb205a # v2.4.3" in ".github/workflows/scorecard.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-163]** Action "actions/upload-artifact" uses version "@b7c566a772e6b6bfb58ed0dc250532a479d7789f # v6.0.0" in ".github/workflows/scorecard.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-164]** Action "github/codeql-action/upload-sarif" uses major-only version "@v4" in ".github/workflows/scorecard.yml" *(Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-165]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/stale_bot.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-166]** Action "actions/stale" uses version "@997185467fa4f803885201cee163a9f38240193d # v10.1.1" in ".github/workflows/stale_bot.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-167]** Action "actions/checkout" uses major-only version "@v4" in ".github/workflows/sync_torch_version.yml" *(Consider pinning to a full semver (e.g., @v4.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-168]** Action "peter-evans/create-pull-request" uses major-only version "@v8" in ".github/workflows/sync_torch_version.yml" *(Consider pinning to a full semver (e.g., @v8.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-169]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-170]** Action "dorny/paths-filter" uses major-only version "@v3" in ".github/workflows/test.yml" *(Consider pinning to a full semver (e.g., @v3.0.0) or SHA for better reproducibility)*
- **[dep-pinning-docker-171]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-172]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-173]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-174]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-175]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-176]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-177]** Action "dtolnay/rust-toolchain" uses version "@stable" in ".github/workflows/test.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-178]** Action "step-security/harden-runner" uses version "@20cf305ff2072d973412fa9b1e3a4f227bda3c76 # v2.14.0" in ".github/workflows/translate_doc_zh.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-179]** Action "actions/checkout" uses version "@8e8c483db84b4bee98b60c0593521ed34d9990e8 # v6.0.1" in ".github/workflows/translate_doc_zh.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-180]** Action "actions/setup-python" uses version "@83679a892e2d95755f2dac6acb0bfd1e9ac5d548 # v6.1.0" in ".github/workflows/translate_doc_zh.yml" *(Consider pinning to a SHA for maximum reproducibility)*
- **[dep-pinning-docker-181]** Action "peter-evans/create-pull-request" uses major-only version "@v8" in ".github/workflows/translate_doc_zh.yml" *(Consider pinning to a full semver (e.g., @v8.0.0) or SHA for better reproducibility)*
- **[openssf-scorecard-1]** Overall OpenSSF Scorecard score: 6.6/10 for LMCache/LMCache *(Review scorecard checks with low scores for improvement opportunities)*
- **[openssf-scorecard-9]** Scorecard check "CII-Best-Practices": 5/10 — badge detected: Passing *(Consider improving "CII-Best-Practices" for better security posture)*
- **[openssf-scorecard-15]** Scorecard check "Branch-Protection": 5/10 — branch protection is not maximal on development and all release branches *(Consider improving "Branch-Protection" for better security posture)*
- **[token-permissions-3]** Workflow ".github/workflows/automerge-labeler.yml" grants "pull-requests: write" permission *(Review if "pull-requests: write" is necessary. Use "read" if possible)*
- **[token-permissions-17]** Job "analyze" in ".github/workflows/codeql.yml" overrides "security-events: write" at job level *(Review if "security-events: write" is necessary for job "analyze")*
- **[token-permissions-20]** Job "nightly-wheels" in ".github/workflows/nightly_build.yml" overrides "contents: write" at job level *(Review if "contents: write" is necessary for job "nightly-wheels")*
- **[token-permissions-21]** Job "publish-nightly-rocm" in ".github/workflows/nightly_build.yml" overrides "contents: write" at job level *(Review if "contents: write" is necessary for job "publish-nightly-rocm")*
- **[token-permissions-22]** Job "publish-nightly-musa" in ".github/workflows/nightly_build.yml" overrides "contents: write" at job level *(Review if "contents: write" is necessary for job "publish-nightly-musa")*
- **[token-permissions-23]** Job "nightly-pin-or-report-vllm" in ".github/workflows/nightly_build.yml" overrides "contents: write" at job level *(Review if "contents: write" is necessary for job "nightly-pin-or-report-vllm")*
- **[token-permissions-24]** Job "nightly-pin-or-report-vllm" in ".github/workflows/nightly_build.yml" overrides "issues: write" at job level *(Review if "issues: write" is necessary for job "nightly-pin-or-report-vllm")*
- **[token-permissions-26]** Workflow ".github/workflows/operator_nightly.yml" grants "contents: write" permission *(Review if "contents: write" is necessary. Use "read" if possible)*
- **[token-permissions-27]** Workflow ".github/workflows/operator_release.yml" grants "contents: write" permission *(Review if "contents: write" is necessary. Use "read" if possible)*
- **[token-permissions-31]** Job "analysis" in ".github/workflows/scorecard.yml" overrides "security-events: write" at job level *(Review if "security-events: write" is necessary for job "analysis")*
- **[token-permissions-32]** Job "analysis" in ".github/workflows/scorecard.yml" overrides "id-token: write" at job level *(Review if "id-token: write" is necessary for job "analysis")*
- **[token-permissions-34]** Job "stale" in ".github/workflows/stale_bot.yml" overrides "issues: write" at job level *(Review if "issues: write" is necessary for job "stale")*
- **[token-permissions-35]** Job "stale" in ".github/workflows/stale_bot.yml" overrides "pull-requests: write" at job level *(Review if "pull-requests: write" is necessary for job "stale")*
- **[token-permissions-36]** Workflow ".github/workflows/sync_torch_version.yml" grants "contents: write" permission *(Review if "contents: write" is necessary. Use "read" if possible)*
- **[token-permissions-37]** Workflow ".github/workflows/sync_torch_version.yml" grants "pull-requests: write" permission *(Review if "pull-requests: write" is necessary. Use "read" if possible)*
- **[token-permissions-39]** Workflow ".github/workflows/translate_doc_zh.yml" grants "contents: write" permission *(Review if "contents: write" is necessary. Use "read" if possible)*
- **[token-permissions-40]** Workflow ".github/workflows/translate_doc_zh.yml" grants "pull-requests: write" permission *(Review if "pull-requests: write" is necessary. Use "read" if possible)*
- **[governance-classification-1]** Unclear governance model — best guess is "Meritocracy" with low confidence (38%) *(Document the governance model explicitly in GOVERNANCE.md for clarity)*
- **[burnout-detection-2]** Issue closure ratio: 0.04 (1/27) *(Low closure ratio indicates capacity issues)*
- **[contributor-funnel-3]** Contributor revolving door: 84% of contributors are casual (1-5 commits) *(High casual ratio suggests retention issues — improve contributor onboarding and mentorship)*
- **[response-classification-1]** GitHub API error: Argument 'field' on InputObject 'IssueCommentOrder' has an invalid value (CREATED_AT). Expected type 'IssueCommentOrderField!'. *(Check GitHub token permissions and repository access)*
- **[response-time-1]** GitHub API error: Argument 'field' on InputObject 'IssueCommentOrder' has an invalid value (CREATED_AT). Expected type 'IssueCommentOrderField!'. *(Check GitHub token permissions and repository access)*
- **[support-channels-1]** No SUPPORT.md or .github/SUPPORT.md found *(Add a SUPPORT.md documenting how users can get help)*
- **[agentic-rules-2]** CLAUDE.md lacks recognized structural sections *(Add sections like "Critical Rules", "Project Structure", "Common Tasks" to improve agent guidance.)*
- **[dataset-provenance-2]** Datasets found but no datasheet documentation (DATASHEET.md, DATA_README.md, or data/README.md) *(Create a DATASHEET.md documenting dataset motivation, composition, collection process, and intended uses.)*
- **[model-card-detection-1]** Model card missing required sections: Model Description, Intended Use, Limitations *(Add missing sections to README.md: Model Description, Intended Use, Limitations)*
- **[DIMINISH-AGENTS.md:143:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-CONTRIBUTING.md:126:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-README.md:89:simply [verb]]** Found diminishing language "simply install" in documentation *(Remove "simply" — it implies the task should be obvious and can make readers feel inadequate.)*
- **[DIMINISH-docs/design/v1/distributed/l2_adapters/l2_per_user_quota.md:214:simply [verb]]** Found diminishing language "simply use" in documentation *(Remove "simply" — it implies the task should be obvious and can make readers feel inadequate.)*
- **[DIMINISH-docs/design/v1/encoder-cache.md:193:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/design/v1/mp_coordinator/memory_pressure.md:146:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-docs/source/api_reference/multimodality.rst:128:obvious/obviously]** Found diminishing language "obvious" in documentation *(Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.)*
- **[DIMINISH-examples/disagg_prefill/1p1d/README.md:7:simply [verb]]** Found diminishing language "simply run" in documentation *(Remove "simply" — it implies the task should be obvious and can make readers feel inadequate.)*
- **[DIMINISH-examples/disagg_prefill/xpyd/README.md:7:simply [verb]]** Found diminishing language "simply run" in documentation *(Remove "simply" — it implies the task should be obvious and can make readers feel inadequate.)*
- **[DIMINISH-SUMMARY]** Welcoming score: 45/100 (9 warnings, 28 info) *(Review flagged diminishing language to make documentation more welcoming to all skill levels.)*
- **[inclusive-code-scanner-1]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-2]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-3]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-4]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-5]** [Tier 1 — Replace Immediately] Non-inclusive term "whitelist" found in code comment *(Consider using: allowlist, approved list, safe list)*
- **[inclusive-code-scanner-6]** [Tier 1 — Replace Immediately] Non-inclusive term "whitelist" found in code comment *(Consider using: allowlist, approved list, safe list)*
- **[inclusive-code-scanner-7]** [Tier 1 — Replace Immediately] Non-inclusive term "whitelist" found in code comment *(Consider using: allowlist, approved list, safe list)*
- **[inclusive-code-scanner-8]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-9]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-10]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-11]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-12]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-13]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-14]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-15]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-16]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-17]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-18]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-19]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-20]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in code comment *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-21]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-22]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-23]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-24]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-25]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-26]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-27]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-28]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-29]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in code comment *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-30]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-31]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-32]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-33]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-34]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-35]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-36]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-37]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-38]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-39]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-40]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-41]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-42]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-43]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-44]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-45]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-46]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-47]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-48]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-49]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-50]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-51]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-52]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-53]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-54]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-55]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-56]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-57]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-58]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-59]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-60]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-61]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-62]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-63]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-64]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-65]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-66]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-67]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-68]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-69]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in code comment *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-70]** [Tier 1 — Replace Immediately] Non-inclusive term "master-slave" found in code comment *(Consider using: primary-secondary, leader-follower, controller-worker)*
- **[inclusive-code-scanner-71]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-72]** [Tier 1 — Replace Immediately] Non-inclusive term "slave" found in code comment *(Consider using: secondary, replica, follower, worker)*
- **[inclusive-code-scanner-73]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-74]** [Tier 1 — Replace Immediately] Non-inclusive term "slave" found in code comment *(Consider using: secondary, replica, follower, worker)*
- **[inclusive-code-scanner-75]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in code comment *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-76]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in string literal *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-77]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in string literal *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-78]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found in code comment *(Consider using: main, primary, source, original)*
- **[inclusive-code-scanner-79]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-80]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-81]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found in code comment *(Consider using: confidence check, validity check, coherence check)*
- **[inclusive-code-scanner-82]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in code comment *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-83]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-84]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-85]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-86]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-87]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-88]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-89]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-90]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-91]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-92]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-93]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-94]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-95]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-code-scanner-96]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found in string literal *(Consider using: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:operator/DESIGN.md:124:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:operator/DESIGN.md:131:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:operator/AGENTS.md:119:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:operator/AGENTS.md:539:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:operator/AGENTS.md:619:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:operator/AGENTS.md:622:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/index.rst:1:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/online_session/ffmpeg.txt:240:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:examples/online_session/ffmpeg.txt:1290:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:examples/frontend/ffmpeg.txt:240:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:examples/frontend/ffmpeg.txt:1290:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:lmcache/v1/mp_observability/README.md:73:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/pd_async_reservation_design.md:91:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "Abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/design/v1/pd_async_reservation_design.md:94:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "ABORTED" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/design/v1/pd_async_reservation_design.md:109:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborted" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/design/v1/pd_async_reservation_design.md:133:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/design/v1/hidden_state_store.md:97:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/encoder-cache.md:222:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborts" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/source/recipes/minimax_m3.rst:115:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborts" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/source/recipes/gemma4.rst:136:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborts" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/source/non_kv_cache/hidden_states.rst:33:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/non_kv_cache/encoder_cache.rst:107:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborts" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/source/mp/tracing_and_debugging.rst:106:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity-check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:docs/source/mp/serde.rst:139:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/serde.rst:143:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/serde.rst:145:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/serde.rst:151:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/serde.rst:152:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:547:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:548:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:552:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:833:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:838:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:839:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:840:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:859:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:862:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/operator.rst:1227:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "abort" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/source/mp/configuration.rst:565:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/developer_guide/contributing.rst:39:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/turboquant/README.md:25:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:examples/serde/fp8/README.md:25:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:10:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:15:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:29:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:60:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:81:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:106:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:114:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/serde/aesgcm/README.md:124:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/mp_observability/trace.md:273:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "Sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:docs/design/v1/mp_observability/README.md:73:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/mp_observability/DEBUG.md:51:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "Sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:docs/source/mp/observability/index.rst:222:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/mp/l2_storage/mooncake_store.rst:99:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:139:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:167:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:171:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:172:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:173:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:185:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:189:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:341:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:345:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/redis.rst:346:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:43:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:61:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:65:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:73:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:75:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:149:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:199:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/source/kv_cache/storage_backends/mooncake.rst:202:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:examples/kv_cache_reuse/remote_backends/resp/README.md:9:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:docs/design/v1/distributed/storage_controllers/prefetch_l1_lock_pass.md:141:abort]** [Tier 1 — Replace Immediately] Non-inclusive term "abort" found. Consider using: cancel, terminate, stop, halt *(Replace "aborts" with one of: cancel, terminate, stop, halt)*
- **[inclusive-doc-scanner:docs/design/v1/distributed/serde/turboquant.md:223:sanity check]** [Tier 2 — Strongly Consider] Non-inclusive term "sanity check" found. Consider using: confidence check, validity check, coherence check *(Replace "sanity check" with one of: confidence check, validity check, coherence check)*
- **[inclusive-doc-scanner:docs/design/v1/distributed/serde/aesgcm.md:73:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/distributed/serde/aesgcm.md:75:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "master" with one of: main, primary, source, original)*
- **[inclusive-doc-scanner:docs/design/v1/distributed/serde/aesgcm.md:90:master]** [Tier 1 — Replace Immediately] Non-inclusive term "master" found. Consider using: main, primary, source, original *(Replace "Master" with one of: main, primary, source, original)*
- **[test-coverage-2]** No coverage configuration file found *(Add a coverage configuration (e.g., vitest.config.ts with coverage thresholds, jest.config.js with coverageThreshold, or .nycrc) to enforce coverage minimums)*
- **[semver-validation-2]** 39 versioned tags found but no CHANGELOG detected *(Add a CHANGELOG.md documenting changes per release (see keepachangelog.com))*

## Info

- **[asset-protection-1]** No trademark policy found (optional)
- **[asset-protection-2]** No export control documentation found (optional)
- **[asset-protection-4]** Contributor friction level: Medium
- **[dep-license-scanning-1]** No dependency manifest files found
- **[governance-detection-1]** No governance documentation found
- **[license-compatibility-1]** Project license is Apache-2.0 — no installed dependencies to check compatibility
- **[license-header-scanner:summary]** License header scan complete: 96 of 100 source file(s) have SPDX headers.
- **[vendor-neutrality-domain-count]** Found 49 unique email domain(s) across 1565 commits
- **[vendor-neutrality-no-succession]** No succession planning documentation found
- **[contributor-data-2]** Contributor emails span 49 domains
- **[contributor-funnel-1]** Contributor funnel: 5 core, 34 regular, 202 casual (241 total)
- **[funding-1]** No funding infrastructure detected
- **[stale-bot-1]** No stale bot configured
- **[support-channels-2]** Support channels detected: slack
- **[dataset-provenance-3]** No data versioning tool detected
- **[AK-ACRONYM-LLM-README.md:6]** Undefined acronym "LLM" may confuse newcomers
- **[AK-ACRONYM-AMD-README.md:32]** Undefined acronym "AMD" may confuse newcomers
- **[AK-ACRONYM-GTC-README.md:34]** Undefined acronym "GTC" may confuse newcomers
- **[AK-ACRONYM-CPU-README.md:35]** Undefined acronym "CPU" may confuse newcomers
- **[AK-ACRONYM-TTFT-README.md:53]** Undefined acronym "TTFT" may confuse newcomers
- **[AK-ACRONYM-RAG-README.md:53]** Undefined acronym "RAG" may confuse newcomers
- **[AK-ACRONYM-GPU-README.md:69]** Undefined acronym "GPU" may confuse newcomers
- **[AK-ACRONYM-RAM-README.md:73]** Undefined acronym "RAM" may confuse newcomers
- **[AK-ACRONYM-SSD-README.md:73]** Undefined acronym "SSD" may confuse newcomers
- **[AK-ACRONYM-NIXL-README.md:73]** Undefined acronym "NIXL" may confuse newcomers
- **[AK-ACRONYM-GDS-README.md:73]** Undefined acronym "GDS" may confuse newcomers
- **[AK-ACRONYM-RDMA-README.md:77]** Undefined acronym "RDMA" may confuse newcomers
- **[AK-ACRONYM-ACM-README.md:138]** Undefined acronym "ACM" may confuse newcomers
- **[AK-ACRONYM-SLF-CONTRIBUTING.md:109]** Undefined acronym "SLF" may confuse newcomers
- **[DIMINISH-README.md:73:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-docs/coding_standards.md:129:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/coding_standards.md:301:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/coding_standards.md:319:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/coding_standards.md:350:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/design/integration/vllm/hybrid-kv-cache-groups.md:95:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/design/v1/distributed/serde/README.md:269:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/design/v1/mp_observability/blend_observability.md:127:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/design/v1/mp_observability/blend_observability.md:190:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/design/v1/platform/device_ops_design.md:431:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/design/v1/platform/device_ops_design.md:432:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/source/cli/describe.rst:139:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/developer_guide/contributing.rst:49:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/developer_guide/contributing.rst:89:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/index.rst:63:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/cli/describe.po:170:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/developer_guide/contributing.po:189:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/developer_guide/contributing.po:328:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/index.po:127:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/mp/p2p.po:298:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/locale/zh_CN/LC_MESSAGES/production/observability/health_monitor.po:50:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-docs/source/mp/configuration.rst:647:trivial]** Found diminishing language "trivial" in documentation
- **[DIMINISH-docs/source/mp/p2p.rst:231:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-docs/source/production/observability/health_monitor.rst:14:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-examples/kv_cache_calculator/README.md:84:easy/easily]** Found diminishing language "easily" in documentation
- **[DIMINISH-examples/online_session/README.md:139:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-operator/AGENTS.md:571:easy/easily]** Found diminishing language "easy" in documentation
- **[DIMINISH-operator/DESIGN.md:16:easy/easily]** Found diminishing language "easy" in documentation
- **[interaction-templates-1]** 3 issue templates found
- **[test-coverage-3]** No coverage badge found in README

## Recommendations

- **[HIGH impact / medium effort]** Enable branch protection rules in GitHub repository settings. At minimum, require pull request reviews and status checks before merging.
  - https://github.com/LMCache/LMCache/settings/branches
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Pin to a specific version tag or use @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Pin to a specific version tag or use @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Add a version tag or @sha256: digest
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#pinned-dependencies
- **[HIGH impact / medium effort]** Improve the "Token-Permissions" check to strengthen supply chain security
  - https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache
- **[HIGH impact / medium effort]** Improve the "Vulnerabilities" check to strengthen supply chain security
  - https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache
- **[HIGH impact / medium effort]** Improve the "Fuzzing" check to strengthen supply chain security
  - https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache
- **[HIGH impact / medium effort]** Improve the "Signed-Releases" check to strengthen supply chain security
  - https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache
- **[HIGH impact / medium effort]** Improve the "Pinned-Dependencies" check to strengthen supply chain security
  - https://securityscorecards.dev/viewer/?uri=github.com/LMCache/LMCache
- **[HIGH impact / medium effort]** Add a "permissions:" block with minimal required permissions
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#token-permissions
- **[HIGH impact / medium effort]** Add a "permissions:" block with minimal required permissions
  - https://github.com/ossf/scorecard/blob/main/docs/checks.md#token-permissions
- **[HIGH impact / medium effort]** Team is overwhelmed — intervention needed to prevent maintainer burnout
  - https://chaoss.community/metric-issue-resolution-duration/
- **[HIGH impact / medium effort]** Improve model card in README.md by adding missing sections.
  - https://huggingface.co/docs/hub/en/model-cards
- **[HIGH impact / medium effort]** Adopt SemVer for all releases — consumers depend on predictable versioning
  - https://semver.org/
- **[MEDIUM impact / low effort]** Pin with digest: busybox:1.37@sha256:<hash>
- **[MEDIUM impact / low effort]** Review scorecard checks with low scores for improvement opportunities
- **[MEDIUM impact / low effort]** Review if "pull-requests: write" is necessary. Use "read" if possible
- **[MEDIUM impact / low effort]** Document the governance model explicitly in GOVERNANCE.md for clarity
- **[MEDIUM impact / low effort]** Low closure ratio indicates capacity issues
- **[MEDIUM impact / low effort]** High casual ratio suggests retention issues — improve contributor onboarding and mentorship
- **[MEDIUM impact / low effort]** Check GitHub token permissions and repository access
- **[MEDIUM impact / low effort]** Check GitHub token permissions and repository access
- **[MEDIUM impact / low effort]** Add a SUPPORT.md documenting how users can get help
- **[MEDIUM impact / low effort]** Add sections like "Critical Rules", "Project Structure", "Common Tasks" to improve agent guidance.
- **[MEDIUM impact / low effort]** Create a DATASHEET.md documenting dataset motivation, composition, collection process, and intended uses.
- **[MEDIUM impact / low effort]** Add missing sections to README.md: Model Description, Intended Use, Limitations
- **[MEDIUM impact / low effort]** Remove "obvious/obviously" — if it were truly obvious, it would not need to be stated.
- **[MEDIUM impact / low effort]** Review flagged diminishing language to make documentation more welcoming to all skill levels.
- **[MEDIUM impact / low effort]** Consider using: main, primary, source, original
- **[MEDIUM impact / low effort]** Replace "master" with one of: main, primary, source, original
- **[MEDIUM impact / low effort]** Add a coverage configuration (e.g., vitest.config.ts with coverage thresholds, jest.config.js with coverageThreshold, or .nycrc) to enforce coverage minimums
- **[MEDIUM impact / low effort]** Add a CHANGELOG.md documenting changes per release (see keepachangelog.com)

## Score Rationale

Overall score is a weighted sum of six pillar scores (each scored 0–10).

| Pillar | Weight | Raw Score | Contribution |
|--------|--------|-----------|-------------|
| Security | 25% | 0.0 | 0.00 |
| Governance | 20% | 7.6 | 1.52 |
| Community | 15% | 0.0 | 0.00 |
| AI Readiness | 15% | 2.4 | 0.36 |
| Inclusive Language | 15% | 0.0 | 0.00 |
| Technical Rigor | 10% | 3.8 | 0.38 |
| **Overall** | **100%** | | **2.30** |

---
*quaid-scanner v0.1.4 | 2026-09-09T10:07:29-07:00*
*Commit: 5eebe0d96a417e3c5605a8d59eb8c683aad276ab*