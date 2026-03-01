"""
Core RAG query pipeline.

Flow: question → embed → retrieve from Pinecone → assemble prompt → generate answer

Every LLM call is auto-traced via wrap_openai. The @traced decorator creates
a parent span so the full pipeline appears as a nested tree in the Braintrust UI:
  rag_query
    ├── embed_query          (OpenAI embeddings API)
    ├── retrieve_chunks      (Pinecone similarity search)
    └── generate_answer      (OpenAI chat completion)

Usage:
    # As a module
    from rag.pipeline import rag_query
    result = rag_query("How does AppRole auth work?")

    # As CLI for interactive testing
    python rag/pipeline.py "How does AppRole auth work?"
"""

import os
import sys
from pathlib import Path

import braintrust
import openai
from dotenv import load_dotenv
from pinecone import Pinecone

from rag.prompts import SYSTEM_PROMPT, USER_PROMPT

load_dotenv()

# --- Client setup ---
# init_logger tells Braintrust which project to send traces to.
# Without this, @traced and wrap_openai have nowhere to log.
logger = braintrust.init_logger(project=os.environ.get("BRAINTRUST_PROJECT", "vault-rag-demo"))

# wrap_openai: same OpenAI client, but every call is auto-captured as a Braintrust trace span
oai_client = braintrust.wrap_openai(openai.OpenAI())

pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
index = pc.Index(os.environ.get("PINECONE_INDEX_NAME", "vault-rag-demo"))

# --- Config ---
EMBEDDING_MODEL = "text-embedding-3-small"
GENERATION_MODEL = "gpt-4.1-mini"
TOP_K = 5  # number of chunks to retrieve — tunable knob for experiments


@braintrust.traced
def embed_query(question: str) -> list[float]:
    """Embed the user's question using the same model we used at ingest time."""
    response = oai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=question,
    )
    return response.data[0].embedding


@braintrust.traced
def retrieve_chunks(query_vector: list[float], top_k: int = TOP_K) -> list[dict]:
    """
    Find the top_k most similar chunks in Pinecone.
    Returns the metadata (including text) for each match.
    """
    results = index.query(
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
    )
    # Each match has: id, score (cosine similarity 0-1), metadata
    return [
        {
            "text": match.metadata.get("text", ""),
            "source": match.metadata.get("source", ""),
            "heading_path": match.metadata.get("heading_path", ""),
            "score": match.score,
        }
        for match in results.matches
    ]


@braintrust.traced
def generate_answer(question: str, chunks: list[dict]) -> str:
    """
    Assemble the prompt from retrieved chunks and generate an answer.
    The system prompt instructs the model to only use the provided context.
    """
    # Build context string from retrieved chunks
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        context_parts.append(
            f"[Section {i}: {chunk['heading_path']}]\n{chunk['text']}"
        )
    context = "\n\n---\n\n".join(context_parts)

    response = oai_client.chat.completions.create(
        model=GENERATION_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
            {"role": "user", "content": USER_PROMPT.format(question=question)},
        ],
        temperature=0,  # deterministic for reproducibility in evals
    )
    return response.choices[0].message.content


@braintrust.traced
def rag_query(question: str) -> dict:
    """
    Full RAG pipeline: embed → retrieve → generate.

    Returns a dict with both the answer and the retrieved chunks,
    so scorers can evaluate retrieval quality independently of generation.
    """
    # Step 1: Embed the question
    query_vector = embed_query(question)

    # Step 2: Retrieve relevant chunks
    chunks = retrieve_chunks(query_vector)

    # Step 3: Generate answer from retrieved context
    answer = generate_answer(question, chunks)

    return {
        "answer": answer,
        "chunks": chunks,  # needed by scorers to evaluate retrieval quality
    }


# --- CLI for interactive testing ---
if __name__ == "__main__":
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
    else:
        question = "How does AppRole authentication work in Vault?"

    print(f"Question: {question}\n")

    result = rag_query(question)

    print("=" * 60)
    print("ANSWER:")
    print("=" * 60)
    print(result["answer"])
    print()
    print("=" * 60)
    print(f"RETRIEVED {len(result['chunks'])} CHUNKS:")
    print("=" * 60)
    for i, chunk in enumerate(result["chunks"], 1):
        print(f"\n  [{i}] {chunk['heading_path']} (score: {chunk['score']:.3f})")
        print(f"      Source: {chunk['source']}")
        print(f"      Preview: {chunk['text'][:100]}...")
