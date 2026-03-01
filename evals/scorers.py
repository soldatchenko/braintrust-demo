"""
Custom scorers for evaluating the Vault RAG pipeline.

Braintrust scorers are functions that take the pipeline's output and return
a Score(name, score) where score is 0-1. They receive these arguments:
  - output:   what the task function returned (our rag_query result dict)
  - expected: the ground truth from the dataset
  - input:    the original question
  - metadata: any extra fields from the dataset row

We have four scorers targeting different failure modes:

  Factuality     (built-in)       - Is the answer correct vs. expected?
  ContextRelevance (LLM-as-judge) - Did retrieval find the right chunks?
  Faithfulness   (LLM-as-judge)   - Does the answer only use info from the retrieved chunks?
  HasCitation    (deterministic)   - Does the answer reference source documents?
"""

import openai
from braintrust import Score

# Separate client for scorer LLM calls — not wrapped with Braintrust tracing
# because scorer calls are overhead, not part of the pipeline being evaluated.
_judge_client = openai.OpenAI()
_JUDGE_MODEL = "gpt-4.1-mini"


# --- LLM-as-Judge: Context Relevance ---

_CONTEXT_RELEVANCE_PROMPT = """You are evaluating the relevance of retrieved document chunks to a user's question.

Question: {question}

Retrieved chunks:
{chunks}

For each chunk, assess whether it contains information relevant to answering the question.
Then give an overall relevance score from 0 to 1:
  0.0 = none of the chunks are relevant
  0.5 = some chunks are relevant but key information is missing
  1.0 = the chunks contain all the information needed to answer the question

Respond with ONLY a JSON object: {{"score": <number>, "reasoning": "<brief explanation>"}}"""


def context_relevance(*, output, expected, input, **kwargs) -> Score:
    """
    Evaluate whether the retrieved chunks are relevant to the question.
    A low score here means the problem is in retrieval (embeddings, chunking,
    or corpus coverage), not in generation.
    """
    chunks = output.get("chunks", [])
    if not chunks:
        return Score(name="ContextRelevance", score=0, metadata={"reasoning": "No chunks retrieved"})

    chunks_text = "\n\n---\n\n".join(
        f"[Chunk {i+1}: {c.get('heading_path', 'unknown')}]\n{c.get('text', '')[:500]}"
        for i, c in enumerate(chunks)
    )

    response = _judge_client.chat.completions.create(
        model=_JUDGE_MODEL,
        messages=[{
            "role": "user",
            "content": _CONTEXT_RELEVANCE_PROMPT.format(question=input, chunks=chunks_text),
        }],
        temperature=0,
        response_format={"type": "json_object"},
    )

    import json
    result = json.loads(response.choices[0].message.content)
    score = max(0.0, min(1.0, float(result.get("score", 0))))
    reasoning = result.get("reasoning", "")

    return Score(name="ContextRelevance", score=score, metadata={"reasoning": reasoning})


# --- LLM-as-Judge: Faithfulness ---

_FAITHFULNESS_PROMPT = """You are evaluating whether an AI assistant's answer is faithful to the provided context.
"Faithful" means every claim in the answer can be traced back to the retrieved context.
The answer should NOT contain information that isn't in the context, even if that information is correct.

Question: {question}

Retrieved context:
{context}

AI's answer:
{answer}

Score from 0 to 1:
  0.0 = the answer contains multiple claims not supported by the context (hallucination)
  0.5 = the answer is partially supported but includes some unsupported claims
  1.0 = every claim in the answer is directly supported by the context

Respond with ONLY a JSON object: {{"score": <number>, "reasoning": "<brief explanation>"}}"""


def faithfulness(*, output, expected, input, **kwargs) -> Score:
    """
    Evaluate whether the answer is grounded in the retrieved chunks.
    A low score here means the model is hallucinating — inventing facts
    not present in the context, even if retrieval was good.
    """
    answer = output.get("answer", "")
    chunks = output.get("chunks", [])

    if not answer:
        return Score(name="Faithfulness", score=0, metadata={"reasoning": "Empty answer"})
    if not chunks:
        return Score(name="Faithfulness", score=0, metadata={"reasoning": "No context to be faithful to"})

    context = "\n\n---\n\n".join(c.get("text", "") for c in chunks)

    response = _judge_client.chat.completions.create(
        model=_JUDGE_MODEL,
        messages=[{
            "role": "user",
            "content": _FAITHFULNESS_PROMPT.format(
                question=input, context=context, answer=answer
            ),
        }],
        temperature=0,
        response_format={"type": "json_object"},
    )

    import json
    result = json.loads(response.choices[0].message.content)
    score = max(0.0, min(1.0, float(result.get("score", 0))))
    reasoning = result.get("reasoning", "")

    return Score(name="Faithfulness", score=score, metadata={"reasoning": reasoning})


# --- Deterministic: Has Citation ---

# Source file stems that indicate a real Vault doc reference
_CITATION_INDICATORS = [
    "according to",
    "documentation",
    "section",
    "docs",
    # Vault-specific terms that indicate citing a source
    "auth method",
    "secrets engine",
    "the vault",
]


def has_citation(*, output, expected, input, **kwargs) -> Score:
    """
    Check whether the answer references its source material.
    This is a deterministic business-rule scorer — no LLM needed.

    Returns 1.0 if the answer contains citation-like language,
    0.0 if it doesn't. For "I don't know" answers, returns 1.0
    (no citation needed when declining to answer).
    """
    answer = output.get("answer", "").lower()

    # If the pipeline correctly says "I don't know", no citation needed
    if "don't have enough information" in answer or "cannot answer" in answer:
        return Score(name="HasCitation", score=1.0, metadata={"reason": "N/A — decline to answer"})

    has_ref = any(indicator in answer for indicator in _CITATION_INDICATORS)
    return Score(
        name="HasCitation",
        score=1.0 if has_ref else 0.0,
        metadata={"reason": "Citation found" if has_ref else "No citation language detected"},
    )
