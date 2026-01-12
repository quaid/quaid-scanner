# oss-repo-check

> Built with Semantic Seed TDD standards and AINative services

## Quick Start

```bash
# Install dependencies
npm install  # or pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev  # or python main.py
```

## Development

This project uses Test-Driven Development with AINative services integration.

### Available Commands

**ZeroDB Operations:**
- `/zerodb-vector-*` - Vector embeddings and semantic search
- `/zerodb-table-*` - NoSQL table operations
- `/zerodb-file-*` - File storage operations
- `/zerodb-memory-*` - Agent memory operations
- `/zerodb-postgres-*` - PostgreSQL database operations

**Google Analytics:**
- `/ga-*` - GA4 data queries and reporting

**Documentation:**
- See `.claude/commands/ZERODB-GUIDE.md` for full ZeroDB documentation

## Project Structure

```
src/           # Source code
tests/         # Test suites
  unit/        # Unit tests
  integration/ # Integration tests
  functional/  # E2E/API tests
docs/          # Documentation
.claude/       # Claude Code configuration
  commands/    # Slash commands (symlinked)
  skills/      # Skills (symlinked)
  rules/       # Coding standards (symlinked)
```

## Important Rules

See `.claude/rules/git-rules.md` for commit message requirements.
**No AI attribution in commits** - this is enforced.

## License

See LICENSE file for details.
