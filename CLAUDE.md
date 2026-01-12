# oss-repo-check - Project Memory

> Last Updated: 2026-01-12
> Project Root: /home/quaid/Documents/Projects/ainative-studio/src/oss-repo-check

## Critical Rules

### 1. Git Commits
- Zero tolerance for AI attribution
- No "Claude", "Anthropic", "Generated with", "Co-Authored-By" in commits
- Hook blocks forbidden text

### 2. File Placement
- Docs → `docs/{category}/`
- No root `.md` files (except README.md)

### 3. Testing (MANDATORY)
- 80%+ coverage required
- All features tested
- TDD approach preferred

### 4. Code Quality
- Type hints all functions
- Docstrings for public methods
- Clean, readable code

## Project Structure

```
oss-repo-check/
├── CLAUDE.md              # This file (project-specific)
├── .claude/
│   ├── commands/          # Symlinks to devcontext commands
│   ├── skills/            # Symlinks to core skills
│   └── rules/             # Symlinks to devcontext rules
├── src/                   # Source code
├── tests/                 # Test suites
└── docs/                  # Documentation
```

## Available Commands

### ZeroDB Operations
- `/zerodb-vector-*` - Vector embeddings and semantic search
- `/zerodb-table-*` - NoSQL table operations
- `/zerodb-file-*` - File storage operations
- `/zerodb-memory-*` - Agent memory operations
- `/zerodb-postgres-*` - PostgreSQL database operations

### Google Analytics
- `/ga-*` - GA4 data queries and reporting

## Environment Variables

Key variables configured in `.env`:
- AI Provider Keys (OpenAI, Anthropic, Gemini, Cohere, Mistral, Meta)
- GitHub Token
- AWS Credentials
- Database URLs (PostgreSQL, Redis)
- ZeroDB S3 Configuration

## Common Tasks

### Add New Feature
1. Create tests first (TDD)
2. Implement feature
3. Ensure tests pass
4. Commit (NO AI ATTRIBUTION)

### Run Tests
```bash
# Add appropriate test command for your language/framework
npm test  # or pytest, cargo test, etc.
```

## Final Reminder
1. No "Claude"/"Anthropic"
2. No AI attribution in commits
3. Tests executed before committing
