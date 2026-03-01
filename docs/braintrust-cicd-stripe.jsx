import { useState } from "react";

const c = {
  bg: "#faf9f7",
  surface: "#ffffff",
  surfaceAlt: "#f3f1ed",
  border: "#e2dfd8",
  borderStrong: "#c9c4b8",
  accent: "#1a56db",
  accentLight: "#e8eefb",
  stripe: "#635bff",
  stripeLight: "#f0effe",
  braintrust: "#0d9488",
  braintrustLight: "#e6f7f5",
  github: "#24292f",
  githubLight: "#f0f0f0",
  red: "#dc2626",
  redLight: "#fef2f2",
  green: "#16a34a",
  greenLight: "#f0fdf4",
  orange: "#d97706",
  orangeLight: "#fffbeb",
  text: "#1c1917",
  textMid: "#57534e",
  textDim: "#a8a29e",
};

const views = [
  { id: "bigpicture", label: "Big Picture" },
  { id: "devloop", label: "Developer Loop" },
  { id: "cicd", label: "CI/CD Pipeline" },
  { id: "production", label: "Production" },
  { id: "hybrid", label: "Hybrid Infra" },
];

// ---- BIG PICTURE ----
function BigPicture() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Intro text="Imagine Stripe has an AI-powered support assistant that helps merchants troubleshoot payment integration issues. It uses RAG to pull from Stripe's docs, API changelog, and internal knowledge base. Here's how Braintrust fits into the full lifecycle -- from a developer changing a prompt on their laptop to that change running safely in production." />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <PhaseRow
          num="1" color={c.stripe} label="Develop"
          desc="Engineer modifies prompt, chunking strategy, or model selection locally"
          where="Stripe engineer's laptop"
        />
        <Connector />
        <PhaseRow
          num="2" color={c.braintrust} label="Eval Locally"
          desc="Run braintrust eval against golden dataset before committing"
          where="Local terminal → Braintrust SDK → Stripe's data plane"
        />
        <Connector />
        <PhaseRow
          num="3" color={c.github} label="Push & PR"
          desc="Engineer opens a pull request with the change"
          where="GitHub"
        />
        <Connector />
        <PhaseRow
          num="4" color={c.braintrust} label="CI Evals"
          desc="GitHub Action automatically runs full eval suite, posts results on PR, blocks merge if quality regresses"
          where="GitHub Actions → Braintrust SDK → Stripe's data plane"
        />
        <Connector />
        <PhaseRow
          num="5" color={c.green} label="Merge & Deploy"
          desc="PR approved, merged to main, deployed through Stripe's existing deployment pipeline"
          where="Stripe's deploy infrastructure"
        />
        <Connector />
        <PhaseRow
          num="6" color={c.braintrust} label="Production Monitoring"
          desc="Live LLM calls traced and scored in real-time. Failures auto-captured as new eval test cases."
          where="Stripe's app → Braintrust SDK → Stripe's data plane"
        />
        <Connector dashed />
        <PhaseRow
          num="⟲" color={c.orange} label="Feedback Loop"
          desc="Production failures become new rows in the eval dataset, preventing the same bug from recurring"
          where="Braintrust dashboard → dataset → back to step 1"
        />
      </div>

      <Callout color={c.braintrust} title="Where you'd operate as CSA">
        Steps 2, 4, and 6 are where Braintrust lives. Your job would be ensuring the infrastructure 
        underneath those steps is solid -- the data plane is deployed and healthy in Stripe's environment, 
        the SDK is configured to point to it, the GitHub Action has the right credentials and network access, 
        and the production tracing pipeline can handle Stripe's volume. You'd also help their ML team design 
        the eval dataset and scorers in steps 2 and 4.
      </Callout>
    </div>
  );
}

// ---- DEV LOOP ----
function DevLoop() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Intro text="Before anything hits CI/CD, a Stripe engineer is iterating locally. This is the inner development loop -- fast, interactive, and where most of the experimentation happens. Braintrust plugs in here to give the engineer immediate signal on whether their change is an improvement." />

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 40px 1fr",
        gap: "12px",
        alignItems: "start"
      }}>
        {/* Left: What the engineer does */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ColumnHeader color={c.stripe}>Stripe Engineer</ColumnHeader>
          <StepCard color={c.stripe} step="1" title="Edit the prompt">
            Opens <Code>prompts/support_assistant.txt</Code> and changes the system prompt to be 
            more explicit about citing documentation sources in responses.
          </StepCard>
          <StepCard color={c.stripe} step="2" title="Run eval locally">
            <Code>$ braintrust eval evals/support_bot.py</Code>
            <br /><br />
            This runs 200 test cases from their golden dataset against the updated prompt.
            Takes 2-3 minutes. Results stream to terminal AND to Braintrust dashboard.
          </StepCard>
          <StepCard color={c.stripe} step="3" title="Review results">
            Opens the Braintrust experiment link from terminal output. Sees side-by-side 
            comparison with the last experiment. Faithfulness went from 0.72 → 0.84 but 
            3 test cases regressed on completeness.
          </StepCard>
          <StepCard color={c.stripe} step="4" title="Iterate">
            Tweaks the prompt to address the 3 regressions. Re-runs eval. All scores improve.
            Commits and pushes.
          </StepCard>
        </div>

        {/* Middle: arrows */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 50, gap: 60 }}>
          <HArrow />
          <HArrow reverse />
          <HArrow />
        </div>

        {/* Right: What Braintrust does */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ColumnHeader color={c.braintrust}>Braintrust (in Stripe's infra)</ColumnHeader>
          <StepCard color={c.braintrust} step="A" title="SDK executes eval">
            The <Code>braintrust</Code> SDK reads <Code>BRAINTRUST_API_URL</Code> pointing to 
            Stripe's self-hosted data plane. All test case inputs, outputs, and scores flow 
            to Stripe's infrastructure. Nothing leaves their network.
          </StepCard>
          <StepCard color={c.braintrust} step="B" title="Experiment created">
            Each eval run creates a new "experiment" in the Braintrust project. Scores are 
            computed per-test-case and aggregated. Compared automatically against the 
            baseline experiment (last main branch run).
          </StepCard>
          <StepCard color={c.braintrust} step="C" title="Dashboard renders">
            Engineer sees the Braintrust UI via <Code>braintrust.dev</Code> (control plane). 
            The UI fetches data from Stripe's data plane directly via the browser. 
            Braintrust's servers never see the actual prompt/response content.
          </StepCard>
        </div>
      </div>

      <Callout color={c.orange} title="Key detail for your interview">
        Notice the data flow: the engineer's browser talks to braintrust.dev for the UI shell, but 
        all actual experiment data is fetched directly from Stripe's self-hosted data plane. This is 
        the hybrid architecture in action. As CSA, you'd configure the network rules, TLS certs, 
        and CORS policies that make this browser-to-data-plane connection work within Stripe's 
        security posture.
      </Callout>
    </div>
  );
}

// ---- CI/CD ----
function CICDPipeline() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Intro text="This is where Braintrust becomes infrastructure rather than just a dev tool. The eval suite runs automatically on every pull request, just like unit tests. The GitHub Action posts results as a PR comment and can block merges if quality drops." />

      {/* Pipeline visualization */}
      <div style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 20,
        position: "relative"
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.github, marginBottom: 16, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
          .github/workflows/eval.yml
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <PipelineStage color={c.github} icon="①" label="Trigger" items={[
            "Engineer opens PR with prompt change",
            "GitHub Actions workflow triggers on: pull_request"
          ]} />
          <PipelineArrow />
          <PipelineStage color={c.stripe} icon="②" label="Setup" items={[
            "Checkout code",
            "Install deps (braintrust SDK, autoevals, app deps)",
            "Inject BRAINTRUST_API_KEY from GitHub Secrets",
            "Set BRAINTRUST_API_URL to Stripe's data plane endpoint"
          ]} />
          <PipelineArrow />
          <PipelineStage color={c.braintrust} icon="③" label="Run Evals" items={[
            "braintrustdata/eval-action@v1 executes all eval files",
            "Each test case: runs RAG pipeline → applies scorers → streams results",
            "SDK sends everything to Stripe's self-hosted data plane",
            "Proxy caches LLM calls to avoid redundant API spend"
          ]} />
          <PipelineArrow />

          {/* Branch: pass/fail */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <PipelineStage color={c.green} icon="✓" label="Scores Pass Threshold" items={[
              "PR comment posted with score summary + link to Braintrust",
              "Diff shows: Faithfulness +0.12, Relevance +0.03",
              "Merge unblocked",
              "Engineer merges → deploys via normal pipeline"
            ]} />
            <PipelineStage color={c.red} icon="✗" label="Regression Detected" items={[
              "PR comment posted with failing scores highlighted",
              "Diff shows: Completeness -0.15 (4 test cases regressed)",
              "Merge BLOCKED until scores improve",
              "Engineer clicks through to Braintrust to debug specific failures"
            ]} />
          </div>
        </div>
      </div>

      {/* PR Comment mockup */}
      <div style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.textDim, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
          WHAT THE PR COMMENT LOOKS LIKE
        </div>
        <div style={{
          background: c.surfaceAlt,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          padding: 16,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          lineHeight: 1.8
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: c.braintrust, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "white", fontWeight: 700 }}>B</div>
            <span style={{ fontWeight: 700, color: c.text }}>braintrust-bot</span>
            <span style={{ color: c.textDim }}>commented 2 minutes ago</span>
          </div>
          <div style={{ color: c.text }}>
            <strong>Experiment: </strong><span style={{ color: c.accent, textDecoration: "underline" }}>support-bot-v2.4-prompt-citation</span><br />
            <br />
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  <td style={{ padding: "4px 8px", fontWeight: 700, color: c.textMid }}>Scorer</td>
                  <td style={{ padding: "4px 8px", fontWeight: 700, color: c.textMid }}>Baseline</td>
                  <td style={{ padding: "4px 8px", fontWeight: 700, color: c.textMid }}>This PR</td>
                  <td style={{ padding: "4px 8px", fontWeight: 700, color: c.textMid }}>Delta</td>
                </tr>
              </thead>
              <tbody>
                <ScoreRow name="Faithfulness" baseline="0.72" current="0.84" delta="+0.12" good />
                <ScoreRow name="ContextRelevance" baseline="0.81" current="0.84" delta="+0.03" good />
                <ScoreRow name="Correctness" baseline="0.78" current="0.80" delta="+0.02" good />
                <ScoreRow name="HasDisclaimer" baseline="1.00" current="1.00" delta="0.00" neutral />
              </tbody>
            </table>
            <br />
            <span style={{ color: c.green }}>✓ All scores at or above baseline. Safe to merge.</span><br />
            <span style={{ color: c.textDim }}>200 test cases · 47s · </span>
            <span style={{ color: c.accent, textDecoration: "underline" }}>View full results in Braintrust →</span>
          </div>
        </div>
      </div>

      <Callout color={c.braintrust} title="CSA infrastructure concerns here">
        The GitHub Action runner needs network access to Stripe's self-hosted data plane to send eval 
        results. In a typical enterprise setup, this means configuring a self-hosted GitHub Actions runner 
        inside Stripe's VPC, or setting up a VPN/private link between GitHub's hosted runners and Stripe's 
        data plane. You'd also manage the API key rotation and secrets management for the 
        <Code>BRAINTRUST_API_KEY</Code> in GitHub Secrets. This is bread-and-butter infrastructure work for you.
      </Callout>
    </div>
  );
}

// ---- PRODUCTION ----
function Production() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Intro text="Once deployed, Braintrust shifts from eval tool to observability platform. Every LLM call in Stripe's support assistant is traced, logged, and optionally scored in real-time. This is where you catch problems that the eval dataset didn't anticipate." />

      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <PhaseRow num="1" color={c.stripe} label="Merchant asks question"
          desc={`"Why is my webhook returning 401 after I rotated my API keys?"`}
          where="Stripe support chat" />
        <Connector />
        <PhaseRow num="2" color={c.stripe} label="RAG pipeline executes"
          desc="Stripe's app embeds the query, retrieves docs, generates response"
          where="Stripe's backend services" />
        <Connector />

        <div style={{
          background: c.braintrustLight,
          border: `1px solid ${c.braintrust}40`,
          borderRadius: 10,
          padding: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.braintrust, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>
            BRAINTRUST TRACING (INLINE WITH THE REQUEST)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <TraceSpan depth={0} label="support_assistant" duration="1,240ms" color={c.braintrust} />
            <TraceSpan depth={1} label="embed_query" duration="45ms" color={c.stripe} detail="text-embedding-3-small" />
            <TraceSpan depth={1} label="vector_search" duration="32ms" color={c.stripe} detail="top_k=5, pinecone" />
            <TraceSpan depth={1} label="llm_generate" duration="1,080ms" color={c.stripe} detail="gpt-4o, 847 tokens" />
            <TraceSpan depth={1} label="online_scorer: faithfulness" duration="82ms" color={c.braintrust} detail="score: 0.91" />
            <TraceSpan depth={1} label="online_scorer: has_disclaimer" duration="1ms" color={c.braintrust} detail="score: 1.0" />
          </div>
        </div>

        <Connector />
        <PhaseRow num="3" color={c.stripe} label="Response delivered"
          desc="Merchant sees the answer. Trace stored in Stripe's Braintrust data plane."
          where="Stripe support chat" />
      </div>

      <div style={{ marginTop: 8 }} />

      {/* The feedback loop */}
      <div style={{
        background: c.orangeLight,
        border: `1px solid ${c.orange}40`,
        borderRadius: 10,
        padding: 16,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.orange, marginBottom: 10 }}>
          The Feedback Loop — Where Production Feeds Back Into Evals
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <LoopStep num="A" text="Braintrust flags a trace where faithfulness scored 0.31 — the model hallucinated a webhook endpoint that doesn't exist." />
          <LoopStep num="B" text="An engineer clicks 'Add to dataset' in the Braintrust UI. That trace (input + bad output + the correct answer they manually provide) becomes a new row in the golden eval dataset." />
          <LoopStep num="C" text="Next time anyone runs evals (locally or in CI), that test case is included. If a future prompt change would cause the same hallucination, the eval catches it before it ships." />
          <LoopStep num="D" text="Over time, the eval dataset grows organically from real production failures. The test suite gets harder and more representative. The AI gets better." />
        </div>
      </div>

      <Callout color={c.braintrust} title="Production infrastructure is your domain">
        Online scoring (running scorers on live traffic) adds latency to each request. You'd help 
        Stripe decide which scorers to run synchronously (fast deterministic ones like has_disclaimer) 
        versus asynchronously (expensive LLM-judge scorers that can run after the response is sent). 
        You'd also configure alerting thresholds, log retention policies in Brainstore, and ensure the 
        tracing pipeline can handle Stripe's request volume without becoming a bottleneck.
      </Callout>
    </div>
  );
}

// ---- HYBRID INFRA ----
function HybridInfra() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Intro text="This is the infrastructure view -- what's running where, and what talks to what. This is the diagram you'd sketch on a whiteboard during a customer kickoff. It's also the most directly relevant to your role as CSA." />

      <div style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 24,
      }}>
        {/* Two environments side by side */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 0 }}>
          {/* Stripe's environment */}
          <div style={{
            border: `2px solid ${c.stripe}`,
            borderRadius: 10,
            padding: 16,
            background: c.stripeLight,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.stripe, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              STRIPE'S AWS ACCOUNT
            </div>
            <div style={{ fontSize: 10, color: c.textDim, marginBottom: 14 }}>VPC — us-east-1</div>

            <InfraBox label="Braintrust Data Plane" color={c.braintrust} items={[
              "API Server (ECS/EKS)",
              "Brainstore (logs + traces)",
              "Object Storage (S3)",
              "Redis (caching)",
            ]} />
            <InfraArrow label="writes to" />
            <InfraBox label="Stripe's Infra" color={c.stripe} items={[
              "Support Assistant App",
              "RAG Pipeline Services",
              "Vector DB (Pinecone/pgvector)",
              "LLM API Keys (Vault/Secrets Mgr)",
            ]} />
            <InfraArrow label="runs in" />
            <InfraBox label="CI/CD" color={c.github} items={[
              "Self-hosted GH Actions runners",
              "Braintrust eval action",
              "Deploy pipeline (existing)",
            ]} />
          </div>

          {/* Connection arrows */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ writingMode: "vertical-lr", fontSize: 9, color: c.textDim, letterSpacing: "0.05em" }}>HTTPS</div>
            <div style={{ fontSize: 16, color: c.borderStrong }}>⇄</div>
            <div style={{ writingMode: "vertical-lr", fontSize: 9, color: c.textDim, letterSpacing: "0.05em" }}>mTLS</div>
          </div>

          {/* Braintrust's environment */}
          <div style={{
            border: `2px solid ${c.braintrust}`,
            borderRadius: 10,
            padding: 16,
            background: c.braintrustLight,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.braintrust, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              BRAINTRUST CLOUD
            </div>
            <div style={{ fontSize: 10, color: c.textDim, marginBottom: 14 }}>Managed by Braintrust</div>

            <InfraBox label="Control Plane" color={c.braintrust} items={[
              "Web UI (braintrust.dev)",
              "Auth / SSO (Okta, Google)",
              "Org metadata & settings",
              "Billing",
            ]} />

            <div style={{
              marginTop: 16,
              padding: 12,
              background: "white",
              borderRadius: 8,
              border: `1px dashed ${c.braintrust}60`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.braintrust, marginBottom: 6 }}>Data Flow</div>
              <div style={{ fontSize: 11, color: c.textMid, lineHeight: 1.6 }}>
                The UI shell loads from Braintrust cloud. When an engineer views experiment results, 
                their browser makes authenticated requests directly to Stripe's data plane to fetch 
                the actual data. Braintrust's servers never see experiment content, prompts, or model outputs.
              </div>
            </div>

            <div style={{
              marginTop: 12,
              padding: 12,
              background: "white",
              borderRadius: 8,
              border: `1px dashed ${c.braintrust}60`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: c.braintrust, marginBottom: 6 }}>SDK Communication</div>
              <div style={{ fontSize: 11, color: c.textMid, lineHeight: 1.6 }}>
                Can be configured so the SDK only talks to Stripe's data plane. The data plane 
                proxies any necessary metadata requests to the control plane. Zero direct 
                outbound from SDK to Braintrust cloud.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What you'd actually deploy */}
      <div style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: 10,
        padding: 20,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 14 }}>
          What you'd actually set up during a customer deployment
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <TaskCard title="Terraform" items={[
            "Provision VPC subnets for data plane",
            "EKS cluster or ECS services",
            "S3 buckets for object storage",
            "IAM roles and policies",
            "CloudWatch/Prometheus monitoring",
          ]} />
          <TaskCard title="Kubernetes / Containers" items={[
            "Deploy Braintrust data plane pods",
            "Configure resource limits and HPA",
            "Set up ingress with TLS termination",
            "Network policies for pod isolation",
            "Helm chart customization",
          ]} />
          <TaskCard title="Networking & Security" items={[
            "DNS records for data plane endpoint",
            "TLS certificates (ACM or Vault PKI)",
            "CORS config for browser → data plane",
            "Firewall rules / security groups",
            "VPN or PrivateLink for GH Actions",
          ]} />
          <TaskCard title="Identity & Access" items={[
            "SSO integration (Okta/Google)",
            "RBAC configuration in Braintrust",
            "API key provisioning and rotation",
            "Service tokens for CI/CD",
            "Audit logging setup",
          ]} />
        </div>
      </div>

      <Callout color={c.accent} title="This is your wheelhouse">
        Every single item in those four boxes is something you've done before -- at HashiCorp (Vault on K8s, 
        PKI infrastructure, Terraform IaC patterns), at Canoo (AWS landing zones, SSO architecture), and at 
        Slalom (EKS platform builds, production launches, cloud governance). The product is different. The 
        infrastructure work is nearly identical.
      </Callout>
    </div>
  );
}

// ---- Shared Components ----

function Intro({ text }) {
  return (
    <div style={{
      fontSize: 13, color: c.textMid, lineHeight: 1.7,
      borderBottom: `1px solid ${c.border}`, paddingBottom: 14, marginBottom: 4
    }}>
      {text}
    </div>
  );
}

function PhaseRow({ num, color, label, desc, where }) {
  return (
    <div style={{
      display: "flex", gap: 14, alignItems: "flex-start",
      padding: "12px 16px",
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderRadius: 8,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: `${color}12`, color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, fontWeight: 700, flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
        <div style={{ fontSize: 12, color: c.textMid, lineHeight: 1.5, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{
        fontSize: 10, color: c.textDim,
        background: c.surfaceAlt, borderRadius: 4,
        padding: "4px 8px", whiteSpace: "nowrap", flexShrink: 0, alignSelf: "center",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{where}</div>
    </div>
  );
}

function Connector({ dashed }) {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 1, height: 12,
        borderLeft: `2px ${dashed ? "dashed" : "solid"} ${c.borderStrong}`,
      }} />
    </div>
  );
}

function ColumnHeader({ color, children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color,
      padding: "8px 12px", borderRadius: 6,
      background: `${color}10`,
      fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.02em",
      textAlign: "center",
    }}>{children}</div>
  );
}

function StepCard({ color, step, title, children }) {
  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: "10px 14px",
      background: c.surface,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{step}.</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{title}</span>
      </div>
      <div style={{ fontSize: 11, color: c.textMid, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function HArrow({ reverse }) {
  return (
    <div style={{ color: c.borderStrong, fontSize: 18 }}>{reverse ? "←" : "→"}</div>
  );
}

function Code({ children }) {
  return (
    <code style={{
      background: c.surfaceAlt,
      border: `1px solid ${c.border}`,
      borderRadius: 3,
      padding: "1px 5px",
      fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace",
      color: c.text,
    }}>{children}</code>
  );
}

function PipelineStage({ color, icon, label, items }) {
  return (
    <div style={{
      border: `1px solid ${color}30`,
      borderRadius: 8,
      padding: "10px 14px",
      background: `${color}06`,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map((item, i) => (
          <div key={i} style={{ fontSize: 11, color: c.textMid, lineHeight: 1.5, paddingLeft: 4 }}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineArrow() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
      <div style={{ width: 1, height: 10, borderLeft: `2px solid ${c.borderStrong}` }} />
    </div>
  );
}

function ScoreRow({ name, baseline, current, delta, good, neutral }) {
  return (
    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
      <td style={{ padding: "4px 8px", color: c.text }}>{name}</td>
      <td style={{ padding: "4px 8px", color: c.textDim }}>{baseline}</td>
      <td style={{ padding: "4px 8px", color: c.text, fontWeight: 600 }}>{current}</td>
      <td style={{
        padding: "4px 8px", fontWeight: 600,
        color: neutral ? c.textDim : good ? c.green : c.red
      }}>{delta}</td>
    </tr>
  );
}

function TraceSpan({ depth, label, duration, color, detail }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginLeft: depth * 24,
      padding: "6px 10px",
      background: "white",
      borderRadius: 6,
      border: `1px solid ${c.border}`,
      fontSize: 11,
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: 2,
        background: color, flexShrink: 0
      }} />
      <span style={{ color: c.text, fontWeight: 600 }}>{label}</span>
      {detail && <span style={{ color: c.textDim }}>({detail})</span>}
      <span style={{ marginLeft: "auto", color: c.textDim, flexShrink: 0 }}>{duration}</span>
    </div>
  );
}

function LoopStep({ num, text }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: `${c.orange}20`, color: c.orange,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, flexShrink: 0,
        fontFamily: "'JetBrains Mono', monospace",
      }}>{num}</div>
      <div style={{ fontSize: 12, color: c.textMid, lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function InfraBox({ label, color, items }) {
  return (
    <div style={{
      border: `1px solid ${color}40`,
      borderRadius: 8,
      padding: "10px 12px",
      background: "white",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
        {label}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 10, color: c.textMid, lineHeight: 1.6, paddingLeft: 2 }}>
          {item}
        </div>
      ))}
    </div>
  );
}

function InfraArrow({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 0" }}>
      <div style={{ height: 1, flex: 1, borderTop: `1px dashed ${c.borderStrong}` }} />
      <span style={{ fontSize: 9, color: c.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
      <div style={{ height: 1, flex: 1, borderTop: `1px dashed ${c.borderStrong}` }} />
    </div>
  );
}

function TaskCard({ title, items }) {
  return (
    <div style={{
      border: `1px solid ${c.border}`,
      borderRadius: 8,
      padding: "12px 14px",
      background: c.surfaceAlt,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.text, marginBottom: 8 }}>{title}</div>
      {items.map((item, i) => (
        <div key={i} style={{ fontSize: 11, color: c.textMid, lineHeight: 1.7 }}>
          {item}
        </div>
      ))}
    </div>
  );
}

function Callout({ color, title, children }) {
  return (
    <div style={{
      borderLeft: `3px solid ${color}`,
      background: c.surface,
      border: `1px solid ${c.border}`,
      borderLeftColor: color,
      borderLeftWidth: 3,
      borderRadius: 8,
      padding: "14px 16px",
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: c.textMid, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ---- Main App ----
export default function App() {
  const [view, setView] = useState("bigpicture");

  return (
    <div style={{ background: c.bg, minHeight: "100vh", fontFamily: "'Söhne', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{
            fontSize: 10, color: c.braintrust,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700, letterSpacing: "0.08em",
          }}>BRAINTRUST × CI/CD INTEGRATION</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: "0 0 2px 0" }}>
          How Stripe Would Use Braintrust
        </h1>
        <p style={{ fontSize: 13, color: c.textMid, margin: "0 0 24px 0" }}>
          End-to-end: from prompt change to production monitoring
        </p>

        {/* Nav */}
        <div style={{
          display: "flex", gap: 2, marginBottom: 24,
          borderBottom: `1px solid ${c.border}`,
        }}>
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              style={{
                padding: "8px 16px",
                fontSize: 12, fontWeight: view === v.id ? 700 : 400,
                color: view === v.id ? c.accent : c.textDim,
                background: "transparent",
                border: "none",
                borderBottom: view === v.id ? `2px solid ${c.accent}` : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
                fontFamily: "inherit",
              }}
            >{v.label}</button>
          ))}
        </div>

        {/* Content */}
        {view === "bigpicture" && <BigPicture />}
        {view === "devloop" && <DevLoop />}
        {view === "cicd" && <CICDPipeline />}
        {view === "production" && <Production />}
        {view === "hybrid" && <HybridInfra />}
      </div>
    </div>
  );
}
