"""
Generate traces by running questions through the RAG pipeline.

Each call to rag_query() produces a trace in Braintrust Logs via
init_logger() + wrap_openai + @braintrust.traced in pipeline.py.

Usage:
    python generate_traces.py [--count 200]
"""

import json
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from rag.pipeline import rag_query


def load_questions() -> list[str]:
    dataset_path = Path(__file__).parent / "dataset.json"
    with open(dataset_path) as f:
        data = json.load(f)
    return [row["input"] for row in data]


def main():
    target = int(sys.argv[1]) if len(sys.argv) > 1 else 200
    questions = load_questions()
    total = 0
    round_num = 0

    print(f"Generating {target} traces from {len(questions)} questions...\n")

    while total < target:
        round_num += 1
        for q in questions:
            if total >= target:
                break
            total += 1
            print(f"[{total}/{target}] {q[:80]}")
            try:
                rag_query(q)
            except Exception as e:
                print(f"  ERROR: {e}")
            # small delay to avoid rate limits
            time.sleep(0.1)

        if total < target:
            print(f"\n--- Round {round_num} complete ({total} traces so far) ---\n")

    print(f"\nDone! {total} traces generated. Check the Logs tab in Braintrust.")


if __name__ == "__main__":
    main()
