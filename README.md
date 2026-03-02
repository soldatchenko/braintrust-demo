# Vault RAG Demo with Braintrust Evaluation

A RAG (Retrieval-Augmented Generation) pipeline built on HashiCorp Vault v1.9.x documentation, with end-to-end evaluation powered by [Braintrust](https://www.braintrust.dev).

## What This Does

1. **Ingests** Vault documentation — chunks MDX files using heading-based splitting with breadcrumb prefixes
2. **Embeds** chunks into Pinecone using OpenAI `text-embedding-3-small`
3. **Answers questions** about Vault by retrieving relevant chunks and generating responses via `gpt-4.1-mini`
4. **Evaluates** answer quality using Braintrust with custom scorers (AnswerCorrectness, ContextRelevance, Faithfulness, HasCitation)

## Prerequisites

- Python 3.12+ (tested on 3.14)
- API keys for: OpenAI, Pinecone, Braintrust

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with non-sensitive config (index name, etc.)
# Set sensitive keys in your shell:
export OPENAI_API_KEY=sk-...
export PINECONE_API_KEY=pcsk_...
export BRAINTRUST_API_KEY=sk-...
```

## Usage

### 1. Ingest corpus into Pinecone

```bash
# Chunk and embed all docs (creates Pinecone index if needed)
PINECONE_INDEX_NAME=vault-rag-demo python ingestion/embed_and_upsert.py --corpus ./corpus

# To re-embed from scratch:
PINECONE_INDEX_NAME=vault-rag-demo python ingestion/embed_and_upsert.py --corpus ./corpus --clear
```

### 2. Ask questions (interactive)

```bash
PINECONE_INDEX_NAME=vault-rag-demo python -m rag.pipeline "How does AppRole authentication work?"
```

### 3. Run evaluations

```bash
PINECONE_INDEX_NAME=vault-rag-demo braintrust eval evals/run_eval.py
```

Results appear in the [Braintrust dashboard](https://www.braintrust.dev) under the `vault-rag-demo` project.

## Project Structure

```
braintrust-demo/
├── corpus/                    # Vault v1.9.x MDX docs (fetched, not committed)
│   ├── auth/                  # Auth methods (approle, kubernetes, token, etc.)
│   ├── secrets/               # Secrets engines (kv, pki, aws, transit, etc.)
│   ├── concepts/              # Core concepts (seal, tokens, policies, leases)
│   └── configuration/         # Server config (listener, storage, seals)
├── ingestion/
│   ├── chunk.py               # Heading-based chunker with breadcrumb prefixes
│   └── embed_and_upsert.py    # Embeds chunks → upserts to Pinecone
├── rag/
│   ├── pipeline.py            # Core RAG: embed query → retrieve → generate
│   └── prompts.py             # System prompt templates (cheap to iterate on)
├── evals/
│   ├── dataset.json           # Golden eval dataset (46 Q&A pairs)
│   ├── scorers.py             # Custom scorers (AnswerCorrectness, ContextRelevance, etc.)
│   ├── run_eval.py            # Braintrust Eval() runner
│   └── gate.py                # Score threshold gate for CI/CD
├── .github/
│   └── workflows/
│       └── eval.yml           # CI/CD eval pipeline (runs on PRs)
├── docs/                      # Reference architecture diagrams (HTML/JSX)
├── .env.example               # All required environment variables
├── requirements.txt           # Pinned Python dependencies
└── CLAUDE.md                  # Full project context
```

## Evaluation Scores (latest)

| Scorer | Score | What it measures |
|---|---|---|
| AnswerCorrectness | 96.3% | Is the answer factually correct vs. expected? |
| Faithfulness | 100% | Does the answer only use info from retrieved context? |
| HasCitation | 97.6% | Does the answer reference source documents? |
| ContextRelevance | 75.8% | Did retrieval find the right chunks? |

## Key Design Decisions

- **Chunking**: Heading-based at `##` level, fallback to `###`, then token-count. Breadcrumb prefixes on every chunk for context preservation.
- **Embedding model**: `text-embedding-3-small` (1536 dimensions). Index dimension is locked to this — changing models requires re-embedding.
- **Similarity metric**: Cosine (direction-based, safe default for text).
- **top_k**: 7 chunks retrieved per query.
- **Scorers**: Custom LLM-as-judge scorers rather than autoevals built-ins, for better handling of verbose-but-correct answers and multi-chunk synthesis.

## CI/CD Eval Pipeline

Every PR against `main` automatically runs the full eval suite via GitHub Actions.

### How it works

1. PR opened/updated → GitHub Actions triggers `braintrust eval`
2. Eval runs the full RAG pipeline against the 46-case golden dataset
3. Braintrust records the experiment (visible in the dashboard)
4. `evals/gate.py` checks scores against minimum thresholds
5. Results are posted as a PR comment with pass/fail status
6. If any score is below threshold, the PR is blocked

### Score thresholds

| Scorer | Minimum | Current |
|---|---|---|
| AnswerCorrectness | 85% | 96.3% |
| Faithfulness | 90% | 100% |
| HasCitation | 85% | 97.6% |
| ContextRelevance | 60% | 75.8% |

### Setup: GitHub Secrets

Add these in **Repo → Settings → Secrets and variables → Actions**:

- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `BRAINTRUST_API_KEY`

### Cost per run

Each eval run costs ~$0.10-0.15 (46 test cases × embedding + generation + 3 scorer LLM calls).
The workflow uses `concurrency` to cancel in-flight runs on re-push, saving costs.
