import { useState } from "react";

const colors = {
  bg: "#0a0e17",
  surface: "#111827",
  surfaceLight: "#1a2235",
  border: "#2a3650",
  accent: "#3b82f6",
  accentDim: "#1e3a5f",
  green: "#10b981",
  greenDim: "#064e3b",
  orange: "#f59e0b",
  orangeDim: "#78350f",
  red: "#ef4444",
  redDim: "#7f1d1d",
  purple: "#8b5cf6",
  purpleDim: "#4c1d95",
  text: "#e2e8f0",
  textDim: "#94a3b8",
  textMuted: "#64748b",
};

const tabs = [
  { id: "rag", label: "What is RAG?" },
  { id: "problem", label: "The Eval Problem" },
  { id: "flow", label: "Architecture Flow" },
  { id: "scorers", label: "Custom Scorers" },
  { id: "code", label: "Code Example" },
  { id: "session", label: "The Pairing Session" },
];

function RAGDiagram() {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: 700, margin: "0 auto" }}>
        {/* User Query */}
        <FlowBox color={colors.accent} label="1. User Query" desc={`"What's our refund policy for enterprise contracts?"`} />
        <Arrow />
        
        {/* Retrieval */}
        <div style={{ display: "flex", gap: "12px", alignItems: "stretch" }}>
          <FlowBox color={colors.purple} label="2. Embedding" desc="Query → vector representation" style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", color: colors.textMuted }}>→</div>
          <FlowBox color={colors.purple} label="3. Vector Search" desc="Find top-k similar document chunks from your knowledge base" style={{ flex: 2 }} />
        </div>
        <Arrow />
        
        {/* Retrieved Docs */}
        <div style={{ 
          border: `1px solid ${colors.border}`, 
          borderRadius: 8, 
          padding: "12px 16px",
          background: colors.surfaceLight 
        }}>
          <div style={{ fontSize: 12, color: colors.orange, fontWeight: 600, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
            RETRIEVED CONTEXT (top 3 chunks)
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {["§4.2 Enterprise refund terms: 30-day window...", "§7.1 SLA guarantees for enterprise tier...", "§2.3 General pricing overview..."].map((doc, i) => (
              <div key={i} style={{ 
                flex: 1, fontSize: 11, padding: "8px", borderRadius: 6, 
                background: colors.surface, color: colors.textDim, 
                border: `1px solid ${colors.border}`,
                fontFamily: "'IBM Plex Mono', monospace"
              }}>
                Chunk {i + 1}: {doc}
              </div>
            ))}
          </div>
        </div>
        <Arrow />
        
        {/* LLM */}
        <FlowBox color={colors.green} label="4. LLM Generation" desc="Prompt = system instructions + retrieved context + user query → model generates answer" />
        <Arrow />
        
        {/* Output */}
        <FlowBox color={colors.accent} label="5. Response" desc={`"Enterprise contracts include a 30-day full refund window from the date of signing, per section 4.2 of our terms..."`} />
      </div>
    </div>
  );
}

function EvalProblemDiagram() {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "1fr 1fr", 
          gap: "16px",
          marginBottom: "24px"
        }}>
          <FailureCard 
            title="Retrieval Failure" 
            color={colors.red}
            example={`Query: "refund policy for enterprise"\nRetrieved: chunks about pricing tiers, onboarding docs\nResult: correct answer wasn't in the context`}
          />
          <FailureCard 
            title="Generation Failure" 
            color={colors.orange}
            example={`Query: "refund policy for enterprise"\nRetrieved: correct §4.2 refund terms\nResult: LLM hallucinated a "60-day window" instead of 30`}
          />
          <FailureCard 
            title="Relevance Failure" 
            color={colors.purple}
            example={`Query: "refund policy for enterprise"\nRetrieved: 2 relevant + 1 irrelevant chunk\nResult: answer includes unrelated SLA info`}
          />
          <FailureCard 
            title="Completeness Failure" 
            color={colors.accent}
            example={`Query: "refund policy for enterprise"\nRetrieved: correct chunks\nResult: mentions 30-day window but omits the exceptions clause`}
          />
        </div>
        <div style={{ 
          background: colors.surfaceLight, 
          border: `1px solid ${colors.border}`, 
          borderRadius: 8, 
          padding: "16px",
          textAlign: "center"
        }}>
          <div style={{ color: colors.orange, fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
            This is why you can't just vibe-check a RAG app
          </div>
          <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.6 }}>
            Failures can happen at the retrieval layer, the generation layer, or both.
            You need scorers that evaluate each layer independently so you know <em>where</em> to fix things.
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureFlow() {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* The full loop */}
        <div style={{ 
          border: `1px solid ${colors.border}`, 
          borderRadius: 12, 
          padding: "20px",
          background: colors.surfaceLight,
          marginBottom: "16px"
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace" }}>
            BRAINTRUST EVAL PIPELINE — WHAT YOU'D BE HELPING CUSTOMERS BUILD
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <PipelineStep num="1" label="Dataset" color={colors.accent}
              desc="Golden test cases: input queries + expected answers + source documents" />
            <SmallArrow />
            <PipelineStep num="2" label="Task Function" color={colors.purple}
              desc="Runs the customer's actual RAG pipeline: embed → retrieve → generate" />
            <SmallArrow />
            <PipelineStep num="3" label="Scorers (this is the key part)" color={colors.green}
              desc="Multiple scoring functions evaluate the output from different angles" />
            <SmallArrow />
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr 1fr", 
              gap: "8px",
              padding: "0 20px"
            }}>
              <ScorerBox name="Context Relevance" desc="Did retrieval find the right docs?" color={colors.green} />
              <ScorerBox name="Faithfulness" desc="Does the answer stick to retrieved context?" color={colors.orange} />
              <ScorerBox name="Answer Correctness" desc="Is it factually right vs. expected?" color={colors.purple} />
            </div>
            
            <SmallArrow />
            <PipelineStep num="4" label="Braintrust Dashboard" color={colors.accent}
              desc="Results tracked per experiment — compare prompt A vs B, model X vs Y, chunk size 500 vs 1000" />
          </div>
        </div>

        <div style={{ 
          background: colors.surface, 
          border: `1px solid ${colors.greenDim}`, 
          borderRadius: 8, 
          padding: "14px 16px",
        }}>
          <div style={{ color: colors.green, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            Where you come in as CSA
          </div>
          <div style={{ color: colors.textDim, fontSize: 12, lineHeight: 1.6 }}>
            The customer's ML engineers understand their RAG app but don't know how to structure evals.
            You help them define the dataset schema, wire up the task function to their existing pipeline,
            and build scorers that measure what actually matters for their use case. You're not building their 
            AI app — you're helping them build the test harness around it.
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomScorersExplainer() {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
          Scorers in Braintrust are just functions that take an output (what the AI produced), 
          an expected value (the known-good answer), and optionally the input, then return a score 
          between 0 and 1. Some are deterministic (string matching, regex), but the powerful ones 
          for RAG use an LLM as a judge — you literally ask a separate LLM call to evaluate whether 
          the output is good.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <ScorerDetail 
            name="Context Relevance Scorer"
            what="Evaluates the retrieval step in isolation"
            how={`Sends each retrieved chunk + the original query to an LLM judge and asks: "Is this chunk relevant to answering this question?" Scores each chunk 0-1 and averages.`}
            why="If this score is low, the problem is in your vector search — embeddings, chunking strategy, or knowledge base coverage. No amount of prompt engineering will fix it."
            color={colors.green}
          />
          <ScorerDetail 
            name="Faithfulness / Groundedness Scorer"
            what="Evaluates whether the LLM's answer is actually supported by the retrieved context"
            how={`Sends the generated answer + the retrieved chunks to an LLM judge and asks: "Can every claim in this answer be traced back to the provided context?" Returns 0-1.`}
            why="This catches hallucination. The retrieval might be perfect, but the model invents facts not present in the context. A low score here means you need better system prompts or guardrails."
            color={colors.orange}
          />
          <ScorerDetail 
            name="Answer Correctness Scorer"
            what="Evaluates end-to-end quality against a known-good answer"
            how={`Compares the generated answer against the expected answer using an LLM judge. More nuanced than exact match — it understands paraphrasing and partial credit.`}
            why="This is your top-level metric. If this is high but the others are low, you're getting lucky. If this is low, the sub-scores tell you where to look."
            color={colors.purple}
          />
          <ScorerDetail 
            name="Custom Business Logic Scorer"
            what="Domain-specific rules unique to this customer"
            how={`Pure code, no LLM needed. Example: check that the response always includes a disclaimer when discussing pricing, or that it never mentions competitor names, or that cited section numbers actually exist.`}
            why="This is where your pairing session gets interesting — you'd help the customer translate their business rules into deterministic scoring functions."
            color={colors.accent}
          />
        </div>
      </div>
    </div>
  );
}

function CodeExample() {
  const code = `from braintrust import Eval, traced
from autoevals import Factuality
import openai

client = openai.OpenAI()

# --- Custom Scorer: Context Relevance ---
# This is an LLM-as-judge scorer. It asks a separate
# LLM call to evaluate whether the retrieved docs
# were actually relevant to the question.

def context_relevance(output, expected, input, metadata):
    """Score how relevant the retrieved chunks were."""
    chunks = metadata.get("retrieved_chunks", [])
    if not chunks:
        return {"name": "ContextRelevance", "score": 0}
    
    scores = []
    for chunk in chunks:
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{
                "role": "user",
                "content": f"""Rate relevance of this document chunk 
to the query on a scale of 0-1.

Query: {input}
Chunk: {chunk}

Return ONLY a number between 0 and 1."""
            }]
        )
        scores.append(float(resp.choices[0].message.content.strip()))
    
    return {
        "name": "ContextRelevance", 
        "score": sum(scores) / len(scores)
    }


# --- Custom Scorer: Has Disclaimer ---
# This is a deterministic scorer. Pure Python,
# no LLM needed. Checks a business rule.

def has_disclaimer(output, expected, input, **kwargs):
    """Ensure pricing-related answers include disclaimer."""
    pricing_keywords = ["price", "cost", "refund", "billing"]
    is_pricing_query = any(kw in input.lower() for kw in pricing_keywords)
    
    if not is_pricing_query:
        return {"name": "HasDisclaimer", "score": 1}  # N/A
    
    has_it = "subject to change" in output.lower() or \\
             "contact sales" in output.lower()
    return {"name": "HasDisclaimer", "score": 1 if has_it else 0}


# --- The Task Function ---
# This calls the customer's ACTUAL RAG pipeline.
# You'd help them wrap their existing code here.

@traced
def run_rag_pipeline(input):
    # Step 1: Retrieve (customer's existing retrieval code)
    chunks = customer_vector_search(input, top_k=3)
    
    # Step 2: Generate
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"""Answer based 
only on this context:\\n{chr(10).join(chunks)}"""},
            {"role": "user", "content": input}
        ]
    )
    
    answer = response.choices[0].message.content
    
    # Return output + metadata so scorers can access chunks
    return {
        "output": answer,
        "metadata": {"retrieved_chunks": chunks}
    }


# --- The Eval ---
# This ties it all together. Dataset + Task + Scorers.
# Run with: braintrust eval eval_rag.py

Eval(
    "Support Chatbot RAG",
    data=lambda: [
        {
            "input": "What's the refund policy for enterprise?",
            "expected": "30-day full refund from date of signing"
        },
        {
            "input": "How do I add users to my team?",
            "expected": "Go to Settings > Team > Invite members"
        },
        # ... 50-200 more test cases
    ],
    task=run_rag_pipeline,
    scores=[
        Factuality,           # built-in from autoevals
        context_relevance,    # custom LLM-as-judge
        has_disclaimer,       # custom deterministic
    ],
)`;

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
          Here's what the actual code looks like. This is what you'd be helping a customer's 
          ML engineer write during a pairing session. The comments explain each section.
        </div>
        <div style={{ 
          background: "#0d1117", 
          border: `1px solid ${colors.border}`, 
          borderRadius: 8, 
          padding: "20px",
          overflow: "auto",
          maxHeight: 600
        }}>
          <pre style={{ 
            margin: 0, 
            fontSize: 12, 
            lineHeight: 1.6, 
            color: "#c9d1d9",
            fontFamily: "'IBM Plex Mono', 'Fira Code', 'Consolas', monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}>
            {code}
          </pre>
        </div>
        <div style={{ 
          marginTop: 12, 
          background: colors.surfaceLight, 
          border: `1px solid ${colors.border}`, 
          borderRadius: 8, 
          padding: "14px 16px" 
        }}>
          <div style={{ color: colors.green, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            What you need to understand vs. what you'd learn on the job
          </div>
          <div style={{ color: colors.textDim, fontSize: 12, lineHeight: 1.7 }}>
            <strong style={{ color: colors.text }}>You already know:</strong> Python, APIs, infrastructure, 
            how to talk to engineering teams, how to debug systems across layers.
            <br /><br />
            <strong style={{ color: colors.text }}>You'd learn:</strong> The specifics of how embeddings and vector 
            search work, what makes a good eval dataset, how LLM-as-judge scoring works, and 
            Braintrust's specific SDK patterns. This is all very learnable, especially given how 
            deep you've already gone on AI tooling during your sabbatical.
          </div>
        </div>
      </div>
    </div>
  );
}

function PairingSession() {
  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
          So that Thursday pairing session might actually look like this. You're screen-sharing 
          with an ML engineer at a customer who has a RAG-powered internal search tool 
          for their legal team.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <SessionStep 
            time="0:00" 
            label="Understand their pipeline" 
            detail="You ask them to walk you through their existing RAG code. What embedding model? What vector DB (Pinecone, Weaviate, pgvector)? What chunk size? What's the system prompt? You're mapping their architecture so you know what to test."
          />
          <SessionStep 
            time="0:15" 
            label="Define what 'good' looks like" 
            detail={`You ask: "When your legal team complains about bad answers, what specifically goes wrong?" They say: citations are wrong, it sometimes pulls from outdated policy docs, and it occasionally makes up clauses that don't exist. Now you know your scorers need to check citation accuracy, document recency, and faithfulness.`}
          />
          <SessionStep 
            time="0:30" 
            label="Build the dataset together" 
            detail="You help them pull 50 real queries from their production logs (Braintrust already captured these if they have tracing on). For each one, they provide the correct answer and which source doc it should come from. This is the 'golden dataset.'"
          />
          <SessionStep 
            time="0:45" 
            label="Write the first custom scorer" 
            detail={`You pair on a "CitationAccuracy" scorer — a deterministic function that checks whether the section numbers cited in the response actually exist in the retrieved chunks. Pure string parsing, no LLM needed. Ship it.`}
          />
          <SessionStep 
            time="1:00" 
            label="Write the LLM-as-judge scorer" 
            detail={`You build a "Faithfulness" scorer that sends the answer + context to GPT-4o and asks it to identify any claims not supported by the source material. You run it against 5 test cases live and tune the judge prompt until the scores match your intuition.`}
          />
          <SessionStep 
            time="1:15" 
            label="Run the first experiment" 
            detail="Hit 'braintrust eval' in the terminal. Watch results populate in the Braintrust dashboard. You see that context_relevance is 0.82 but faithfulness is 0.61 — the retrieval is decent but the model is hallucinating. You suggest they tighten the system prompt to 'only cite information explicitly stated in the provided context.'"
          />
          <SessionStep 
            time="1:30" 
            label="Run experiment #2 and compare" 
            detail="Update the prompt, re-run. Faithfulness jumps to 0.78. Side-by-side diff in Braintrust shows exactly which test cases improved and which regressed. The customer now has a repeatable process for measuring changes."
          />
        </div>

        <div style={{ 
          marginTop: 20,
          background: colors.surfaceLight, 
          border: `1px solid ${colors.accentDim}`, 
          borderRadius: 8, 
          padding: "14px 16px" 
        }}>
          <div style={{ color: colors.accent, fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            The pattern should feel familiar
          </div>
          <div style={{ color: colors.textDim, fontSize: 12, lineHeight: 1.7 }}>
            This is the same shape as your HashiCorp work. You walked into a customer environment, 
            understood their architecture, identified the failure modes, built patterns to address 
            them, and enabled the team to operate independently. The domain is different — Vault 
            policies vs. eval scorers — but the consulting motion is identical. Assess, design, 
            build, enable, hand off.
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Shared Components ---

function FlowBox({ color, label, desc, style = {} }) {
  return (
    <div style={{ 
      border: `1px solid ${color}40`, 
      borderLeft: `3px solid ${color}`,
      borderRadius: 8, 
      padding: "12px 16px", 
      background: colors.surface,
      ...style
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>{label}</div>
      <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

function Arrow() {
  return (
    <div style={{ textAlign: "center", color: colors.textMuted, fontSize: 16, lineHeight: 1 }}>↓</div>
  );
}

function SmallArrow() {
  return (
    <div style={{ textAlign: "center", color: colors.textMuted, fontSize: 14, lineHeight: 1, padding: "0 20px" }}>↓</div>
  );
}

function FailureCard({ title, color, example }) {
  return (
    <div style={{ 
      border: `1px solid ${color}30`, 
      borderRadius: 8, 
      padding: "12px 14px", 
      background: colors.surface 
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace" }}>{title}</div>
      <pre style={{ 
        fontSize: 11, color: colors.textDim, margin: 0, 
        whiteSpace: "pre-wrap", lineHeight: 1.5,
        fontFamily: "'IBM Plex Mono', monospace"
      }}>{example}</pre>
    </div>
  );
}

function PipelineStep({ num, label, desc, color }) {
  return (
    <div style={{ 
      display: "flex", 
      gap: "12px", 
      alignItems: "center",
      padding: "8px 12px",
      background: colors.surface,
      borderRadius: 8,
      border: `1px solid ${color}30`
    }}>
      <div style={{ 
        width: 28, height: 28, borderRadius: "50%", 
        background: `${color}20`, color, 
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, flexShrink: 0,
        fontFamily: "'IBM Plex Mono', monospace"
      }}>{num}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color }}>{label}</div>
        <div style={{ fontSize: 11, color: colors.textDim, lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

function ScorerBox({ name, desc, color }) {
  return (
    <div style={{ 
      padding: "10px", 
      borderRadius: 6, 
      background: `${color}10`, 
      border: `1px solid ${color}30`,
      textAlign: "center"
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>{name}</div>
      <div style={{ fontSize: 10, color: colors.textDim, marginTop: 4 }}>{desc}</div>
    </div>
  );
}

function ScorerDetail({ name, what, how, why, color }) {
  return (
    <div style={{ 
      border: `1px solid ${color}30`, 
      borderRadius: 8, 
      padding: "14px 16px", 
      background: colors.surface 
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace" }}>{name}</div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: colors.textMuted, fontWeight: 600 }}>What: </span>
        <span style={{ color: colors.textDim }}>{what}</span>
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: colors.textMuted, fontWeight: 600 }}>How: </span>
        <span style={{ color: colors.textDim }}>{how}</span>
      </div>
      <div style={{ fontSize: 12 }}>
        <span style={{ color: colors.textMuted, fontWeight: 600 }}>Why it matters: </span>
        <span style={{ color: colors.textDim }}>{why}</span>
      </div>
    </div>
  );
}

function SessionStep({ time, label, detail }) {
  return (
    <div style={{ 
      display: "flex", 
      gap: "14px",
      padding: "10px 14px",
      background: colors.surface,
      borderRadius: 8,
      border: `1px solid ${colors.border}`
    }}>
      <div style={{ 
        fontSize: 11, color: colors.accent, fontWeight: 700, 
        flexShrink: 0, width: 36, paddingTop: 2,
        fontFamily: "'IBM Plex Mono', monospace"
      }}>{time}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: colors.textDim, lineHeight: 1.6 }}>{detail}</div>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState("rag");

  return (
    <div style={{ 
      background: colors.bg, 
      color: colors.text, 
      minHeight: "100vh",
      fontFamily: "'Inter', -apple-system, sans-serif"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ 
            fontSize: 11, 
            color: colors.accent, 
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.05em"
          }}>
            BRAINTRUST CSA — DOMAIN PRIMER
          </span>
        </div>
        <h1 style={{ 
          fontSize: 24, 
          fontWeight: 700, 
          margin: "0 0 4px 0",
          color: colors.text 
        }}>
          RAG Evaluation & Custom Scorers
        </h1>
        <p style={{ 
          fontSize: 14, 
          color: colors.textDim, 
          margin: "0 0 24px 0",
          lineHeight: 1.5
        }}>
          What a Customer Solutions Architect actually does when helping an ML team build evaluation pipelines
        </p>

        {/* Tabs */}
        <div style={{ 
          display: "flex", 
          gap: "4px", 
          marginBottom: "24px",
          overflowX: "auto",
          borderBottom: `1px solid ${colors.border}`,
          paddingBottom: "0"
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 600 : 400,
                color: activeTab === tab.id ? colors.accent : colors.textMuted,
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                fontFamily: "'Inter', sans-serif",
                marginBottom: "-1px"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "rag" && (
          <div>
            <SectionIntro text="RAG (Retrieval-Augmented Generation) is the most common pattern for building AI features that need to answer questions from a company's own data. Instead of relying on what the LLM was trained on, you retrieve relevant documents from a knowledge base and inject them into the prompt as context. Almost every enterprise AI chatbot, internal search tool, or support bot uses some form of RAG." />
            <RAGDiagram />
            <div style={{ color: colors.textDim, fontSize: 13, lineHeight: 1.7 }}>
              The key insight: RAG has two independent failure points — the retrieval can fail (wrong documents pulled) 
              or the generation can fail (model hallucinates despite having the right context). This is why evaluation 
              is harder than just checking "did the AI get the right answer." You need to diagnose <em>where</em> in 
              the pipeline things went wrong.
            </div>
          </div>
        )}
        {activeTab === "problem" && (
          <div>
            <SectionIntro text="When a RAG application gives a bad answer, the first question is always: was it a retrieval problem or a generation problem? Without structured evaluation, teams end up playing whack-a-mole — tweaking prompts when the real issue is chunking strategy, or rebuilding their vector index when they actually just need a better system prompt." />
            <EvalProblemDiagram />
          </div>
        )}
        {activeTab === "flow" && (
          <div>
            <SectionIntro text="This is the evaluation pipeline you'd help customers build inside Braintrust. It follows a simple pattern — dataset, task, scorers — but the implementation details are where your consulting skills matter. Every customer's RAG architecture is different, and the scorers need to match their specific failure modes." />
            <ArchitectureFlow />
          </div>
        )}
        {activeTab === "scorers" && (
          <div>
            <SectionIntro text="Scorers are the core of the eval system. Braintrust ships built-in scorers (Factuality, ExactMatch, etc.), but enterprise customers almost always need custom ones tailored to their domain. Building these custom scorers is a big part of what the pairing session looks like." />
            <CustomScorersExplainer />
          </div>
        )}
        {activeTab === "code" && (
          <div>
            <SectionIntro text="This is a simplified but realistic example of what the eval code looks like. In a pairing session, you'd be helping the customer adapt this pattern to their specific RAG pipeline, embedding model, and business rules." />
            <CodeExample />
          </div>
        )}
        {activeTab === "session" && (
          <div>
            <SectionIntro text="Here's what that Thursday afternoon pairing session actually looks like, minute by minute. Notice how much of it is discovery and consulting — understanding their system, identifying failure modes, translating business requirements into scoring logic — versus pure coding." />
            <PairingSession />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionIntro({ text }) {
  return (
    <div style={{ 
      color: colors.textDim, 
      fontSize: 13, 
      lineHeight: 1.7, 
      marginBottom: 8,
      paddingBottom: 8,
      borderBottom: `1px solid ${colors.border}`
    }}>
      {text}
    </div>
  );
}
