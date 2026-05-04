# AINative OSS Scan Queue

Sorted by **readiness × strategic impact** — live and most infrastructure-critical first.
Scans run with `quaid-scanner --depth quick` unless noted.

Repo names verified against `gh api orgs/AINative-Studio/repos --paginate` on 2026-05-04.

---

## Live — Infrastructure & MCP

| # | Repo | Language | Description | Scan |
|---|------|----------|-------------|------|
| 1 | `AINative-Studio/ainative-zerodb-mcp-server` | JavaScript | MCP server for ZeroDB — vectors, NoSQL, files, memory, PostgreSQL | ✅ |
| 2 | `AINative-Studio/ainative-zerodb-memory-mcp` | JavaScript | Lightweight memory MCP for semantic recall & embeddings | ⏳ |
| 3 | `AINative-Studio/ainative-strapi-mcp-server` | JavaScript | MCP server for Strapi CMS — CRUD, media, content types | ⏳ |
| 4 | `AINative-Studio/agentic-rules` | Shell | Curated rule sets for Claude Code, Cursor, Windsurf, and other agent IDEs | ⏳ |
| 5 | `AINative-Studio/shadcn-ui-mcp-server` | — | MCP server for shadcn/ui component context | ⏳ |
| 6 | `AINative-Studio/mcp-l-core` | JavaScript | Listening Protocol for AI-Native IDEs | ⏳ |

## Live — SDKs & Database

| # | Repo | Language | Description | Scan |
|---|------|----------|-------------|------|
| 7 | `AINative-Studio/zerodb-typescript-sdk` | TypeScript | Official TypeScript/JavaScript SDK for ZeroDB | ⏳ |
| 8 | `AINative-Studio/zerodb-python-sdk` | Python | Official Python SDK for ZeroDB | ⏳ |
| 9 | `AINative-Studio/zerodb-supabase-adapter` | TypeScript | Drop-in Supabase pgvector replacement | ⏳ |
| 10 | `AINative-Studio/zerodb-vercel-integration` | TypeScript | One-click Vercel integration for ZeroDB | ⏳ |
| 11 | `AINative-Studio/crewai-zerodb` | Python | ZeroDB integration for CrewAI | ⏳ |
| 12 | `AINative-Studio/zerodb-local` | Python | Self-hosted ZeroDB runtime (local, no server) | ⏳ |
| 13 | `AINative-Studio/zerodb-cli` | Python | CLI for managing local ZeroDB | ⏳ |
| 14 | `AINative-Studio/zerodb-nextjs-template` | TypeScript | Next.js 14 App Router starter with ZeroDB search, AI chat memory | ⏳ |
| 15 | `AINative-Studio/zerodb-claude-plugin` | Python | Persistent cross-session memory for Claude Code | ⏳ |

## Live — AI Kit & UI

| # | Repo | Language | Description | Scan |
|---|------|----------|-------------|------|
| 16 | `AINative-Studio/ai-kit` | TypeScript | The Stripe for LLM Applications — framework-agnostic SDK | ⏳ |
| 17 | `AINative-Studio/ai-kit-a2ui` | TypeScript | A2UI renderer for React + ShadCN | ⏳ |
| 18 | `AINative-Studio/ai-kit-showcase` | TypeScript | Interactive demo site for AI Kit | ⏳ |
| 19 | `AINative-Studio/ainative-sdks` | TypeScript | Official SDKs for AINative Studio API — React, Next.js | ⏳ |

## Live — Agents & Apps

| # | Repo | Language | Description | Scan |
|---|------|----------|-------------|------|
| 20 | `AINative-Studio/Agent-402` | Python | Autonomous fintech agent crew (CrewAI) | ⏳ |
| 21 | `AINative-Studio/ragbot-starter` | TypeScript | Production-ready RAG chatbot with ZeroDB | ⏳ |
| 22 | `AINative-Studio/cody-sdk-typescript` | TypeScript | Cody SDK — TypeScript SDK supporting AINative Studio | ⏳ |
| 23 | `AINative-Studio/builder-ainative-studio` | TypeScript | AI-powered React component builder using Anthropic Claude | ⏳ |

## Live — IDE Integrations

| # | Repo | Language | Description | Scan |
|---|------|----------|-------------|------|
| 24 | `AINative-Studio/AINativeStudio-IDE` | TypeScript | Open-source AI-native code editor | ⏳ |
| 25 | `AINative-Studio/ainative-code` | Go | AI-native development CLI — unified LLM interface | ⏳ |
| 26 | `AINative-Studio/ainative-jetbrains` | — | JetBrains/IntelliJ plugin for AINative | ⏳ |
| 27 | `AINative-Studio/ainative-neovim` | — | Neovim plugin for AINative completions | ⏳ |

---

## Scan Results

> **Known scanner limitations** (open issues):
> - [#62](https://github.com/quaid/quaid-scanner/issues/62) ~~Severity serialized as integer~~ — **fixed in #66**
> - [#61](https://github.com/quaid/quaid-scanner/issues/61) ~~GITHUB_TOKEN not falling back to GITHUB_PERSONAL_ACCESS_TOKEN~~ — **fixed in #65**
> - [#63](https://github.com/quaid/quaid-scanner/issues/63) ~~Inclusive scanner running against local dir~~ — **fixed in #64**

| Repo | Score | Risk | Maturity | Security | Governance | Community | AI Ready | Inclusive | Technical | Notes |
|------|-------|------|----------|----------|------------|-----------|----------|-----------|-----------|-------|
| `ainative-zerodb-mcp-server` | 1.6 | CRITICAL | sandbox | 0 | 0 | 0 | 7.5 | 0† | 5 | †Inclusive=0 due to 31 INFO findings (undefined acronyms, assumed-knowledge) — zero CRITICAL/WARNING inclusive issues, welcoming score 100/100. Security=0: no OpenSSF scorecard. Governance=0: CRITICAL vendor neutrality (single-vendor signals), no license headers. Community=0: thin contributor data, no support channels. Good AI readiness. Dep pinning warnings (13). |
