# Project Diary

---

### 2026-03-02 02:20

**Context**: CI/CD pipeline — debugging the score threshold gate in GitHub Actions

**Learning**:
Three separate issues to get the eval workflow running:

1. **GitHub Actions `permissions` is replace-all, not additive.** We added `pull-requests: write` for PR comments, which silently removed the default `contents: read` permission. Checkout failed with "Repository not found" — GitHub returns 404 instead of 403 for private repos (security through obscurity). Fix: explicitly list both `contents: read` and `pull-requests: write`.

2. **Braintrust eval output format is not documented.** The actual format is `89.33% (+01.72%) 'AnswerCorrectness' score (3 improvements, 2 regressions)` — percentage before the quoted name, with the word "score" distinguishing scorers from metrics (tok, s, $). Took 3 iterations to get the regex right. The debug dump approach (print what you're actually parsing) was essential.

3. **The experiment URL is in the CLI output** — `See results for ... at https://...`. No need to hardcode dashboard links. Parse it from eval output.

**Implication**:
For CI/CD eval pipelines: (1) always test the gate locally with the actual CLI output format before deploying, (2) add a debug step that dumps raw output — you'll need it, (3) GitHub's `permissions` block is a common footgun for private repos.

---

### 2026-03-02 01:30

**Context**: Testing prompt conciseness + reduced top_k via the CI/CD eval pipeline

**Learning**:
Added "be concise" to the system prompt and reduced top_k from 7 to 5. Hypothesis was that shorter, tighter answers would score better. Results: AnswerCorrectness dropped from 96.3% to 90.9%, Faithfulness dropped from 100% to 97.7%. The conciseness instruction caused the model to omit relevant details that the scorer expected. Fewer chunks didn't improve ContextRelevance either (75.1% vs 75.8%).

**Implication**:
"Be concise" is not free — it trades completeness for brevity. For RAG pipelines where the eval measures factual coverage against expected answers, verbosity is actually a feature. The right prompt instruction is "be thorough but focused" not "be concise." This is the kind of insight you only get from running the eval, not from intuition.

---

### 2026-03-01 16:30

**Context**: Building the RAG pipeline end-to-end — chunker, embeddings, Pinecone, pipeline, scorers, evals

**Learning**:
The first eval run showed Faithfulness at 100% but Factuality at 59%. Initial instinct was "the pipeline is broken." But the real issue was the *scorer* — autoevals Factuality does near-exact string matching and penalizes verbose-but-correct answers. Replacing it with a custom AnswerCorrectness scorer (LLM-as-judge with explicit "verbose correct = correct" instructions) jumped the score to 96%. The pipeline was fine; we were measuring wrong.

**Implication**:
When scores look bad, investigate the scorer before the pipeline. Bad scorers make good pipelines look bad. This is the same pattern as a flaky test suite — you lose trust in the signal. For customers: always sanity-check a handful of low-scoring results manually before assuming the pipeline needs work.

---

### 2026-03-01 15:30

**Context**: Building the heading-based chunker with breadcrumb prefixes

**Learning**:
The naive heading-based chunker had two bugs: (1) regex `^(##)` also matches `###` — needs negative lookahead `(?!#)`, and (2) token-count splitting with overlap can infinite-loop when paragraph-boundary adjustment pushes the end position backward, making `end - overlap <= start`. First run produced 6,661 chunks (avg 62 tokens) instead of the expected ~1,000. After fixing both bugs and adding a merge pass for small chunks, got 1,164 chunks at avg 236 tokens — much healthier distribution.

**Implication**:
Chunker bugs are insidious because they don't throw errors — they produce subtly wrong output that degrades retrieval quality. Always inspect the distribution (token histogram, tiny chunk count) before embedding. The merge pass for small chunks is essential for heading-based chunking of docs with short sections.

---

### 2026-03-01 15:00

**Context**: First exposure to Braintrust tracing in the UI

**Learning**:
`wrap_openai` + `@traced` decorators produce nested spans automatically, but you need `braintrust.init_logger(project=...)` for the traces to actually land in the UI. Without it, the decorators silently no-op. Similarly, the golden dataset doesn't appear in the Datasets tab until you explicitly upload it with `braintrust.init_dataset()` — the `Eval()` function creates it inline within the experiment but doesn't persist it as a standalone dataset.

**Implication**:
Two common "where are my traces/datasets?" gotchas to remember for customer onboarding: (1) init_logger must be called with the project name, (2) datasets need explicit upload for the "Add to dataset" production feedback loop to work.

---

### 2026-03-01 14:45

**Context**: Choosing Pinecone index parameters (dimension, metric)

**Learning**:
Dimension is locked to the embedding model (1536 for text-embedding-3-small) — not a design choice. Metric is the real choice: cosine for text similarity (direction-only, works even with non-normalized embeddings), dotproduct for pre-normalized vectors (mathematically identical to cosine when normalized), euclidean for spatial distance (wrong for text). OpenAI embeddings are already normalized, so cosine and dotproduct give identical rankings, but cosine is the safer default for portability.

**Implication**:
If a customer changes embedding models, they must rebuild the entire index. This is the "Terraform state" analogy — the index dimension is locked to the model version. Worth flagging during customer onboarding.

---
