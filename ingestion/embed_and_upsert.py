"""
Embed chunks and upsert to Pinecone.

This is the "apply" step — it takes the ephemeral chunk objects from chunk.py,
sends them to OpenAI for embedding, and writes the vectors + metadata to Pinecone.
After this runs, Pinecone is the durable source of truth for retrieval.

Idempotent: re-running with the same corpus and chunking overwrites existing vectors
(same content → same vector ID). If you change the chunking strategy, clear the
index first since old vectors from the previous strategy will still be there.

Usage:
    python ingestion/embed_and_upsert.py [--corpus ./corpus] [--clear]
"""

import hashlib
import os
import sys
import time
from pathlib import Path

import openai
from dotenv import load_dotenv
from pinecone import Pinecone

# Add project root to path so we can import from ingestion/
sys.path.insert(0, str(Path(__file__).parent.parent))
from ingestion.chunk import chunk_corpus, Chunk

load_dotenv()

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536
PINECONE_BATCH_SIZE = 100     # max vectors per upsert call
OPENAI_BATCH_SIZE = 100       # texts per embedding call (stay under token limits)


def make_vector_id(chunk: Chunk) -> str:
    """
    Deterministic ID from chunk content + source.
    Same chunk always gets the same ID → upserts are idempotent.
    """
    key = f"{chunk.metadata.get('source', '')}::{chunk.metadata.get('heading_path', '')}::{chunk.text[:200]}"
    return hashlib.sha256(key.encode()).hexdigest()[:16]


def embed_batch(client: openai.OpenAI, texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts in a single API call."""
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", default="./corpus", help="Path to corpus directory")
    parser.add_argument("--clear", action="store_true", help="Clear the index before upserting")
    args = parser.parse_args()

    # --- Initialize clients ---
    oai_client = openai.OpenAI()  # uses OPENAI_API_KEY from env
    pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])

    index_name = os.environ.get("PINECONE_INDEX_NAME", "vault-rag-demo")
    index = pc.Index(index_name)

    if args.clear:
        print(f"Clearing index '{index_name}'...")
        try:
            index.delete(delete_all=True)
            print("Index cleared.")
        except Exception:
            # Serverless indexes throw 404 if namespace is empty — safe to ignore
            print("Index already empty, nothing to clear.")

    # --- Chunk the corpus ---
    print(f"Chunking corpus from {args.corpus}...")
    chunks = chunk_corpus(args.corpus)
    print(f"  {len(chunks)} chunks ready")

    # --- Embed and upsert in batches ---
    total_embedded = 0
    total_upserted = 0
    start_time = time.time()

    # Process in batches of OPENAI_BATCH_SIZE
    for batch_start in range(0, len(chunks), OPENAI_BATCH_SIZE):
        batch_chunks = chunks[batch_start:batch_start + OPENAI_BATCH_SIZE]
        batch_texts = [c.text for c in batch_chunks]

        # Embed this batch
        embeddings = embed_batch(oai_client, batch_texts)
        total_embedded += len(embeddings)

        # Build Pinecone vectors
        vectors = []
        for chunk, embedding in zip(batch_chunks, embeddings):
            vectors.append({
                "id": make_vector_id(chunk),
                "values": embedding,
                "metadata": {
                    **chunk.metadata,
                    # Store a preview of the text for debugging in Pinecone console
                    # Full text goes here too — we need it at retrieval time to pass to the LLM
                    "text": chunk.text,
                },
            })

        # Upsert to Pinecone (sub-batch if needed, though our batch size matches)
        for upsert_start in range(0, len(vectors), PINECONE_BATCH_SIZE):
            upsert_batch = vectors[upsert_start:upsert_start + PINECONE_BATCH_SIZE]
            index.upsert(vectors=upsert_batch)
            total_upserted += len(upsert_batch)

        elapsed = time.time() - start_time
        print(f"  Embedded: {total_embedded}/{len(chunks)}  |  Upserted: {total_upserted}/{len(chunks)}  |  {elapsed:.1f}s")

    elapsed = time.time() - start_time
    print(f"\nDone! {total_upserted} vectors in Pinecone '{index_name}' ({elapsed:.1f}s)")

    # Verify
    stats = index.describe_index_stats()
    print(f"Index stats: {stats.total_vector_count} vectors, dimension {stats.dimension}")


if __name__ == "__main__":
    main()
