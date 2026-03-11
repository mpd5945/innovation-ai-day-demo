---
# Smeal AI Day — National Grid Operations Center Demo

> Format: 1 top-level heading per slide.
> Presenter tip: keep the demo page open on `http://localhost:3001` before the audience arrives.
> The demo is fully self-contained — no ChaosCenter portal, no manual experiment firing. A visitor picks a sector and everything runs automatically.

# Title

**AI vs. AI: Defending the Power Grid in Real Time**
Penn State Smeal AI Innovation Day

- Two AI agents battle over control of a national power grid
- You play the human operator who decides the outcome
- The entire demo was built by AI — that's the second story

# Why the Power Grid

The electrical grid is "software + networks + physics + people":
- Cascading failures are real — 2003 Northeast blackout, 2021 Texas grid collapse
- Reliability is a **public expectation**, not a backend metric
- Four regional sectors coordinate in near-real-time, 24/7/365

If the grid goes down, hospitals lose power in minutes. Water treatment stops. Supply chains halt.

**It's the highest-stakes software system most people never think about.**

# What Chaos Engineering Is (In One Sentence)

**A controlled experiment**: inject a bounded fault and measure whether the system stays safe, observable, and recoverable.

Used by Netflix, Google, Amazon — and increasingly by energy, finance, and healthcare operators.

> Chaos engineering is not "breaking things for fun."
> It's drilling for failures before they're real — the way fire departments run drills.

# What This Demo Is

A **live, interactive simulation** of a National Grid Operations Center under cyberattack.

| What it is | What it is not |
|------------|----------------|
| Self-contained — runs in a browser, no manual steps | A read-only visualizer |
| Backed by real Kubernetes microservices that degrade | Fake data on a static dashboard |
| Three streaming GPT-4o-mini AI panels reasoning in real time | Pre-scripted text animations |
| A game with a score — you can win or lose | A passive demo you just watch |

**You are the human operator. The AI needs you.**

# Architecture at a Glance

```
┌──────────────────────────────────────────────────────┐
│  Next.js Dashboard  (localhost:3001)                  │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  3D Facility │  │  Red Agent   │  │ Blue Agent │  │
│  │  Model       │  │  (attacker)  │  │ (defender) │  │
│  │  Three.js    │  │  GPT-4o-mini │  │ GPT-4o-mini│  │
│  └──────────────┘  └──────────────┘  └────────────┘  │
│         │                   │               │         │
│         │         ┌─────────────────┐       │         │
│         │         │ AI Analyst      │       │         │
│         │         │ GPT-4o-mini     │       │         │
│         │         └─────────────────┘       │         │
│         │                                   │         │
│    /api/grid/[sector]  (K8s NodePort proxy) │         │
└──────────────────┬────────────────────────────────────┘
                   │
     ┌─────────────┴─────────────────┐
     │  Kubernetes  (smeal-day ns)   │
     │  NE (30081) · SE (30082)      │
     │  CT (30083) · W  (30084)      │
     │                               │
     │  LitmusChaos injects here     │
     │  (fired automatically by      │
     │   the dashboard phase engine) │
     └───────────────────────────────┘
```

# How This Demo Was Built

**The demo you're watching was also built by AI.**

Every line of code — the 3D model, streaming AI agents, gamification, scoring system, Kubernetes config — was written in conversation with **GitHub Copilot** inside VS Code.

- ~2,200 lines of TypeScript/React
- Built feature by feature in plain English
- No pre-written boilerplate beyond `npx create-next-app`

# The Build Process

Each feature was a plain-English sentence:

> *"Add a real-time financial damage counter. If it hits $15M before the sector is defended, abort the run and show a failure screen."*

> *"Add a NIST CSF 2.0 scorecard to the after-action report."*

> *"When the player types a remediation command, show the expected command in grey ghost text that turns green as they type correctly."*

Copilot handled implementation. I handled intent.

# The Actual Point

The Blue Agent in this demo:
- Receives telemetry → reasons about it → proposes a response → waits for human authorization

GitHub Copilot during development:
- Receives a description → reasons about it → proposes code → waits for review

**Same pattern. Different domain.**

AI Innovation Day isn't just about AI in products — it's about AI in how we *build* products.

# What Didn't Change

**Every decision was still human:**
- Which features to build
- How the user experience should flow
- What the scoring model should reward
- What failure looks like
- What story to tell at this booth

Copilot accelerated execution of intent. It did not supply intent.

**The judgment layer is still the human layer.**

# The Demo Flow — 8 Phases

The dashboard sequences through these phases automatically when a sector is selected.

| # | Phase | Who's Acting | What You See |
|---|-------|-------------|--------------|
| 1 | **Choose Sector** | Visitor | 4 sector cards with attack preview and loss/sec |
| 2 | **Breach Countdown** | System | 3-2-1 countdown, matrix rain, Red Agent primes |
| 3 | **Red Agent Attacks** | Red AI | Streaming attack narrative, 3D model turns red |
| 4 | **Analyst Brief** | Analyst AI | Economic impact, situational brief — triage + escalation decisions |
| 5 | **Blue Detects** | Blue AI | Correlation analysis, attack signature identified |
| 6 | **Blue Responds** | Blue AI | Countermeasure plan proposed, waiting for operator |
| 7 | **Human Operator** | **You** | Type 4 remediation commands in a live terminal (containment decision after step 1) |
| 8 | **Outcome** | System | After-action scorecard (win) or failure screen (loss) |

> **The $15M threshold:** If cumulative financial damage exceeds $15M before you finish — the scenario aborts. Failure is real.

# Phase 1 — Choose Your Sector

Four sector cards appear, each showing region, attack technique, projected impact, and loss per second.

| Sector | Region | Technique | Loss/sec |
|--------|--------|-----------|----------|
| 🏙️ New England Grid | ME · NH · VT · MA · RI · CT | T0816 · Pod Delete | $194K/sec |
| 🌴 Southeast Grid | VA · NC · SC · GA · FL | T0815 · Net Latency | $117K/sec |
| 🏭 Central Hub | OH · IN · IL · MI · WI | T0828 · CPU Hog | $97K/sec |
| ⚡ Western Interconnect | CO · UT · NV · CA · OR · WA | T0814 · Net Loss | $278K/sec |

> *"Which one would you defend first — the fastest-burning one, or the one you understand best?"*

# Phase 2 — Breach Countdown

After a sector is selected, a **3-2-1 countdown** plays:
- Matrix rain overlays the screen
- The Red Agent is "pre-positioning"
- A real LitmusChaos experiment is about to fire inside Kubernetes

> This is the moment before a real incident. Everything is still nominal. The clock is already running.

# Phase 3 — Red Agent Attacks

The **Red Agent** (left panel) streams its attack plan live from GPT-4o-mini.

It reasons about:
- Which CVE to exploit for this specific sector
- How to move laterally without triggering standard alerts
- What the economic damage window looks like

Simultaneously: the **LitmusChaos experiment fires** in the `smeal-day` K8s namespace, the 3D facility model turns red, and the **financial damage ticker** starts counting in real time.

> *"The Red AI isn't running a script. It's reasoning about this specific attack, right now."*

# Phase 4 — Analyst Brief + Triage Decision

The **AI Analyst** streams a situational brief:
- Correlates telemetry: pod restarts, API latency, error rates
- Estimates economic exposure and blast radius

**Then two decisions appear:**
1. **Triage** — choose the correct initial response.
2. **Escalation priority** — decide where to allocate limited bandwidth before the Blue Agent deploys.

Each wrong choice adds a time penalty and dinges your final score.

> Sub-optimal triage adds a **time penalty** and reduces your final score.
> The AI can identify the right answer. The human has to authorize it.

# Phase 5 — Blue Agent Detects

The **Blue Agent** (right panel) begins correlation analysis:
- Cross-references the analyst brief with known MITRE ICS TTPs
- Identifies the attack signature from partial telemetry
- Produces a confidence assessment

> *"The Blue Agent has never seen this exact telemetry before. It's reasoning in real time — not pattern-matching against a rulebook."*

# Phase 6 — Blue Agent Responds

The Blue Agent proposes its countermeasure plan:
- Specific remediation actions tailored to the detected technique
- Each action is staged and ready to execute
- **It cannot execute without human authorization**

> This is the human-AI teaming model:
> AI provides speed, breadth, and pattern recognition.
> Human provides authorization, judgment, and accountability.

# Phase 7 — Human Operator: Your Turn

Four **remediation commands** appear in sequence on a live terminal — after the first command completes, a **containment strategy** decision modal pops up.

- Expected command appears as **grey ghost text**
- You type it character by character — text turns **green** as you match
- A mistake turns the text **red** until corrected
- Commands are **locked in sequence** — each one must complete before the next unlocks
- The **financial damage ticker is still running** while you type

> *"In a real SOC, the AI pre-stages these commands based on its diagnosis. You're the operator authorizing and executing them. Speed matters — every second costs money."*

# Phase 8 — Outcomes

### Win: After-Action Scorecard

| Metric | What It Measures |
|--------|-----------------|
| **Letter Grade** (A → F) | Response time + triage quality |
| **Total Attack Time** | Seconds from breach to expulsion |
| **Financial Damage** | Cumulative loss during the run |
| **NIST CSF 2.0** | Which framework functions you demonstrated |
| **Regulatory Exposure** | FERC → CISA → SEC 8-K → Congressional |

### Lose: Critical Failure Screen

If damage exceeds **$15M** mid-run — the scenario aborts immediately. Grade: **F**.

> *"Can your organization respond faster than the attacker can do damage?"*

# The Scoring System

**Grade = 100 pts − time penalty − triage penalty**

| Factor | Effect |
|--------|--------|
| Time < 45s | 100 pts (no penalty) |
| Each second after 45s | −0.65 pts/sec |
| Sub-optimal triage choice | −20 pts |
| Damage hits $15M | Grade F, scenario aborted |

**Regulatory Exposure Meter** maps to the NIST CSF GOVERN function. Slow or poor response drives toward SEC 8-K mandatory disclosure and Congressional inquiry territory.

# Discussion Prompts

For the audience after a run:

- *"Your grade was a B. What would you have done differently?"*
- *"The AI identified the right triage option. Did you agree with it? Why or why not?"*
- *"The damage counter never stopped. What's the real-world equivalent of your response time?"*
- *"If the AI can detect and stage the countermeasures — what exactly is the human doing in this loop?"*
- *"You needed to authorize 4 commands. In a real incident at 3am, how confident are you in those decisions?"*

# Takeaways

- Critical infrastructure resilience is **measurable** — you just scored it
- AI can reason about novel attacks, but **cannot act without human authorization**
- Speed is a business metric — every second of your response time was priced in real time
- The same teaming model that defends the grid also builds the tools used to defend it
- The question isn't whether AI is involved — it's whether *you* are equipped to work with it

# The Bigger Picture

This booth has two demos running simultaneously:

1. **The product demo** — AI agents defending a power grid against a live cyberattack, scored in real time
2. **The build demo** — the entire product was created by a human working with AI, feature by feature

The question for Smeal students isn't *"will AI take my job?"*

It's: *"Am I the kind of person who uses AI to build things that didn't exist before?"*

# End

Questions?

# Backup Slide — One-Line Definitions

- **Chaos engineering:** deliberately inject a bounded fault to prove (or disprove) a resilience hypothesis
- **MITRE ATT&CK for ICS:** catalog of real-world attack techniques against industrial control systems
- **LitmusChaos:** open-source chaos engineering framework used by Netflix, Intuit, and others
- **NIST CSF 2.0:** cybersecurity framework with 6 functions: Govern, Identify, Protect, Detect, Respond, Recover
- **Blast radius:** how much is affected — isolated here to a single K8s namespace, single sector
- **MTTR:** Mean Time To Respond — your score is essentially a graded MTTR
- **Degraded vs Offline:** slow response vs no response — the dashboard and scoring treat them differently
- **Human-in-the-loop:** AI proposes, human authorizes — the pattern in both this demo and the build process

