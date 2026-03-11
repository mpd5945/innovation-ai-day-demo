# Demo Guide — National Grid Operations Center

> **Audience:** Walk-by visitors, booth facilitators, and technical reviewers at Penn State Smeal AI Innovation Day.

---

## ⚡ TL;DR — What Do I Do? (30 seconds)

1. **Pick a sector to defend** from the four facility cards on screen
2. **Watch the screen** — Red AI attacks, Blue AI fights back (you just observe)
3. **When green buttons appear** — click all 4 defense commands in order to help the Blue Agent expel the attacker
4. **Repeat** with a different facility to see a new attack scenario

That's the whole loop. Each run takes about 3–4 minutes.

---

## 🏭 What Is This?

This is a **simulated National Grid Operations Center** demonstrating how AI handles cybersecurity incidents in critical infrastructure — specifically, the power grid.

The dashboard runs against a **live Kubernetes cluster** in the `smeal-day` namespace. When you pick a sector, a real [LitmusChaos](https://litmuschaos.io/) experiment fires inside the cluster, actually degrading the simulated power grid service. You are playing a **Blue Team operator** — your job is to help the AI defender win. Two AI agents battle in real time:

| Agent | Role |
|-------|------|
| 🔴 **Red Agent** (left panel) | Adversary — plans and executes the cyberattack against your sector |
| 🔵 **Blue Agent** (right panel) | Defender — detects the intrusion and proposes countermeasures |
| 📡 **AI Analyst** (bottom) | Situation awareness — correlates telemetry and estimates damage |
| 🏭 **Digital Twin** (center) | 3D model of the facility — turns red/amber when compromised |

All three AI panels stream live from **OpenAI GPT-4o-mini**.

---

## 🗺️ Step-by-Step Walkthrough

### Step 1 — Choose Your Sector to Defend 🛡️
- Four facility cards are shown, each representing a US power grid sector
- Each card shows the **incoming attack technique, expected impact, and estimated financial loss per second**
- Click any card to take responsibility for defending that sector. A **3-2-1 countdown** plays while the Red Agent prepares to attack

> **Facilitator tip:** Ask the visitor "Which sector do you think would be the hardest to defend?" to spark discussion before they click.

---

### Step 2 — Watch the AI Battle 👁️

The screen cycles through these phases automatically. A banner at the top tells you which phase is active and whether to **OBSERVE** or get ready to act.

| Phase | Indicator | What's Happening |
|-------|-----------|------------------|
| **BREACH** | Red banner, matrix rain | Red AI is writing its attack plan via LLM streaming |
| **IMPACT** | "■ ACCESS GRANTED ■" flash | LitmusChaos experiment fires; sector turns red on 3D model |
| **ANALYSIS** | Cyan banner, analyst streaming | GPT-4o-mini generates economic impact + situational brief |
| **DETECT** | Blue banner | Blue AI analyzes telemetry and identifies the attack signature |
| **RESPOND** | Blue banner | Blue AI proposes automated countermeasures |

**You don't click anything during these phases — just watch.**

---

### Step 3 — Help Blue Agent Win ⚡

When the phase banner turns **green** and says **"YOUR TURN"**, four defense command buttons appear below the 3D model.

- The buttons are **locked in sequence** — you must complete Command 1 before Command 2 unlocks
- Each button represents a real SOC defense action (firewall repair, port patching, vulnerability scan, etc.) that the Blue Agent needs human authorization to execute
- A progress bar tracks how much of the adversary's foothold has been cleared
- When all 4 are done: **"🏆 RED AGENT EXPELLED"** — the sector turns green on the 3D model

> **Facilitator tip:** While the visitor is clicking the defense commands, explain: *"In a real SOC, the AI would have already identified these steps and pre-staged the commands. You're the human operator authorizing and executing each one — this is the human-AI teaming model."**

---

### Step 4 — Repeat ✅

After the Red Agent is expelled, the dashboard returns to the facility selection screen. A ✓ **Defended** badge appears on sectors you've already protected. Try all 4 for different attack scenarios.

---

## 💥 The 4 Attack Scenarios

| Facility | Region | Technique | MITRE ID | CVE | Impact | Loss/sec |
|----------|--------|-----------|----------|-----|--------|----------|
| 🏙️ **Northeast Corridor** | Maine → Pennsylvania | Pod Delete | T0816 | CVE-2021-44228 | **Offline** | $194K/sec |
| 🚢 **Southeast Grid** | Virginia → Florida | Network Latency | T0815 | CVE-2019-13557 | Degraded | $117K/sec |
| 🏭 **Central Hub** | Ohio → Missouri | CPU Resource Hog | T0828 | CVE-2022-0847 | Degraded | $97K/sec |
| ☁️ **Western Interconnect** | Colorado → Washington | Network Packet Loss | T0814 | CVE-2020-11896 | **Offline** | $278K/sec |

Each scenario triggers a **different LitmusChaos experiment** (`engine-northeast-pod-delete.yml`, `engine-southeast-network-latency.yml`, etc.) and generates **unique AI narratives** for both agents.

---

## 🎤 Facilitator Talking Points

### Opening (when someone walks up)
> *"You're looking at a simulation of what happens when hackers attack the power grid — and how AI fights back in real time. The twist: at the end, you get to be the one who helps the AI defender win."*

### While Red Agent is streaming
> *"The Red AI isn't just running a script — it's reasoning about which attack vector to use, why this particular sector is vulnerable, and how to avoid detection. That's a large language model acting as an adversary."*

### When ACCESS GRANTED flashes
> *"That chaos experiment just fired inside a real Kubernetes cluster in this room. The API endpoint for that grid sector is now returning errors — watch the 3D model change, and watch the Blue Agent pick that up from telemetry."*

### While Blue Agent responds
> *"The Blue Agent has never seen this exact telemetry before — it's reasoning in real time. It correlates the unusual API latency, the pod restarts, and the network metrics to identify the attack signature. Now it's preparing the defense plan for you to execute."*

### During defense commands
> *"These 4 commands are what a real SOC analyst would run to expel this adversary. The difference in a real incident: the AI would have already staged all of these commands based on its diagnosis — you're just authorizing and executing. That's the human-AI teaming model."*

### Closing
> *"The business question isn't 'can AI replace security analysts?' — it's 'how do we build organizations where AI and human analysts team up like this to win faster than any attacker can move?'"*

---

## 🔧 Running the Demo

### Start the dev server
The VS Code workspace has a task configured. Open VS Code's task runner:
- **Terminal → Run Task → `dev: dashboard (3001)`**
- Or run manually: `cd smeal-chaos-litmus-demo && npm run dev:3001`
- Dashboard opens at **http://localhost:3001**

### Reset mid-demo
- Click the **↺ Reset** button in the top control bar to return to the welcome screen
- All sector attack history is cleared

### If the server crashes
```powershell
# Kill anything on port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess |
  ForEach-Object { Stop-Process -Id $_ -Force }

# Restart via task or:
cd smeal-chaos-litmus-demo
npm run dev:3001
```

### Auto-loop mode (unattended kiosk)
Click **⟳ Auto Loop** to run through all 4 scenarios automatically without any interaction. The demo will loop indefinitely. Click **■ Halt** to stop.

---

## 🤖 The Meta-Story: How I Built This

> **This section is for facilitators.** The most important thing you can say at this booth isn't about chaos engineering — it's about *how this demo exists at all.*

### The Short Version

Every line of code in this dashboard was written with **GitHub Copilot** — not autocomplete, but full conversational development. The same way the Blue Agent uses AI to reason about a cyberattack in real time, I used AI to build this demo in real time.

**That's the actual story of AI Innovation Day.**

---

### What Was Built

| Layer | What Exists |
|-------|-------------|
| **Frontend** | ~2,200-line React/TypeScript dashboard — phases, animations, scoring, terminals, timers |
| **3D Model** | Three.js power grid facility with per-sector color states and post-processing effects |
| **AI Agents** | Three streaming GPT-4o-mini panels (Red, Blue, Analyst) with domain-specific prompting |
| **Gamification** | Phase timer, financial damage ticker, interactive decision checkpoints (triage, escalation, containment), command-typing terminal, letter grades |
| **Scoring** | NIST CSF 2.0 card, Regulatory Exposure Meter (FERC → CISA → SEC 8-K → Congressional), after-action scorecard |
| **Failure gates** | Real-time $15M loss threshold aborts the scenario mid-run |
| **Infrastructure** | Kubernetes microservices, LitmusChaos experiment YAMLs, Docker Compose, Next.js API proxy routes |

All of it was specified in plain English and built in conversation — no pre-existing boilerplate beyond `npx create-next-app`.

---

### How the Build Actually Worked

Each feature started as a sentence:

> *"Add a 3-2-1 countdown before the attack starts."*

> *"When the player types a remediation command, show ghost text in grey that turns green as they type it correctly."*

> *"When cumulative financial damage hits $15 million before the sector is defended, abort the scenario and show a failure screen."*

> *"Add a NIST CSF 2.0 scorecard to the after-action report."*

Copilot handled implementation. I handled intent. The pattern repeated for every feature in this codebase.

---

### The Parallel Worth Saying Out Loud

The Blue Agent in this demo:
- Receives telemetry → reasons about what it means → proposes a response → waits for human authorization

GitHub Copilot during development:
- Receives a description of what I want → reasons about how to implement it → proposes code → waits for me to review

**Same pattern. Different domain.** AI as a reasoning partner; human as the decision-maker.

---

### Facilitator Talking Points — "How I Built This"

**When someone asks "how long did this take?"**
> *"About an afternoon of focused conversation. The entire codebase — 3D model, AI agents, gamification, Kubernetes config, scoring — was built with GitHub Copilot. I described what I wanted, Copilot built it, I refined it. No searching documentation. No copy-pasting boilerplate."*

**When someone asks "did you write any of it?"**
> *"Every decision was mine. What features to build. How the UX should flow. What the scoring model should reward. What happens when you fail. Copilot didn't make any of those choices — it executed them. I was the architect; it was the engineer."*

**When someone says "but isn't that just autocomplete?"**
> *"This wasn't autocomplete. I said: 'Add a regulatory exposure meter that maps to the NIST GOVERN function, with five tiers from internal finding to congressional inquiry, tied to how long the player takes to respond.' Copilot implemented that from scratch. That's not autocomplete — that's a collaborator."*

**When someone asks about the business angle**
> *"A feature that would normally take a senior developer two days took two minutes to specify and five minutes to review. Multiply that across a team. That's the ROI story of AI-assisted development — not replacing engineers, but making every engineer dramatically more productive."*

**When talking to MBA / strategy students specifically**
> *"A consultant's value is their judgment, not their ability to format a PowerPoint. AI handles the formatting. The judgment is still yours. Same thing here — Copilot handles syntax and boilerplate; the architecture and product decisions are still mine. The ratio of high-value work to low-value work just flipped."*

---

## ⚙️ Technical Architecture

```
Browser (localhost:3001)
   │
   ├─ /api/agents/red   → OpenAI GPT-4o-mini (SSE stream)
   ├─ /api/agents/blue  → OpenAI GPT-4o-mini (SSE stream)
   ├─ /api/analyst/stream → OpenAI GPT-4o-mini (SSE stream)
   └─ /api/grid/[sector] → K8s NodePort services
                               NE: 30081
                               SE: 30082
                               CT: 30083
                               WE: 30084

Kubernetes (smeal-day namespace)
   ├─ grid-sector-northeast (Deployment + NodePort)
   ├─ grid-sector-southeast
   ├─ grid-sector-central
   ├─ grid-sector-western
   └─ LitmusChaos experiments (applied via kubectl)
```

### Chaos experiment types
| Experiment | Effect |
|------------|--------|
| `PodDelete` | Terminates the target pod; service goes offline until scheduler restarts it |
| `NetworkLatency` | Injects 2000ms delay into container network via `tc netem` |
| `CPUHog` | Spawns threads that consume all available CPU in the pod |
| `NetworkPacketLoss` | Drops 100% of packets via `tc netem loss 100%` |

### AI agent design
- Each agent receives **live telemetry** (sector health, latency, error rates) as context
- The **scenario knowledge base** (`src/app/lib/agent-knowledge.ts`) pre-seeds each LLM call with realistic MITRE TTPs, CVE details, and sector-specific economic context
- All AI output streams via **Server-Sent Events** so the terminal panels animate in real time

---

## ❓ Common Questions

**Q: Is this a real attack?**
A: It's a real chaos engineering experiment running in Kubernetes, but it only affects the isolated `smeal-day` namespace — not production systems. The LitmusChaos framework is used by Netflix, Intuit, and others for production resilience testing.

**Q: Could this really happen to the power grid?**
A: MITRE ATT&CK for ICS (Industrial Control Systems) documents exactly these attack patterns. The CVEs cited are real vulnerabilities in SCADA/ICS systems. In 2021, a water treatment plant in Florida was attacked via remote access; in 2015/2016, Ukrainian power grids were taken offline by similar techniques.

**Q: Why use AI for defense? Can't you just use rules?**
A: Rules-based systems catch known signatures. AI can correlate across multiple weak signals — slightly elevated latency here, unusual API call patterns there — to catch novel attacks that don't match any existing rule. The AI also generates natural-language reasoning that analysts can audit.

**Q: What's the business angle?**
A: Critical infrastructure attacks cost an average of $4.82M per incident (IBM Cost of a Data Breach 2024). AI-assisted SOCs reduce mean time to detect (MTTD) from ~197 days to under 24 hours, and mean time to respond (MTTR) from weeks to hours.

**Q: What degree programs is this relevant to?**
A: MIS, Supply Chain (infrastructure resilience), Finance (economic modeling of cyber risk), MBA (organizational risk management), and Computer Science / Engineering obviously. The AI-human teaming model is equally relevant to Operations and Strategy.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/app/components/AgentWarRoom.tsx` | Main dashboard — all gamification, phase logic, AI panels |
| `src/app/components/DigitalTwin.tsx` | 3D Three.js power grid model |
| `src/app/lib/agent-knowledge.ts` | Scenario definitions, MITRE TTPs, economic data |
| `src/app/lib/sounds.ts` | Web Audio API sound effects |
| `src/app/api/agents/red/route.ts` | Red Agent SSE endpoint |
| `src/app/api/agents/blue/route.ts` | Blue Agent SSE endpoint |
| `src/app/api/analyst/stream/route.ts` | Analyst brief SSE endpoint |
| `k8s/grid-services.yml` | Kubernetes deployments + NodePort services |
| `k8s/chaos-experiments.yml` | LitmusChaos ChaosExperiment CRDs |
| `k8s/engine-*.yml` | Per-sector ChaosEngine specs |
