# ⚡ AI vs. AI: Defending the Power Grid in Real Time

> **Penn State Smeal AI Innovation Day — Chaos Engineering Booth Demo**
>
> Every line of code in this repository was written in conversation with **GitHub Copilot**.
> The demo shows AI defending critical infrastructure. The demo itself was built by AI.

---

## What This Is

A live, interactive simulation of a **National Grid Operations Center under cyberattack**.

Four grid-sector microservices run in Kubernetes. A Next.js dashboard polls them in real time. When LitmusChaos experiments target a sector, the dashboard visually degrades — green → amber → red — while three streaming AI agents (Red attacker, Blue defender, Analyst) battle in an on-screen war room. You play the human operator: you triage the incident, choose your escalation path, and decide the containment strategy. Your choices affect the outcome and your final NIST CSF score.

| What it is | What it is not |
|---|---|
| Self-contained — runs in a browser, no manual steps | A read-only visualizer |
| Backed by real Kubernetes microservices that degrade | Fake data on a static dashboard |
| Three streaming GPT-4o-mini AI panels reasoning in real time | Pre-scripted text animations |
| A game with a score — you can win or lose | A passive demo you just watch |

---

## Repository Structure

```
.
├── smeal-chaos-litmus-demo/        # Main application (Next.js dashboard + grid microservices)
│   ├── src/app/                    # Next.js App Router — pages, components, API routes
│   ├── grid-service/               # Node.js grid-sector microservice (Docker image)
│   ├── k8s/                        # Kubernetes manifests + LitmusChaos experiment YAMLs
│   ├── README.md                   # Full setup, deployment, and chaos experiment guide
│   ├── SLIDES.md                   # Presenter talking points (slide-by-slide)
│   └── GUIDE.md                    # Booth operator reference
│
├── smeal-day-target-app.yml        # K8s target app deployment (Namespace: smeal-day)
├── smealday-litmus-chaos-enable.yml# LitmusChaos RBAC + service accounts
└── smealday-upgrade-v3.24.0.yml    # LitmusChaos upgrade manifest (v3.24.0)
```

---

## Quick Start

```bash
# 1. Build the grid-sector microservice image
docker build -t grid-sector-service:latest ./smeal-chaos-litmus-demo/grid-service

# 2. Deploy all 4 sectors + RBAC to Kubernetes
kubectl apply -f smeal-day-target-app.yml
kubectl apply -f smealday-litmus-chaos-enable.yml
kubectl apply -f smeal-chaos-litmus-demo/k8s/grid-services.yml

# 3. Start the dashboard (port 3001)
cd smeal-chaos-litmus-demo
docker compose up -d --build

# 4. Open http://localhost:3001
```

Or for local development:

```bash
cd smeal-chaos-litmus-demo
npm install
npm run dev    # http://localhost:3000
```

---

## Demo Flow

1. **Dashboard loads** — four sectors (Northeast, Southeast, Central, Western) pulse green at nominal status
2. **Pick a sector** — a LitmusChaos experiment automatically fires, degrading that sector's microservice
3. **AI war room activates** — Red Agent attacks, Blue Agent defends, Analyst streams telemetry
4. **Three decision points** appear mid-incident (triage level, escalation path, containment strategy)
5. **Scorecard delivered** — NIST CSF 2.0 function scores, Regulatory Exposure Meter (RM-4), financial damage tally
6. **Play again** with a new sector

---

## Tech Stack

| Layer | Technology |
|---|---|
| Dashboard | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS |
| 3D visualization | React Three Fiber, Three.js, PostProcessing |
| AI agents | OpenAI `gpt-4o-mini` streaming via Server-Sent Events |
| Microservices | Node.js 22, zero-dependency, parameterized by `SECTOR_NAME` |
| Container platform | Docker Desktop + Kubernetes |
| Chaos engineering | LitmusChaos 3.x (ChaosCenter + execution plane) |
| CI / packaging | Docker Compose (dashboard), `kubectl apply` (K8s manifests) |

---

## Chaos Experiments

Four experiments target the four sectors in the `smeal-day` namespace:

| Sector | Experiment | Visual Effect |
|---|---|---|
| Northeast | Pod Delete | OFFLINE — sector goes dark |
| Southeast | Network Latency (+2s) | DEGRADED — amber, slow response |
| Central | CPU Hog (2 cores) | DEGRADED — amber, high load |
| Western | Network Loss (100%) | OFFLINE — sector goes dark |

Experiment YAMLs are in [`smeal-chaos-litmus-demo/k8s/`](smeal-chaos-litmus-demo/k8s/).

---

## How This Was Built

The entire stack — ~2,200-line TypeScript/React dashboard, Three.js 3D facility model, streaming GPT-4o-mini agent panels, gamification system, NIST CSF 2.0 scorecard, Kubernetes manifests, and LitmusChaos experiment YAMLs — was built feature by feature through conversational development with **GitHub Copilot** in VS Code.

Each feature was a plain-English description. Copilot handled implementation. The developer handled every architectural decision, UX choice, and product direction call.

This is the **human-AI teaming model** — the same model the Blue Agent inside the demo uses to defend the power grid.

---

## References

- [NIST Cybersecurity Framework 2.0](https://doi.org/10.6028/NIST.CSWP.29)
- [IBM Cost of a Data Breach Report 2024](https://www.ibm.com/reports/data-breach) — $4.82M average total cost
- [MITRE ATT&CK for ICS](https://attack.mitre.org/matrices/ics/)
- [LitmusChaos Documentation](https://docs.litmuschaos.io/)
- [GitHub Copilot](https://github.com/features/copilot)

---

*Built for Penn State Smeal AI Innovation Day · March 2026*
