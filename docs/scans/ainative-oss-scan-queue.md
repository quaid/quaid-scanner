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

All 27 repos scanned 2026-05-04 with `--depth quick`. Common patterns: community=0 across the board (all single-vendor, thin contributor history), ai_readiness uniformly strong (7–8), security=0 on most (no OpenSSF scorecard, unpinned deps).

| Repo | Score | Risk | sec | gov | com | ai | inc | tec | Notes |
|------|-------|------|-----|-----|-----|----|-----|-----|-------|
| `ainative-zerodb-mcp-server` | 1.6 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | 5 | Vendor neutrality CRITICAL. Inclusive=0 from 31 INFO (acronyms, assumed-knowledge); welcoming 100/100. |
| `ainative-zerodb-memory-mcp` | 1.8 | CRITICAL | 0 | 1 | 0 | 7.5 | 0.5 | 4 | 0% issue closure rate. 19 warnings. |
| `ainative-strapi-mcp-server` | 3.5 | CRITICAL | 3.5 | 1 | 0 | 7.5 | 6 | 4 | Best of MCP group. No tests. |
| `agentic-rules` | 3.0 | CRITICAL | 6 | 1 | 0 | 6.5 | 0 | 3 | Good security. No tests (shell rules repo — expected). |
| `shadcn-ui-mcp-server` | 1.6 | CRITICAL | 0 | 1 | 0 | 7.5 | 0 | 3 | GitHub Actions token permission CRITICALs. |
| `mcp-l-core` | 2.2 | CRITICAL | 0 | 1 | 0 | 7.5 | 1.5 | 6.5 | Best technical score in MCP group. |
| `zerodb-typescript-sdk` | 2.0 | CRITICAL | 0 | 1 | 0 | 7.5 | 0.5 | 6 | |
| `zerodb-python-sdk` | 2.3 | CRITICAL | 2 | 1 | 0 | 7.5 | 0 | 5 | |
| `zerodb-supabase-adapter` | 3.0 | CRITICAL | 0 | 0 | 0 | 7.5 | **8** | 6.5 | Best inclusive score in SDK group. |
| `zerodb-vercel-integration` | 2.4 | CRITICAL | 0 | 0 | 0 | 7.5 | 5 | 5.5 | |
| `crewai-zerodb` | **4.0** | HIGH | 6 | 1 | 0 | 7.5 | 6 | 3 | **Highest score overall.** Only HIGH (not CRITICAL) risk. |
| `zerodb-local` | 1.4 | CRITICAL | 0 | 1 | 0 | 4.5 | 0 | 5 | Lowest AI readiness — may lack AI signals in repo. |
| `zerodb-cli` | 2.2 | CRITICAL | 0 | 1 | 0 | 7.5 | 3 | 4 | |
| `zerodb-nextjs-template` | 2.3 | CRITICAL | 0 | 0 | 0 | 7.5 | 5.5 | 3 | |
| `zerodb-claude-plugin` | 1.9 | CRITICAL | 0 | 0 | 0 | 7.5 | 2.5 | 4 | |
| `ai-kit` | 1.9 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | **8** | **Best technical score overall.** |
| `ai-kit-a2ui` | 2.0 | CRITICAL | 0 | 1 | 0 | **8** | 0 | 6 | Highest AI readiness. |
| `ai-kit-showcase` | 2.4 | CRITICAL | 0 | 0 | 0 | 7.5 | 6.5 | 3 | |
| `ainative-sdks` | 3.7 | CRITICAL | 3 | 0 | 0 | 7.5 | **10** | 3 | **Perfect inclusive score.** Second overall. |
| `Agent-402` | 2.4 | CRITICAL | 6 | 0 | 0 | 3.5 | 0 | 4 | Good security. Low AI readiness (agent repo, unusual). |
| `ragbot-starter` | 1.7 | CRITICAL | 0 | 0 | 0 | **8** | 0 | 5 | |
| `cody-sdk-typescript` | 2.0 | CRITICAL | 0 | 1 | 0 | 7.5 | 0 | 6.5 | |
| `builder-ainative-studio` | 1.6 | CRITICAL | 0 | 0 | 0 | 7.5 | 0 | 5 | |
| `AINativeStudio-IDE` | 1.5 | CRITICAL | 0 | 1 | 0 | 6.5 | 0 | 3 | Lowest score overall. |
| `ainative-code` | 1.6 | CRITICAL | 0 | 0.5 | 0 | 5 | 0 | 7 | Go — good technical, low AI signals. |
| `ainative-jetbrains` | 3.6 | CRITICAL | 3 | 0 | 0 | 7.5 | 9.5 | 3 | Strong inclusive. Likely stub/placeholder repo. |
| `ainative-neovim` | 3.6 | CRITICAL | 3 | 0 | 0 | 7.5 | 9.5 | 3 | Strong inclusive. Likely stub/placeholder repo. |
