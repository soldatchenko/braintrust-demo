"""
Score threshold gate for CI/CD.

Parses `braintrust eval` output and enforces minimum score thresholds.
If any scorer drops below its threshold, exits with code 1 to fail the CI job.

Usage:
    braintrust eval evals/run_eval.py 2>&1 | tee eval_output.txt
    python evals/gate.py eval_output.txt

The thresholds are intentionally set below current scores to allow for
normal run-to-run variance (LLM non-determinism) while catching real
regressions. Tighten them as your pipeline matures.
"""

import re
import sys

# --- Minimum score thresholds (0-100) ---
# Set ~10-15 points below current scores to absorb variance.
# Current scores: AnswerCorrectness 96.3%, Faithfulness 100%,
# HasCitation 97.6%, ContextRelevance 75.8%
THRESHOLDS = {
    "AnswerCorrectness": 85.0,
    "Faithfulness": 90.0,
    "HasCitation": 85.0,
    "ContextRelevance": 60.0,
}

# Regex to match score lines in braintrust eval output.
# Format varies but typically: "ScoreName   XX.XX% ..." or similar.
# We look for a word followed by a percentage.
_SCORE_PATTERN = re.compile(
    r"^(\w+)\s+(\d+(?:\.\d+)?)%",
    re.MULTILINE,
)


def parse_scores(text: str) -> dict[str, float]:
    """Extract scorer names and percentages from braintrust eval output."""
    scores = {}
    for match in _SCORE_PATTERN.finditer(text):
        name = match.group(1)
        value = float(match.group(2))
        # Only capture scores we care about (ignore noise)
        if name in THRESHOLDS:
            scores[name] = value
    return scores


def check_thresholds(scores: dict[str, float]) -> list[str]:
    """
    Compare parsed scores against thresholds.
    Returns a list of failure messages (empty = all passed).
    """
    failures = []
    for name, minimum in THRESHOLDS.items():
        actual = scores.get(name)
        if actual is None:
            failures.append(f"  MISSING: {name} (expected in eval output)")
        elif actual < minimum:
            failures.append(
                f"  FAIL: {name} = {actual:.1f}% (threshold: {minimum:.1f}%)"
            )
    return failures


def format_summary(scores: dict[str, float], failures: list[str]) -> str:
    """Build a human-readable summary for CI logs and PR comments."""
    lines = ["=" * 50, "EVAL SCORE GATE", "=" * 50, ""]

    for name, minimum in THRESHOLDS.items():
        actual = scores.get(name)
        if actual is None:
            status = "⚠ MISSING"
            detail = f"threshold: {minimum:.1f}%"
        elif actual < minimum:
            status = "✗ FAIL"
            detail = f"{actual:.1f}% < {minimum:.1f}%"
        else:
            status = "✓ PASS"
            detail = f"{actual:.1f}% >= {minimum:.1f}%"
        lines.append(f"  {status}  {name}: {detail}")

    lines.append("")
    if failures:
        lines.append(f"RESULT: FAILED ({len(failures)} score(s) below threshold)")
    else:
        lines.append("RESULT: PASSED (all scores above threshold)")
    lines.append("=" * 50)
    return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: python evals/gate.py <eval_output_file>", file=sys.stderr)
        sys.exit(2)

    output_file = sys.argv[1]
    with open(output_file) as f:
        text = f.read()

    scores = parse_scores(text)
    failures = check_thresholds(scores)
    summary = format_summary(scores, failures)

    print(summary)

    # Write summary to file for the PR comment step
    with open("gate_summary.txt", "w") as f:
        f.write(summary)

    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
