"""
Chunker for Vault MDX documentation.

Strategy: heading-based splitting with token-count fallback + merge pass.
  1. Strip YAML frontmatter
  2. Split at ## (h2) boundaries — these are the natural topic divisions
  3. If a ## section exceeds MAX_CHUNK_TOKENS, split at ### (h3) within it
  4. If a ### section still exceeds the limit, split by token count
  5. Every chunk gets a breadcrumb prefix (e.g. "AppRole Auth Method > Authentication")
     so it's never orphaned from its context hierarchy
  6. Merge consecutive small chunks from the same file to avoid tiny fragments
     that don't carry enough signal for meaningful embeddings

Why this matters for retrieval:
  - Heading-based splits preserve the author's semantic boundaries
  - The breadcrumb prefix means the embedding captures WHAT topic the chunk belongs to,
    not just the raw content — dramatically improves similarity matching
  - The token cap prevents oversized chunks that dilute cosine similarity scores
  - The merge pass prevents undersized chunks that don't have enough signal
"""

import re
import tiktoken
from pathlib import Path
from dataclasses import dataclass, field

# cl100k_base is the tokenizer used by text-embedding-3-small
enc = tiktoken.get_encoding("cl100k_base")

MAX_CHUNK_TOKENS = 500
MIN_CHUNK_TOKENS = 50   # chunks below this get merged with neighbors
OVERLAP_TOKENS = 50     # overlap when falling back to token-count splitting


@dataclass
class Chunk:
    """A single chunk ready for embedding."""
    text: str                        # breadcrumb + body — this gets embedded
    metadata: dict = field(default_factory=dict)  # source, heading_path, etc.

    @property
    def token_count(self) -> int:
        return len(enc.encode(self.text))


def strip_frontmatter(content: str) -> str:
    """Remove YAML frontmatter (--- ... ---) from the top of MDX files."""
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            return content[end + 3:].strip()
    return content.strip()


def extract_page_title(content: str) -> str | None:
    """Pull page_title from frontmatter if present."""
    match = re.search(r"page_title:\s*(.+)", content)
    if match:
        return match.group(1).strip().strip("'\"")
    return None


def split_by_heading(text: str, level: int) -> list[tuple[str | None, str]]:
    """
    Split text at markdown headings of a given level.
    Returns list of (heading_text, body) tuples.
    The first element may have heading_text=None if there's content before
    the first heading of that level (the "preamble").
    """
    # Match exactly N '#' chars — negative lookahead prevents ## from matching ###
    pattern = re.compile(rf"^{'#' * level}(?!#)\s+(.+)$", re.MULTILINE)
    matches = list(pattern.finditer(text))

    if not matches:
        return [(None, text.strip())]

    sections = []

    # Content before the first heading at this level (preamble)
    if matches[0].start() > 0:
        preamble = text[:matches[0].start()].strip()
        if preamble:
            sections.append((None, preamble))

    for i, match in enumerate(matches):
        heading = match.group(1).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        sections.append((heading, body))

    return sections


def split_by_tokens(text: str, max_tokens: int, overlap: int) -> list[str]:
    """
    Last-resort fallback: split text into fixed-size token windows.
    Tries to break at paragraph boundaries when possible.
    """
    tokens = enc.encode(text)
    if len(tokens) <= max_tokens:
        return [text]

    pieces = []
    start = 0
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        chunk_text = enc.decode(tokens[start:end])

        # Try to break at last paragraph boundary for cleaner chunks
        if end < len(tokens):
            last_break = chunk_text.rfind("\n\n")
            if last_break > len(chunk_text) // 3:
                chunk_text = chunk_text[:last_break]
                end = start + len(enc.encode(chunk_text))

        pieces.append(chunk_text.strip())

        # Always advance by at least half the window to prevent tiny trailing fragments
        min_step = max_tokens // 2
        step = max(end - start - overlap, min_step)
        start = start + step

    return pieces


def make_breadcrumb(*parts: str | None) -> str:
    """Build a breadcrumb string from heading hierarchy, skipping None values."""
    return " > ".join(p for p in parts if p)


def merge_small_chunks(chunks: list[Chunk], min_tokens: int, max_tokens: int) -> list[Chunk]:
    """
    Merge consecutive small chunks from the same source file.

    If a chunk is below min_tokens and the next chunk is from the same file,
    combine them (as long as the result stays under max_tokens).
    This prevents tiny fragments that don't carry enough semantic signal.
    """
    if not chunks:
        return chunks

    merged = []
    buffer = chunks[0]

    for chunk in chunks[1:]:
        same_source = chunk.metadata.get("source") == buffer.metadata.get("source")
        combined_tokens = buffer.token_count + chunk.token_count

        if same_source and buffer.token_count < min_tokens and combined_tokens <= max_tokens:
            # Merge: combine text with a separator, keep the first chunk's metadata
            # but update heading_path to show the span
            buffer = Chunk(
                text=buffer.text + "\n\n" + chunk.text,
                metadata={
                    **buffer.metadata,
                    "heading_path": buffer.metadata["heading_path"],
                    "merged": True,
                },
            )
        else:
            merged.append(buffer)
            buffer = chunk

    merged.append(buffer)
    return merged


def chunk_file(file_path: Path, corpus_root: Path) -> list[Chunk]:
    """
    Chunk a single MDX file into embedding-ready pieces.

    The relative path from corpus_root is stored in metadata for citation tracking.
    """
    content = file_path.read_text(encoding="utf-8")
    relative_path = str(file_path.relative_to(corpus_root))

    page_title = extract_page_title(content)
    body = strip_frontmatter(content)

    # Use the first # heading as the document title if no page_title in frontmatter
    h1_match = re.match(r"^#\s+(.+)$", body, re.MULTILINE)
    doc_title = page_title or (h1_match.group(1).strip() if h1_match else file_path.stem)

    # Remove the H1 heading from the body — it becomes part of the breadcrumb
    if h1_match:
        body = body[h1_match.end():].strip()

    chunks = []

    # Split at ## (h2) level
    h2_sections = split_by_heading(body, level=2)

    for h2_heading, h2_body in h2_sections:
        breadcrumb = make_breadcrumb(doc_title, h2_heading)
        full_text = f"{breadcrumb}\n\n{h2_body}" if h2_body else breadcrumb
        token_count = len(enc.encode(full_text))

        if token_count <= MAX_CHUNK_TOKENS:
            chunks.append(Chunk(
                text=full_text,
                metadata={
                    "source": relative_path,
                    "heading_path": breadcrumb,
                    "heading_level": 2 if h2_heading else 1,
                },
            ))
        else:
            # Too big — split at ### (h3) within this h2 section
            h3_sections = split_by_heading(h2_body, level=3)

            for h3_heading, h3_body in h3_sections:
                breadcrumb_h3 = make_breadcrumb(doc_title, h2_heading, h3_heading)
                full_text_h3 = f"{breadcrumb_h3}\n\n{h3_body}" if h3_body else breadcrumb_h3
                tc = len(enc.encode(full_text_h3))

                if tc <= MAX_CHUNK_TOKENS:
                    chunks.append(Chunk(
                        text=full_text_h3,
                        metadata={
                            "source": relative_path,
                            "heading_path": breadcrumb_h3,
                            "heading_level": 3 if h3_heading else 2,
                        },
                    ))
                else:
                    # Still too big — token-count fallback
                    token_pieces = split_by_tokens(full_text_h3, MAX_CHUNK_TOKENS, OVERLAP_TOKENS)
                    for i, piece in enumerate(token_pieces):
                        chunks.append(Chunk(
                            text=piece,
                            metadata={
                                "source": relative_path,
                                "heading_path": breadcrumb_h3,
                                "heading_level": 3 if h3_heading else 2,
                                "token_split_part": i + 1,
                            },
                        ))

    return chunks


def chunk_corpus(corpus_dir: str | Path) -> list[Chunk]:
    """
    Chunk all MDX files in the corpus directory.
    Returns a flat list of all chunks across all files, with small chunks merged.
    """
    corpus_path = Path(corpus_dir)
    all_chunks = []

    for mdx_file in sorted(corpus_path.rglob("*.mdx")):
        file_chunks = chunk_file(mdx_file, corpus_path)
        all_chunks.extend(file_chunks)

    # Merge consecutive small chunks from the same file
    all_chunks = merge_small_chunks(all_chunks, MIN_CHUNK_TOKENS, MAX_CHUNK_TOKENS)

    return all_chunks


# --- CLI entry point for testing ---
if __name__ == "__main__":
    import sys

    corpus_dir = sys.argv[1] if len(sys.argv) > 1 else "./corpus"
    chunks = chunk_corpus(corpus_dir)

    # Summary stats
    token_counts = [c.token_count for c in chunks]
    print(f"Total chunks: {len(chunks)}")
    print(f"Token range:  {min(token_counts)} - {max(token_counts)}")
    print(f"Avg tokens:   {sum(token_counts) / len(token_counts):.0f}")
    print(f"Total tokens: {sum(token_counts):,}")
    print()

    # Distribution
    buckets = [(0, 50), (50, 100), (100, 200), (200, 300), (300, 400), (400, 500), (500, 600)]
    print("Token distribution:")
    for lo, hi in buckets:
        count = sum(1 for t in token_counts if lo <= t < hi)
        pct = count / len(token_counts) * 100
        bar = "#" * int(pct / 2)
        print(f"  {lo:>3}-{hi:<3}: {count:>4} chunks ({pct:5.1f}%) {bar}")
    print()

    # Show a few example chunks
    for i, chunk in enumerate(chunks[:3]):
        print(f"--- Chunk {i+1} ({chunk.token_count} tokens) ---")
        print(f"Metadata: {chunk.metadata}")
        print(chunk.text[:300])
        print("...")
        print()
