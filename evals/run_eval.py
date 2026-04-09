"""
Braintrust evaluation runner.

This ties together: dataset + task function + scorers → experiment.

Run with:
    braintrust eval evals/run_eval.py

What happens:
  1. Loads the golden dataset from evals/dataset.json
  2. For each test case, runs the RAG pipeline (embed → retrieve → generate)
  3. Runs all scorers against each result
  4. Uploads everything to Braintrust as an "experiment"
  5. Prints a summary with a link to the Braintrust dashboard
"""

import json
import os
import sys
from pathlib import Path

from braintrust import Eval
from dotenv import load_dotenv

# Ensure project root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent))

load_dotenv()

from evals.scorers import answer_correctness, context_relevance, faithfulness, has_citation
from rag.pipeline import rag_query


def load_dataset():
    """Load the golden eval dataset from JSON."""
    dataset_path = Path(__file__).parent / "dataset.json"
    with open(dataset_path) as f:
        return json.load(f)


def task(input, hooks=None, **kwargs):
    """
    The task function that Braintrust calls for each test case.

    Receives 'input' from the dataset row and a 'hooks' object for logging.
    Runs the full RAG pipeline and returns the result.
    Braintrust passes this result to each scorer.
    """
    return rag_query(input)


Eval(
    name=os.environ.get("BRAINTRUST_PROJECT", "vault-rag-demo"),
    experiment_name=os.environ.get("EXPERIMENT_NAME", None),
    data=load_dataset,
    task=task,
    scores=[
        answer_correctness,   # custom: is the answer correct vs. expected? (replaced Factuality)
        context_relevance,    # custom: did retrieval find the right chunks?
        faithfulness,         # custom: does the answer stick to the context?
        has_citation,         # custom: does the answer reference sources?
    ],
)
