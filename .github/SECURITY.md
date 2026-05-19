# Security Policy

## Supported Versions

Only the latest release published to npm is supported with security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.1 (latest) | Yes |
| < 0.1.1 | No |

Upgrade to the latest release before reporting a vulnerability.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities using GitHub Security Advisories:

https://github.com/quaid/quaid-scanner/security/advisories/new

You will need a GitHub account. The advisory form lets you describe the vulnerability privately before any public disclosure.

### What to Include

A useful report includes:

- **Version affected** — output of `quaid-scanner --version`
- **Steps to reproduce** — the exact commands or inputs that trigger the issue
- **Impact** — what an attacker could do, and under what conditions
- **Suggested fix** — optional, but appreciated if you have one

The more detail you provide, the faster we can respond.

## Response Timeline

- **Triage**: within 7 days of receiving the report
- **Fix or mitigation**: within 30 days of triage

If the timeline cannot be met, we will communicate that in the advisory thread.

## Out of Scope

The following are not treated as security vulnerabilities in this project:

- **Theoretical vulnerabilities** without a working proof of concept
- **Vulnerabilities in dependencies** — report those to the upstream project directly; we will update our dependencies when fixes are available
- **Scanner false positives** — quaid-scanner producing an incorrect finding is a bug, not a security issue; open a [false positive issue](https://github.com/quaid/quaid-scanner/issues/new?template=false_positive.yml) instead

## Disclosure Policy

We follow coordinated disclosure. Once a fix is released, we will publish the advisory publicly and credit the reporter (unless you prefer to remain anonymous).
