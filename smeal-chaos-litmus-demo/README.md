# ⚡ National Grid Operations Center — Chaos Engineering Demo

> **Built for Penn State Smeal AI Innovation Day** — and built *with* AI.
> Every line of code in this repository was written in conversation with **GitHub Copilot**.
> The demo shows AI defending critical infrastructure. The demo itself was built by AI.

A reactive Power Grid Control Center demonstrating AI-assisted incident response and chaos engineering. Four grid-sector microservices run in Kubernetes (`smeal-day` namespace) and the Next.js dashboard polls them in real time. When LitmusChaos experiments target a sector, the dashboard **visually degrades** — going from green/nominal → amber/degraded → red/offline — while streaming AI agents (Red attacker, Blue defender, Analyst) battle in real time.

## How This Was Built

The entire stack — ~2,200-line TypeScript/React dashboard, Three.js 3D facility model, streaming GPT-4o-mini agent panels, gamification system, NIST CSF scorecard, Kubernetes manifests, and LitmusChaos experiment YAMLs — was built feature by feature through conversational development with GitHub Copilot in VS Code.

Each feature was a plain-English description. Copilot handled implementation. The developer handled every architectural decision, UX choice, and product direction call.

This is the human-AI teaming model — the same model the Blue Agent inside the demo uses to defend the power grid.

## Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”        â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Next.js Dashboard  â”‚  poll  â”‚  Kubernetes (smeal-day namespace)       â”‚
â”‚  (Docker, :3001)    â”‚â”€â”€â”€â”€â”€â”€â”€â–¶â”‚                                         â”‚
â”‚                     â”‚        â”‚  grid-sector-northeast  (NodePort 30081)â”‚
â”‚  /api/grid/[sector] â”‚        â”‚  grid-sector-southeast  (NodePort 30082)â”‚
â”‚  proxies to K8s     â”‚        â”‚  grid-sector-central    (NodePort 30083)â”‚
â”‚                     â”‚        â”‚  grid-sector-western    (NodePort 30084)â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜        â”‚                                         â”‚
                               â”‚  + LitmusChaos execution plane          â”‚
                               â”‚    (subscriber, chaos-operator, etc.)   â”‚
                               â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

## Quick Start

```bash
# 1. Build the grid-sector microservice image
docker build -t grid-sector-service:latest ./grid-service

# 2. Deploy 4 sectors to Kubernetes
kubectl apply -f k8s/grid-services.yml

# 3. Start the dashboard
docker compose up -d --build

# 4. Open http://localhost:3001
```

## Running Chaos Experiments

Target any `grid-sector-*` deployment in the `smeal-day` namespace:

| Experiment Type | Effect on Dashboard |
|---|---|
| **Pod Delete** | Sector goes OFFLINE (red â†’ dark) |
| **CPU Hog** | Sector shows DEGRADED (amber, high latency) |
| **Network Latency** | Sector shows DEGRADED (slow response) |
| **Pod Network Loss** | Sector goes OFFLINE |

Use label selectors to target specific sectors:
- `grid-sector: northeast`
- `grid-sector: southeast`
- `grid-sector: central`
- `grid-sector: western`

### ChaosCenter (Portal) click-by-click

1. Open the dashboard: `http://localhost:3001`
2. Find the ChaosCenter portal URL:

```powershell
kubectl get svc -n litmus26 litmus26-frontend-service
```

3. Browse to the `NODE_PORT` shown above (either `http://localhost:<NODE_PORT>` or `http://<NODE_IP>:<NODE_PORT>` depending on how you're accessing the cluster).
4. Log in and select your demo project.
5. Go to **Chaos Infrastructures** and confirm your agent is **Active**.
6. Go to **Chaos Experiments** → Kubernetes.
7. Run experiments by targeting these deployments (namespace `smeal-day`):
    - NE: `app=grid-sector-northeast` (Pod Delete)
    - SE: `app=grid-sector-southeast` (Pod Network Latency)
    - CT: `app=grid-sector-central` (Pod CPU Hog)
    - WE: `app=grid-sector-western` (Pod Network Loss)

Recommended for live demos:
- Save each tuned workflow as a template once, then always run the saved template.
- Use **Probe mode = Edge** so the run validates pre/post health without failing mid-injection.

If you want the **Resilience Score to drop** (to match visible degradation):
- Switch the HTTP probe **Mode** to **Continuous**.
- Tighten `probeTimeout` so the probe fails during chaos.
    - Deterministic trick for latency: set `probeTimeout` lower than `NETWORK_LATENCY` (for example `NETWORK_LATENCY=2000ms` with `probeTimeout=1s`).

Recommended tunables (match the demo YAMLs under `k8s/`):
- **Pod Delete (NE)**: `TOTAL_CHAOS_DURATION=60`, `CHAOS_INTERVAL=10`, `FORCE=false`
- **Network Latency (SE)**: `TOTAL_CHAOS_DURATION=90`, `NETWORK_LATENCY=2000`, `NETWORK_INTERFACE=eth0`, `PODS_AFFECTED_PERC=100`
- **CPU Hog (CT)**: `TOTAL_CHAOS_DURATION=120`, `CPU_CORES=2`, `PODS_AFFECTED_PERC=100`
- **Network Loss (WE)**: `TOTAL_CHAOS_DURATION=90`, `NETWORK_PACKET_LOSS_PERCENTAGE=100`, `NETWORK_INTERFACE=eth0`, `PODS_AFFECTED_PERC=100`

### Troubleshooting: Portal runs stuck in "Queued"

If ChaosCenter runs stay queued, check the subscriber logs:

```powershell
kubectl logs -n smeal-day deploy/subscriber --tail 200
```

If you see an error like:

`Workflow.argoproj.io ... is invalid: metadata.labels: Invalid value: "{{workflow.parameters...}}"`

Kubernetes is rejecting the workflow because `metadata.labels` cannot contain templated strings.

Fix once (recommended):
- In ChaosCenter, open the workflow YAML **one time**, remove any `metadata.labels` entries whose values contain `{{ ... }}`, then **Save as a new workflow/template**.
- Always run from your saved workflow/template (no repeated YAML edits).

Fix for all future generated workflows (more involved):
- Add a custom ChaosHub (fork) with the offending labels removed from the upstream workflow template, and point ChaosCenter at your hub.

### Troubleshooting: Network chaos fails to inject (container runtime / socket)

If `pod-network-latency`, `pod-network-loss`, or `pod-cpu-hog` fails immediately with errors about the container runtime (for example `unknown service runtime.v1.RuntimeService`), your cluster runtime/socket settings don't match the experiment defaults.

For Docker Desktop Kubernetes (node runtime shows `docker://...`):
- Use `CONTAINER_RUNTIME=docker`
- Use `SOCKET_PATH=/var/run/docker.sock`

This repo's [k8s/chaos-experiments.yml](k8s/chaos-experiments.yml) and demo engines under [k8s/](k8s/) are already set up for Docker Desktop.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Microservices**: Node.js 22, zero-dependency, parameterized by `SECTOR_NAME` env var
- **Infrastructure**: Docker Desktop Kubernetes, LitmusChaos 2.6
- **Theme**: Control-room dark UI with CRT scan lines, flicker-off & power-on animations