# CLAUDE.md

## What This Repo Is

A complete RAG (Retrieval-Augmented Generation) pipeline with end-to-end evaluation and
CI/CD quality gates powered by [Braintrust](https://www.braintrust.dev). Built on
HashiCorp Vault v1.9.x documentation as the knowledge base.

Demonstrates the full lifecycle: **ingest → chunk → embed → retrieve → generate →
evaluate → iterate → gate PRs**. Designed to be forked, explored, and learned from.

---

## Models

| Purpose | Model | Notes |
|---|---|---|
| Generation | `gpt-4.1-mini` | Fast/cheap OpenAI tier |
| Embeddings | `text-embedding-3-small` | 1536 dimensions, $0.02/1M tokens |
| Scorer judge | `gpt-4.1-mini` | Same model, separate unwrapped client in `scorers.py` |

Do not use reasoning models (o-series) for generation — overkill for grounded RAG.
Do not use `text-embedding-ada-002` — previous generation.

---

## RAG Corpus

**Subject**: Curated subset of HashiCorp Vault v1.9.x documentation.

Source: `https://github.com/hashicorp/web-unified-docs/tree/main/content/vault/v1.9.x/content/docs`

Subdirectories: `auth/`, `secrets/`, `concepts/`, `configuration/` + 5 top-level files.

**Location**: `./corpus/` — 143 MDX files, 1.3MB, committed to the repo.
Do not commit embeddings or vector data — those live in Pinecone.

**Cost guardrail**: Stay under $20 total OpenAI spend. A full eval run costs ~$0.10-0.15.

---

## Repository Structure

```
braintrust-demo/
├── CLAUDE.md                  # This file — AI context and project conventions
├── README.md                  # Public-facing setup, usage, architecture (Mermaid diagrams)
├── DIARY.md                   # Project learnings and decision rationale
├── LICENSE                    # MIT
├── .env.example               # Template — never commit .env
├── .env                       # Non-sensitive config (gitignored)
├── .gitignore
├── corpus/                    # Vault v1.9.x MDX docs (143 files, committed)
│   ├── auth/                  # 21 files — approle, kubernetes, token, etc.
│   ├── secrets/               # 51 files — kv, pki, aws, transit, etc.
│   ├── concepts/              # 23 files — seal, tokens, policies, leases
│   ├── configuration/         # 43 files — listener, storage, seals
│   └── *.mdx                  # 5 top-level files — what-is-vault, install, etc.
├── docs/                      # Reference architecture docs (HTML/JSX visuals)
│   ├── braintrust-lab-architecture.html
│   ├── braintrust-system-boundaries.html
│   ├── braintrust-cicd-stripe.jsx
│   └── rag-eval-explainer.jsx
├── ingestion/
│   ├── chunk.py               # Heading-based chunker with breadcrumb prefixes + merge pass
│   └── embed_and_upsert.py    # Embeds chunks and upserts to Pinecone
├── rag/
│   ├── pipeline.py            # Core RAG: embed → retrieve → generate (with wrap_openai tracing)
│   └── prompts.py             # System prompt templates (cheap to iterate on)
├── evals/
│   ├── dataset.json           # Golden Q&A pairs (46 cases, also uploaded to Braintrust)
│   ├── scorers.py             # Custom scorers: AnswerCorrectness, ContextRelevance, Faithfulness, HasCitation
│   ├── run_eval.py            # Braintrust Eval() runner (supports EXPERIMENT_NAME env var)
│   ├── generate_traces.py     # Bulk trace generator — loops dataset questions through the pipeline
│   └── gate.py                # Score threshold gate for CI/CD (parses eval output, enforces minimums)
├── .github/
│   └── workflows/
│       └── eval.yml           # CI/CD eval pipeline — runs on PRs against main
└── requirements.txt           # Pinned Python dependencies
```

---

## Environment Variables

```bash
OPENAI_API_KEY=...
PINECONE_API_KEY=...
BRAINTRUST_API_KEY=...

# Pinecone config
PINECONE_INDEX_NAME=vault-rag-demo
PINECONE_ENVIRONMENT=us-east-1

# Braintrust config
BRAINTRUST_PROJECT=vault-rag-demo

# Optional — name experiments instead of getting auto-generated IDs
EXPERIMENT_NAME=my-experiment-name
```

For CI/CD, the three API keys are stored as GitHub Secrets. Non-sensitive config
(`PINECONE_INDEX_NAME`, `BRAINTRUST_PROJECT`) is hardcoded in the workflow YAML.

---

## Key Conventions

### Chunking
- Heading-based at `##` level with `###` fallback, then token-count splitting
- Breadcrumb prefixes on every chunk (e.g., "AppRole Auth > Authentication > Via the CLI")
- Merge pass for small chunks (< 50 tokens) to avoid fragment noise
- Constants: `MAX_CHUNK_TOKENS=500`, `MIN_CHUNK_TOKENS=50`, `OVERLAP_TOKENS=50`

### Embeddings & Pinecone
- Dimension (1536) is locked to the embedding model — changing models requires re-embedding
  and recreating the index. Think of it like Terraform state: the index is only valid for
  the model that created it.
- Cosine metric (direction-based similarity)
- Deterministic vector IDs via SHA256 hash for idempotent upserts

### Scorers
- 3 LLM-as-judge scorers + 1 deterministic scorer
- Judge calls use a **separate unwrapped OpenAI client** (not traced via Braintrust) —
  scorer overhead shouldn't pollute pipeline traces
- All scorers use keyword-only arguments: `(*, output, expected, input, **kwargs)`

### CI/CD
- Eval runs on every PR against `main`
- Score thresholds: AnswerCorrectness ≥85%, Faithfulness ≥90%, HasCitation ≥85%, ContextRelevance ≥60%
- `gate.py` parses braintrust eval CLI output format:
  `89.33% (+01.72%) 'AnswerCorrectness' score (3 improvements, 2 regressions)`
- Experiment URL is parsed from eval output (not hardcoded) for PR comments
- `concurrency` block cancels in-flight runs on re-push to save API costs

---

## Known Gotchas

Lessons learned during development — check these first when debugging:

| Issue | Root cause | Fix |
|---|---|---|
| No traces in Braintrust | Missing `init_logger(project=...)` | Must be called before any `@traced` functions |
| Experiments have random names | `EXPERIMENT_NAME` not set | Set `EXPERIMENT_NAME` env var before running `braintrust eval` |
| Topics says "0 traces" | Experiments ≠ traces | Run `python generate_traces.py` to populate Logs tab (Topics needs 200+) |
| Dataset not in Braintrust Datasets tab | `Eval()` doesn't persist standalone datasets | Use `braintrust.init_dataset()` to upload explicitly |
| Chunker produces thousands of tiny chunks | Heading regex matches too broadly | Use negative lookahead `(?!#)` for `##` vs `###` |
| Token splitting infinite loop | Paragraph-boundary adjustment pushes end backward | Enforce minimum step of `max_tokens // 2` |
| Factuality scorer too strict | autoevals Factuality does near-exact matching | Use custom LLM-as-judge with "verbose correct = correct" |
| CI checkout fails "Repository not found" | `permissions` block replaces all defaults | Must include `contents: read` alongside `pull-requests: write` |
| Gate shows all scores MISSING | Regex doesn't match braintrust output format | See format above in CI/CD conventions |
| "Be concise" prompt hurts scores | Conciseness trades completeness for brevity | Use "be thorough but focused" instead |

---

## Working on This Repo

This project is designed for learning. When making changes:

- **Explain before implementing** — briefly describe what a change does, why it matters,
  and what the output should look like.
- **Pause after output** — when a step produces a trace, score, or experiment diff, describe
  what to look at in the Braintrust UI and what it means.
- **Connect concepts** — embeddings ≈ Terraform state (must match between write and read),
  chunking ≈ schema design (affects everything downstream), LLM-as-judge ≈ a code review
  bot with a rubric.
- **Flag decisions** — when there's a meaningful choice (chunk size, top_k, scorer threshold),
  explain the tradeoff instead of picking silently.
- **Build incrementally** — don't generate the entire pipeline in one shot.
- **Don't skip the UI moments** — seeing traces and experiment diffs in Braintrust is the point.

---

## Reference Docs

The `./docs/` folder contains visual reference documents:

- **`braintrust-lab-architecture.html`** — Full lab architecture, data flow, cost estimate
- **`braintrust-system-boundaries.html`** — System boundary diagrams (local vs. API calls)
- **`braintrust-cicd-stripe.jsx`** — How a company like Stripe would use Braintrust end-to-end
- **`rag-eval-explainer.jsx`** — RAG concepts, failure modes, scorer patterns
