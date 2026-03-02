# CLAUDE.md

## What This Repo Is

This repository is a hands-on RAG lab built for two intertwined purposes:

1. **Interview preparation** for a Customer Solutions Architect role at Braintrust, an AI
   observability and evaluation platform. The role involves working with sophisticated
   engineering organizations (Notion, Stripe, Zapier) on AI evaluation workflows, RAG
   pipeline optimization, and LLM performance measurement.

2. **Genuine learning** — Alex (the person you're working with) understands the architecture,
   the concepts, and the "why" deeply from study and preparation, but has not yet built a RAG
   pipeline with Braintrust in the loop hands-on. That's what this lab is for. The goal is not
   to have Claude generate everything while Alex watches — it's to build understanding through
   doing. See the **Teaching Mode** section below for how to approach this.

---

## What Alex Already Understands (Conceptual Foundation)

Alex has spent significant time studying the following. You do NOT need to over-explain these
concepts, but you SHOULD connect new hands-on steps back to them when relevant:

### RAG Architecture
- The two-phase structure: **ingestion** (chunk → embed → upsert to vector DB) and
  **query** (embed query → similarity search → assemble prompt → generate)
- That RAG has two independent failure modes: **retrieval failure** (wrong docs returned)
  and **generation failure** (hallucination despite correct context)
- The role of chunking strategy, top_k, and embedding model choice as tunable knobs
- Vector databases as specialized caches — analogous to how Terraform state tracks what
  was provisioned; the vector index is the "state" of the embedded knowledge base

### Braintrust's Role
- Braintrust sits in three places: **tracing** (every LLM call captured as a span),
  **evaluation** (offline evals via `braintrust eval` CLI against a golden dataset),
  and **observability** (online scoring of live production traffic)
- The eval loop: dataset → task function → scorers → experiment → compare → iterate
- The distinction between **deterministic scorers** (pure Python, e.g. regex checks) and
  **LLM-as-judge scorers** (e.g. Factuality, Faithfulness — a second LLM call grades the first)
- The Braintrust **AI Proxy / Gateway** auto-traces every LLM call routed through it with
  zero extra instrumentation beyond `wrap_openai`
- **Brainstore** is Braintrust's append-only time-series storage layer — its moat is the
  performance advantages of a simpler write path and better data locality vs. general-purpose DBs
- **Hybrid / on-prem deployment is Enterprise-only** — free tier uses Braintrust's cloud
  data plane and that is sufficient for this lab

### Infrastructure Mapping (Alex's Background is Deep Here)
- Terraform/Terragrunt IaC patterns → see `/cipherift-infrastructure` repo
- AWS SSO for local auth (`aws sso login`)
- Kubernetes, Helm, Vault, EKS, S3, Lambda — all in scope for phase 2
- The CI/CD eval loop: `git push` → GitHub Actions → `braintrust eval` → quality gate →
  pass/fail on PR

---

## What Is NEW (Hands-On, Learn by Doing)

These are the areas where teachable moments matter most:

- **Actually running `braintrust eval`** and reading the output
- **Building a chunker** — understanding the tradeoffs of heading-based vs token-count chunking
- **Wiring up `wrap_openai`** and seeing traces appear in the Braintrust UI in real time
- **Writing a custom scorer** — both deterministic and LLM-as-judge
- **Building a golden dataset** — what makes a good test case, what edge cases to include
- **Reading experiment diffs** in the Braintrust UI — understanding what "regression" looks like
- **Understanding embedding consistency** — why you must use the same model at ingest and query time
  (analogous to Terraform state — if you re-embed with a different model, the index is invalid)

---

## Models

| Purpose | Model | Notes |
|---|---|---|
| Generation (inference) | `gpt-4.1-mini` | Current fast/cheap OpenAI tier; replaces gpt-4o-mini |
| Embeddings | `text-embedding-3-small` | 1536 dimensions, $0.02/1M tokens, sufficient for this demo |

Do not use reasoning models (o-series) for generation — they are overkill and slow for RAG.
Do not use `text-embedding-ada-002` — it is the previous generation.

---

## RAG Corpus

The knowledge base for this lab is a **curated subset of HashiCorp Vault v1.9.x documentation**.

Source: `https://github.com/hashicorp/web-unified-docs/tree/main/content/vault/v1.9.x/content/docs`

Use the following subdirectory subset to keep costs and scope manageable:
- `auth/` — authentication methods (token, approle, aws, kubernetes)
- `secrets/` — secrets engines (kv, aws, pki, database)
- `concepts/` — core Vault concepts (seal, lease, policies, tokens)
- `configuration/` — listener, storage, telemetry config

This subject matter is intentionally chosen because Alex has deep Vault expertise from
HashiCorp — he can write high-quality eval questions and immediately recognize when the
retrieval or generation is wrong. That domain familiarity makes for better evals.

**Local corpus location:** `./corpus/` in the repo root. Raw markdown files go here in phase 1.
Do not commit embeddings or vector data — those live in Pinecone.

**Cost guardrail:** Stay well under $20 total OpenAI spend across the entire lab.
With `text-embedding-3-small` at $0.02/1M tokens and `gpt-4.1-mini` at ~$0.40/1M output tokens,
this is very achievable with the Vault doc subset above.

---

## Repository Structure

```
braintrust-demo/
├── CLAUDE.md                  # This file
├── README.md                  # Setup, usage, and architecture overview
├── DIARY.md                   # Project learnings and decision rationale
├── .env.example               # Template — never commit .env
├── .env                       # Non-sensitive config (gitignored)
├── .gitignore
├── corpus/                    # Raw Vault MDX docs (143 files, committed)
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
│   ├── run_eval.py            # Braintrust Eval() runner
│   └── gate.py                # Score threshold gate for CI/CD (fails job if scores regress)
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
PINECONE_ENVIRONMENT=...      # e.g. us-east-1-aws (serverless)

# Optional (phase 2)
AWS_PROFILE=...               # SSO profile name from ~/.aws/config
S3_CORPUS_BUCKET=...
```

---

## Build Phases

### Phase 1 — Local Workflow (COMPLETE)
Everything runs on your machine. No AWS infra required.

1. ~~Fetch and store a curated subset of Vault docs into `./corpus/`~~ — 143 MDX files, 1.3MB
2. ~~Chunk the docs and embed them into Pinecone (serverless free tier)~~ — 1,164 chunks, avg 236 tokens
3. ~~Build the RAG query function with `wrap_openai` for auto-tracing via Braintrust~~
4. ~~Build a golden dataset of 30-50 Vault Q&A pairs~~ — 46 cases across 5 categories
5. ~~Write custom scorers (AnswerCorrectness, ContextRelevance, Faithfulness, HasCitation)~~
6. ~~Run experiments with `braintrust eval`, compare results in the Braintrust UI~~
7. ~~Iterate: change top_k, prompt template, scorer prompts → new experiment → compare~~

Latest eval scores: AnswerCorrectness 96.3%, Faithfulness 100%, HasCitation 97.6%, ContextRelevance 75.8%

### Phase 2 — CI/CD Workflow (COMPLETE — GitHub Actions only, no AWS infra)
Eval quality gate runs on every PR against main. No AWS infra needed.

1. ~~Add GitHub Actions workflow: PR → `braintrust eval` → score gate → pass/fail~~
2. ~~Score threshold gate (`evals/gate.py`) — fails CI if scores regress below floor~~
3. ~~PR comment with eval results and link to Braintrust dashboard~~
4. ~~Store API keys in GitHub Secrets (OPENAI_API_KEY, PINECONE_API_KEY, BRAINTRUST_API_KEY)~~

Score thresholds: AnswerCorrectness ≥85%, Faithfulness ≥90%, HasCitation ≥85%, ContextRelevance ≥60%

### Phase 3 — AWS Infrastructure (future, optional)
Would extend Phase 2 with AWS infra from `/cipherift-infrastructure`.

1. Provision S3 bucket for corpus storage via Terragrunt
2. Migrate local `./corpus/` to S3 as the source of truth
3. (Optional) Lambda trigger: S3 event → ingest pipeline → Pinecone upsert

---

## Teaching Mode

**This is important.** Alex is building this to learn, not to watch code get generated.

### Do this:
- **Before implementing a new step**, briefly explain what it does, why it matters, and
  what the output should look like. One short paragraph is enough — don't lecture.
- **After a step produces output** (a trace in Braintrust, a score, an experiment diff),
  pause and describe what Alex should look at and what it means. Say explicitly:
  "Worth stopping here to look at X in the Braintrust UI before moving on."
- **Connect new concepts to things Alex knows**: embeddings ≈ Terraform state (must match
  between write and read), chunking strategy ≈ schema design (affects everything downstream),
  LLM-as-judge ≈ a code review bot with a rubric.
- **When writing a scorer or pipeline function**, add comments that explain the *why*,
  not just the *what*.
- **Flag decisions** — when there's a meaningful choice (chunk size, top_k, scorer threshold),
  call it out and briefly explain the tradeoff instead of just picking one silently.

### Don't do this:
- Don't generate the entire pipeline in one shot. Build it incrementally.
- Don't skip the "look at this in the Braintrust UI" moments — those are the point.
- Don't over-explain things Alex already knows (see **What Alex Already Understands** above).

---

## Key References

The `./docs/` folder contains four visual reference documents created during prep:

- **`braintrust-lab-architecture.html`** — Full lab architecture: toolchain, data flow diagram,
  free tier breakdown, 7-phase build approach, cost estimate
- **`braintrust-system-boundaries.html`** — Step-by-step system boundary diagrams showing
  which steps run locally vs. which are API calls, for both local dev and CI/CD workflows
- **`braintrust-cicd-stripe.jsx`** — Interactive explainer of how a company like Stripe would
  use Braintrust end-to-end: dev loop → CI/CD → production monitoring → feedback loop.
  Includes the hybrid infrastructure (data plane in customer VPC) view.
- **`rag-eval-explainer.jsx`** — RAG concepts, failure modes, custom scorer patterns,
  annotated code example, and a simulated pairing session walkthrough

Read these before asking Alex clarifying questions — they contain the architecture decisions
and context behind this project.

---

## Infrastructure Repo Reference

AWS infrastructure lives in a separate repo: `/cipherift-infrastructure`

- Uses **Terragrunt** wrapping Terraform modules
- Auth via **AWS SSO** — run `aws sso login --profile <profile>` before applying
- Read `CLAUDE.md` at the root of that repo before touching any infra
- Phase 2 S3 bucket and Lambda should be added there following existing patterns

Do not provision AWS resources from this repo directly.