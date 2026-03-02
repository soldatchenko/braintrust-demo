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
│   └── run_eval.py            # Braintrust Eval() runner
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
