# quaid-scanner - Project Memory

> Last Updated: 2026-04-24
> Project Root: /Users/karstenwade/Projects/quaid-scanner

## Critical Rules

### 1. Git Commits
- Zero tolerance for AI attribution
- No "Claude", "Anthropic", "Generated with", "Co-Authored-By" in commits
- commit-msg hook enforces this

### 2. File Placement
- Docs → `docs/{category}/`
- No root `.md` files (except README.md and CLAUDE.md)

### 3. Testing (MANDATORY)
- 80%+ coverage required
- All features tested
- TDD approach preferred
- `npm test` runs vitest

### 4. Code Quality
- TypeScript strict mode, type hints on all functions
- Docstrings for public methods
- Clean, readable code

## Project Overview

Agent-first OSS repository health scanner based on:
- CHAOSS metrics
- The Open Source Way 2.0
- Inclusive Naming Initiative

TypeScript CLI and library. Publishes to npm as `quaid-scanner`.

## Project Structure

```
quaid-scanner/
├── CLAUDE.md              # This file (project-specific context)
├── .claude -> core/.claude  # Symlink — shared commands/skills/rules
├── .ainative -> core/.ainative  # Symlink — universal AI coding rules
├── .env                   # Local secrets (gitignored)
├── src/
│   ├── cli.ts             # CLI entrypoint
│   ├── config.ts
│   ├── index.ts           # Library entrypoint
│   ├── scanner/           # Scanner implementations
│   └── types/
├── tests/
│   ├── cli/
│   ├── scanner/
│   └── setup/
└── docs/                  # Documentation
```

## Available Commands

### ZeroDB Operations
- `/zerodb-vector-*` - Vector embeddings and semantic search
- `/zerodb-table-*` - NoSQL table operations
- `/zerodb-file-*` - File storage operations
- `/zerodb-memory-*` - Agent memory operations
- `/zerodb-postgres-*` - PostgreSQL database operations

### Workflow
- `/git-workflow` - Commit/PR standards
- `/mandatory-tdd` - TDD enforcement
- `/delivery-checklist` - Pre-delivery checks

## Environment Variables

Key variables in `.env`:
- `ZERODB_PROJECT_ID` / `ZERODB_API_KEY` / `ZERODB_API_URL` — ZeroDB (zerolocal at localhost:8100)
- `AINATIVE_API_KEY` / `AINATIVE_API_URL` — AINative API
- `GITHUB_PERSONAL_ACCESS_TOKEN` — required for scanning repos

## Common Tasks

### Add New Scanner
1. Write tests first (TDD)
2. Implement scanner in `src/scanner/`
3. Ensure `npm run test:coverage` passes at 80%+
4. Commit (NO AI ATTRIBUTION)

### Run Tests
```bash
npm test                 # watch mode
npm run test:coverage    # coverage report
```

### Build
```bash
npm run build            # tsc
```

## Final Reminder
1. No "Claude"/"Anthropic" in commits
2. No AI attribution — ever
3. Tests before committing
