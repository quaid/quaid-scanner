# Governance

This document describes how the **quaid-scanner** project is governed and how
decisions are made. It is intentionally lightweight to match the project's
current stage, and is expected to evolve as the contributor base grows.

## Current model: maintainer-led

quaid-scanner is presently maintained by a single lead maintainer,
Karsten Wade ([@quaid](https://github.com/quaid)). Day-to-day decisions —
prioritization, design, releases, and merging — rest with the lead maintainer,
who is responsible for keeping the project healthy, responsive, and aligned
with its mission: an agent-first tool for measuring open source sociotechnical
health.

This is a "benevolent maintainer" model. It is honest about where the project
is today, and it commits the maintainer to the transparency and succession
practices below so the model can scale.

## How decisions are made

- **Routine changes** (bug fixes, docs, tests, dependency bumps) are proposed
  as pull requests and merged after review and a green test/lint run.
- **Substantive changes** (new scanners, scoring changes, breaking API or CLI
  changes) start as a GitHub issue or discussion so the rationale and trade-offs
  are recorded in the open before code is written.
- **Disagreements** are resolved by seeking consensus in the issue thread. If
  consensus is not reached, the lead maintainer makes the final call and
  documents the reasoning.

All decisions of consequence happen in public on the issue tracker or in pull
requests. Private channels are not used to decide project direction.

## Contributing

Contributions are welcome from anyone. Open an issue to discuss a change, then
submit a pull request. All contributions are subject to:

- the [Code of Conduct](../CODE_OF_CONDUCT.md),
- the project's test and coverage gates (80%+ coverage; see the CI workflow),
- the [Apache-2.0 License](../LICENSE).

See [SUPPORT.md](SUPPORT.md) for how to get help and [SECURITY.md](SECURITY.md)
for reporting vulnerabilities.

## Becoming a maintainer

The project actively wants to grow beyond a single maintainer. Contributors who
demonstrate sustained, high-quality involvement — reviewed PRs, thoughtful issue
triage, and good judgment on scope — may be invited to become maintainers with
commit and release rights. Maintainer invitations are extended by the lead
maintainer and announced in the repository.

As soon as there is more than one maintainer, this document will be updated to
describe shared decision-making (e.g. lazy consensus with a defined review
window, and a tie-break process) rather than sole maintainer authority.

## Releases

Releases follow [semantic versioning](https://semver.org/). The release process
is documented in `docs/releases/` and automated via the publish workflow;
publishing to npm uses GitHub Actions OIDC trusted publishing.

## Changing this document

Changes to governance are themselves proposed as pull requests against this file
so the history of how the project is run stays auditable.
