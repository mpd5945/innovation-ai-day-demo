"use client";

/**
 * AgentWarRoom.tsx — Plan A "Cinematic Takeover"
 * ─────────────────────────────────────────────────────────────────────────────
 * One full-screen scene per phase. No persistent multi-column layout.
 * 3-dot progress: 🔴 ATTACK → 🔵 DEFEND → 🟢 RESTORE
 */

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  resumeAudio,
  playRedAlert,
  playAlarm,
  playBlueActivate,
  playRecovery,
  playLoopStart,
  playTargetSelect,
  playCountdownTick,
  playFixAction,
  playAllFixed,
} from "../lib/sounds";

const FacilityViewer = dynamic(() => import("./FacilityModel"), { ssr: false });

/* ─── Types ─────────────────────────────────────────────────────────────── */

type SectorStatus = "nominal" | "degraded" | "offline" | "unknown";

type LoopPhase =
  | "idle"
  | "awaiting-target"
  | "countdown"
  | "red-planning"
  | "red-deploying"
  | "chaos-active"
  | "analyst-briefing"
  | "blue-detecting"
  | "blue-remediating"
  | "awaiting-fix"
  | "recovering"
  | "critical-failure"
  | "paused";

interface ScenarioMeta {
  id: string;
  name: string;
  cve: string;
  targetSector: string;
  sectorLabel: string;
  sectorAbbr: string;
  impact: string;
  duration: number;
  analystBrief?: string;
}

type SectorTargetId = "northeast" | "southeast" | "central" | "western";

interface RemediationStep {
  id: string;
  label: string;
  description: string;
  icon: string;
  durationMs: number;
}

export interface AgentWarRoomProps {
  sectorStatuses: Record<string, SectorStatus>;
  sectorMetrics?: Record<string, Record<string, number>>;
  onChaosStateChange?: (sector: string, status: SectorStatus) => void;
  onLoopInit?: (sectors: readonly string[]) => void;
  onLoopStop?: () => void;
}

/* ─── Data ──────────────────────────────────────────────────────────────── */

const SECTOR_TARGETS: {
  id: SectorTargetId;
  label: string;
  abbr: string;
  region: string;
  icon: string;
  companies: string[];
  lossPerSec: string;
  technique: string;
  impact: string;
  color: string;
}[] = [
  { id: "northeast", label: "New England Grid", abbr: "NE", region: "ME · NH · VT · MA · RI · CT", icon: "🏙️", companies: ["Fidelity", "Raytheon", "Mass General"], lossPerSec: "$194K/sec", technique: "T0816 · Pod Delete", impact: "offline", color: "text-blue-400" },
  { id: "southeast", label: "Southeast Grid", abbr: "SE", region: "VA · NC · SC · GA · FL", icon: "🌴", companies: ["Port of Savannah", "Miami Int'l"], lossPerSec: "$117K/sec", technique: "T0815 · Net Latency", impact: "degraded", color: "text-emerald-400" },
  { id: "central", label: "Central Hub", abbr: "CT", region: "OH · IN · IL · MI · WI", icon: "🏭", companies: ["Ford", "GM", "Dow Chemical"], lossPerSec: "$97K/sec", technique: "T0828 · CPU Hog", impact: "degraded", color: "text-amber-400" },
  { id: "western", label: "Western Interconnect", abbr: "W", region: "CO · UT · NV · CA · OR · WA", icon: "⚡", companies: ["AWS", "Google Cloud", "Azure"], lossPerSec: "$278K/sec", technique: "T0814 · Net Loss", impact: "offline", color: "text-purple-400" },
];

const REMEDIATION_STEPS: Record<SectorTargetId, RemediationStep[]> = {
  northeast: [
    { id: "ne-1", label: "Isolate Compromised Pods", description: "kubectl cordon affected node, drain workloads to healthy replicas", icon: "🔒", durationMs: 1800 },
    { id: "ne-2", label: "Rotate Credentials", description: "Revoke service-account tokens, issue fresh TLS certs via cert-manager", icon: "🔑", durationMs: 2200 },
    { id: "ne-3", label: "Restore from Snapshot", description: "Roll back StatefulSet to last-known-good revision, verify data integrity", icon: "💾", durationMs: 2500 },
    { id: "ne-4", label: "Validate & Uncordon", description: "Run smoke tests, confirm telemetry, uncordon node to accept traffic", icon: "✅", durationMs: 1500 },
  ],
  southeast: [
    { id: "se-1", label: "Enable Traffic Shaping", description: "Apply Istio rate-limit VirtualService to cap inbound packet rate", icon: "🌐", durationMs: 1500 },
    { id: "se-2", label: "Flush Stale Caches", description: "Purge DNS and connection-pool caches that hold poisoned routes", icon: "🗑️", durationMs: 1800 },
    { id: "se-3", label: "Patch Network Policy", description: "Deploy updated NetworkPolicy CRD blocking lateral movement", icon: "🛡️", durationMs: 2000 },
    { id: "se-4", label: "Verify Latency Baseline", description: "Run iperf3 mesh check, confirm p99 < 50 ms across all pods", icon: "📊", durationMs: 1500 },
  ],
  central: [
    { id: "ct-1", label: "Kill Rogue Processes", description: "Identify crypto-miner PID via top, send SIGKILL and remove binary", icon: "☠️", durationMs: 1200 },
    { id: "ct-2", label: "Apply Resource Limits", description: "Set CPU/memory LimitRange on namespace to prevent future exhaustion", icon: "📏", durationMs: 1800 },
    { id: "ct-3", label: "Redeploy Clean Image", description: "Pull verified image digest from registry, rolling-update deployment", icon: "🐳", durationMs: 2200 },
    { id: "ct-4", label: "Engage Monitoring Alert", description: "Create Prometheus alert rule for sustained CPU > 80% on any pod", icon: "🔔", durationMs: 1500 },
  ],
  western: [
    { id: "we-1", label: "Activate Backup Link", description: "Failover to secondary ISP via BGP community string update", icon: "🔌", durationMs: 2000 },
    { id: "we-2", label: "Blackhole Attack Source", description: "Push RTBH route for attacker prefix to upstream provider", icon: "🕳️", durationMs: 1800 },
    { id: "we-3", label: "Re-converge OSPF", description: "Clear OSPF adjacency, force SPF recalculation on all routers", icon: "🔄", durationMs: 2500 },
    { id: "we-4", label: "Confirm Full Mesh", description: "Validate end-to-end reachability across all four grid sectors", icon: "✅", durationMs: 1500 },
  ],
};

/* ─── Per-step commands the user must type ──────────────────────────────── */

const REMEDIATION_COMMANDS: Record<SectorTargetId, string[]> = {
  northeast: [
    "kubectl cordon node-ne-01",
    "kubectl delete secret sa-token-ne",
    "kubectl rollout undo statefulset/grid-ne",
    "kubectl uncordon node-ne-01",
  ],
  southeast: [
    "istioctl apply ratelimit se-grid",
    "kubectl exec dns-flush -- purge-cache",
    "kubectl apply -f netpol-se-block.yaml",
    "iperf3 --mesh-check se-grid",
  ],
  central: [
    "kubectl exec grid-ct -- kill -9 $(pgrep miner)",
    "kubectl apply -f limitrange-ct.yaml",
    "kubectl rollout restart deploy/grid-ct",
    "kubectl apply -f prom-cpu-alert.yaml",
  ],
  western: [
    "bgp failover --isp secondary --sector we",
    "ip route blackhole 10.66.0.0/16",
    "ospf clear adjacency --sector we",
    "netcheck --full-mesh --all-sectors",
  ],
};

/* ─── Per-sector verbose chaos context ──────────────────────────────────── */

const SECTOR_CHAOS_CONTEXT: Record<SectorTargetId, string> = {
  northeast:
    "LitmusChaos is executing a pod-delete experiment against the New England Grid microservice. The Kubernetes pod serving grid telemetry for MA/CT/RI/VT/NH/ME is being forcibly terminated — Fidelity, Raytheon, and Mass General lose grid connectivity. Financial losses accrue at $194K/second.",
  southeast:
    "LitmusChaos is injecting 500ms+ network latency into the Southeast Grid microservice. Packets to/from VA through FL are severely delayed — Port of Savannah logistics and Miami Int'l Airport systems are degrading beyond acceptable thresholds.",
  central:
    "LitmusChaos is deploying a CPU stress experiment against the Central Hub. A rogue process is consuming all available CPU on the pod serving OH/IN/IL/MI/WI — Ford, GM, and Dow Chemical manufacturing systems are experiencing severe degraded performance.",
  western:
    "LitmusChaos is inducing 80%+ packet loss on the Western Interconnect. Network packets to/from CO through WA are being dropped — AWS, Google Cloud, and Azure West facilities are losing grid telemetry. The sector will go fully OFFLINE.",
};

/* ─── Triage decisions (one correct, two sub-optimal with time penalty) ── */

interface TriageOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  optimal: boolean;
  penaltySec: number;
}

const TRIAGE_DECISIONS: Record<
  SectorTargetId,
  { prompt: string; options: TriageOption[] }
> = {
  northeast: {
    prompt:
      "New England Grid pods are being deleted. Fidelity, Raytheon, and Mass General are losing connectivity. Financial losses accelerating at $194K/sec. How do you respond?",
    options: [
      { id: "isolate", label: "Isolate & Contain", icon: "🔒", description: "Immediately cordon the compromised node and drain workloads to healthy replicas", optimal: true, penaltySec: 0 },
      { id: "diagnose", label: "Run Full Diagnostic", icon: "🔍", description: "Collect forensic data and run full system diagnostic before taking any action", optimal: false, penaltySec: 20 },
      { id: "escalate", label: "Escalate to Management", icon: "📞", description: "Follow chain-of-command protocol and wait for executive authorization", optimal: false, penaltySec: 35 },
    ],
  },
  southeast: {
    prompt:
      "Southeast Grid has 500ms+ latency. Port of Savannah logistics and Miami Int'l systems degrading. Losses at $117K/sec. How do you respond?",
    options: [
      { id: "shape", label: "Enable Traffic Shaping", icon: "🌐", description: "Apply rate-limiting rules to cap malicious inbound traffic and restore bandwidth", optimal: true, penaltySec: 0 },
      { id: "reboot", label: "Rolling Pod Restart", icon: "🔄", description: "Restart all pods in the namespace hoping to clear the bad network state", optimal: false, penaltySec: 15 },
      { id: "manual", label: "Manual Investigation", icon: "🔍", description: "SSH into each pod individually to trace the exact source of latency", optimal: false, penaltySec: 30 },
    ],
  },
  central: {
    prompt:
      "Central Hub CPUs pegged at 100%. Ford, GM, and Dow Chemical control systems unresponsive. Losses at $97K/sec. How do you respond?",
    options: [
      { id: "kill", label: "Kill Rogue Process", icon: "☠️", description: "Identify the crypto-miner PID via top, SIGKILL it, and remove the binary", optimal: true, penaltySec: 0 },
      { id: "scale", label: "Scale Up Replicas", icon: "📈", description: "Add more pod replicas to distribute the load — the rogue process persists on each", optimal: false, penaltySec: 20 },
      { id: "wait", label: "Wait for Auto-Scaling", icon: "⏳", description: "Let the HPA handle it — but the attack is consuming all available headroom", optimal: false, penaltySec: 40 },
    ],
  },
  western: {
    prompt:
      "Western Interconnect has 80%+ packet loss. AWS, Google Cloud, Azure West losing telemetry. Losses at $278K/sec. How do you respond?",
    options: [
      { id: "failover", label: "Activate Backup Link", icon: "🔌", description: "Immediately failover to secondary ISP via BGP community string update", optimal: true, penaltySec: 0 },
      { id: "trace", label: "Traceroute Analysis", icon: "🗺️", description: "Run traceroutes from multiple vantage points to map the failure — packets still dropping", optimal: false, penaltySec: 25 },
      { id: "provider", label: "Contact ISP Support", icon: "📞", description: "Open a ticket with the upstream provider and wait for their NOC to respond", optimal: false, penaltySec: 45 },
    ],
  },
};

function parseLossRate(sectorId: SectorTargetId): number {
  const rates: Record<SectorTargetId, number> = {
    northeast: 194000,
    southeast: 117000,
    central: 97000,
    western: 278000,
  };
  return rates[sectorId] ?? 100000;
}

/* ─── Decision 2: Escalation priority (after analyst brief) ─────────────── */

interface EscalationOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  optimal: boolean;
  penaltySec: number;
}

const ESCALATION_DECISIONS: Record<
  SectorTargetId,
  { prompt: string; options: EscalationOption[] }
> = {
  northeast: {
    prompt: "AI Analyst confirms active intrusion. You have limited response bandwidth. What do you prioritize first?",
    options: [
      { id: "defend",   label: "Harden the perimeter",     icon: "🛡️", description: "Immediately lock down inbound attack vectors and isolate the blast radius", optimal: true,  penaltySec: 0 },
      { id: "notify",  label: "Notify stakeholders first", icon: "📢", description: "Alert Fidelity, Raytheon, and hospital contacts before executing containment", optimal: false, penaltySec: 18 },
      { id: "forensic",label: "Preserve forensic evidence",icon: "🧪", description: "Before any changes, capture memory dumps and network flows for post-incident review", optimal: false, penaltySec: 28 },
    ],
  },
  southeast: {
    prompt: "Latency attack confirmed. Port logistics and airport systems degrading. Where do you direct response resources?",
    options: [
      { id: "defend",  label: "Restore critical links first", icon: "🔗", description: "Prioritize the highest-impact traffic paths — airport and port ops over back-office", optimal: true,  penaltySec: 0 },
      { id: "log",    label: "Capture full packet trace",    icon: "📋", description: "Run tcpdump on all affected nodes to understand the exact attack pattern first", optimal: false, penaltySec: 22 },
      { id: "vendor", label: "Engage vendor support",        icon: "🤝", description: "Open emergency support case with network equipment vendor before touching config", optimal: false, penaltySec: 32 },
    ],
  },
  central: {
    prompt: "CPU hog detected. Manufacturing control systems are offline. Triage your limited remediation window:",
    options: [
      { id: "kill",   label: "Kill the process immediately",  icon: "☠️", description: "Terminate the rogue PID — fastest path to restoring normal operations", optimal: true,  penaltySec: 0 },
      { id: "cgroup", label: "Apply CPU cgroup limits",       icon: "⚙️", description: "Use cgroups to cap CPU usage — safer but slower, process still runs", optimal: false, penaltySec: 16 },
      { id: "scale",  label: "Scale out more nodes",          icon: "📈", description: "Spin up additional pods to absorb load — the attack spreads to each one", optimal: false, penaltySec: 38 },
    ],
  },
  western: {
    prompt: "80% packet loss confirmed on Western Interconnect. Cloud providers losing telemetry. What is your first move?",
    options: [
      { id: "bgp",    label: "Initiate BGP failover",          icon: "🔌", description: "Immediately cut over to secondary ISP via BGP — restores connectivity in seconds", optimal: true,  penaltySec: 0 },
      { id: "mtr",    label: "Run MTR path analysis",          icon: "🗺️", description: "Map the exact failure point before switching — adds delay while losses climb", optimal: false, penaltySec: 22 },
      { id: "bridge", label: "Enable SD-WAN bridge mode",      icon: "🌉", description: "Activate software-defined WAN overlay — correct eventually but slower than BGP", optimal: false, penaltySec: 30 },
    ],
  },
};

/* ─── Decision 3: Containment strategy (mid-remediation, after step 1) ──── */

interface ContainmentOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  optimal: boolean;
  penaltySec: number;
}

const CONTAINMENT_DECISIONS: Record<
  SectorTargetId,
  { prompt: string; options: ContainmentOption[] }
> = {
  northeast: {
    prompt: "Node is cordoned. Attack vector is live. What's your recovery path?",
    options: [
      { id: "restore", label: "Redeploy from clean image", icon: "🏗️", description: "Pull a known-good container image and redeploy — guarantees no persistence", optimal: true,  penaltySec: 0 },
      { id: "patch",   label: "Patch in place",            icon: "🔧", description: "Apply patches to the running container — faster but risks residual backdoors", optimal: false, penaltySec: 20 },
      { id: "monitor", label: "Monitor and observe",       icon: "👁️", description: "Leave the node isolated and watch for lateral movement before acting", optimal: false, penaltySec: 35 },
    ],
  },
  southeast: {
    prompt: "Traffic shaping applied. The latency source is partially identified. How do you lock it down?",
    options: [
      { id: "acl",     label: "Apply ACLs at ingress",       icon: "🚦", description: "Block the malicious IP ranges at the network boundary — immediate effect", optimal: true,  penaltySec: 0 },
      { id: "reroute", label: "Reroute via alternate path",  icon: "↩️", description: "Redirect traffic via a clean peering point — adds latency but bypasses attack", optimal: false, penaltySec: 18 },
      { id: "report",  label: "File ISP abuse report first", icon: "📬", description: "Document and report the source IPs — correct process, but attack continues during review", optimal: false, penaltySec: 30 },
    ],
  },
  central: {
    prompt: "Rogue process killed. Systems recovering. How do you prevent re-infection?",
    options: [
      { id: "immutable", label: "Make filesystem immutable",  icon: "🔒", description: "Set root filesystem to read-only and restrict exec permissions — stops binary reinjection", optimal: true,  penaltySec: 0 },
      { id: "scan",     label: "Run antimalware scan",        icon: "🔍", description: "Execute a full malware scan across all pods — takes minutes, CPU still stressed during", optimal: false, penaltySec: 22 },
      { id: "reboot",   label: "Rolling restart all pods",   icon: "🔄", description: "Restart the namespace — clears memory but the binary is still on disk", optimal: false, penaltySec: 30 },
    ],
  },
  western: {
    prompt: "BGP failover complete. Primary link still compromised. What's your next move?",
    options: [
      { id: "blackhole", label: "Null-route the attacker IPs", icon: "⬛", description: "Announce a BGP blackhole for the offending prefixes — cuts the attack at the routing level", optimal: true,  penaltySec: 0 },
      { id: "firewall",  label: "Add firewall rules",          icon: "🧱", description: "Block IPs at the firewall — correct but slower to propagate than BGP-level action", optimal: false, penaltySec: 20 },
      { id: "wait",      label: "Wait for primary to recover", icon: "⏳", description: "Monitor the primary link — but the packet-loss source is still active", optimal: false, penaltySec: 40 },
    ],
  },
};

function computeGrade(attackTimeSec: number, optimalTriage: boolean, optimalEscalation?: boolean, optimalContainment?: boolean): string {
  let score = 100;
  if (attackTimeSec > 45) score -= (attackTimeSec - 45) * 0.65;
  if (!optimalTriage) score -= 20;
  if (optimalEscalation === false) score -= 10;
  if (optimalContainment === false) score -= 10;
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A-";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B-";
  if (score >= 65) return "C+";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

function gradeColor(g: string): string {
  if (g.startsWith("A")) return "text-emerald-400";
  if (g.startsWith("B")) return "text-blue-400";
  if (g.startsWith("C")) return "text-amber-400";
  if (g === "D")         return "text-orange-500";
  return "text-red-500"; // F
}
function gradeGlow(g: string): string {
  if (g.startsWith("A")) return "drop-shadow-[0_0_30px_rgba(52,211,153,0.35)]";
  if (g.startsWith("B")) return "drop-shadow-[0_0_30px_rgba(59,130,246,0.35)]";
  if (g.startsWith("C")) return "drop-shadow-[0_0_30px_rgba(245,158,11,0.35)]";
  if (g === "D")         return "drop-shadow-[0_0_30px_rgba(249,115,22,0.4)]";
  return "drop-shadow-[0_0_40px_rgba(239,68,68,0.55)]"; // F
}
function gradeLabelColor(g: string): string {
  if (g.startsWith("A")) return "text-emerald-400/70";
  if (g.startsWith("B")) return "text-blue-400/70";
  if (g.startsWith("C")) return "text-amber-400/70";
  if (g === "D")         return "text-orange-500/70";
  return "text-red-500/70";
}

/* ─── Single damage threshold that triggers critical failure mid-run ────────── */
// NE $194K/s ≈ 77s, SE $117K/s ≈ 128s, CT $97K/s ≈ 155s, W $278K/s ≈ 54s
const FAILURE_DAMAGE_THRESHOLD = 15_000_000; // $15 million

/* ─── SSE consumer ──────────────────────────────────────────────────────── */

async function consumeSSE(
  url: string,
  body: unknown,
  onChunk: (type: string, data: Record<string, unknown>) => void,
  signal?: AbortSignal,
) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok || !res.body) return;
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const payload = JSON.parse(line.slice(6));
          onChunk(payload.type ?? "", payload);
        } catch {
          /* skip malformed */
        }
      }
    }
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    console.error("SSE error:", e);
  }
}

/* ─── Narrative panel (simplified — no terminal chrome) ─────────────────── */

function NarrativePanel({
  side,
  title,
  tactic,
  text,
  actions,
  phase,
  isActive,
}: {
  side: "red" | "blue";
  title: string;
  tactic?: string;
  text: string;
  actions: string[];
  phase: LoopPhase;
  isActive: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRed = side === "red";
  const accent = isRed ? "text-red-400" : "text-blue-400";
  const border = isRed ? "border-red-500/20" : "border-blue-500/20";
  const glow = isRed
    ? "shadow-[inset_0_0_60px_rgba(239,68,68,0.04)]"
    : "shadow-[inset_0_0_60px_rgba(59,130,246,0.04)]";

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [text, actions]);

  return (
    <div
      className={`flex h-full flex-col rounded-xl border bg-[#070710] ${border} ${glow}`}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 border-b px-4 py-2.5 ${border}`}>
        <div
          className={`h-2 w-2 rounded-full ${
            isActive
              ? `animate-pulse ${
                  isRed
                    ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    : "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                }`
              : "bg-zinc-700"
          }`}
        />
        <span
          className={`text-sm font-bold uppercase tracking-wider ${accent}`}
        >
          {title}
        </span>
        {tactic && (
          <span className="ml-auto font-mono text-[10px] text-zinc-600">
            {tactic}
          </span>
        )}
      </div>

      {/* Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {text ? (
          <p className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-zinc-300">
            {text}
            {isActive && (
              <span
                className={`ml-0.5 inline-block h-3 w-1 animate-pulse ${
                  isRed ? "bg-red-400" : "bg-blue-400"
                }`}
              />
            )}
          </p>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-700">
            {isRed
              ? phase === "red-planning" || phase === "red-deploying"
                ? "Generating attack plan…"
                : "Standing by…"
              : phase === "blue-detecting" || phase === "blue-remediating"
                ? "Analyzing telemetry…"
                : "Standing by…"}
          </p>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mt-3 space-y-1">
            {actions.map((a, i) => (
              <div
                key={i}
                className={`rounded px-2 py-1 font-mono text-[11px] ${
                  isRed
                    ? "bg-red-500/10 text-red-300"
                    : "bg-blue-500/10 text-blue-300"
                }`}
              >
                ▸ {a}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Analyst BLUF ──────────────────────────────────────────────────────── */

function AnalystBrief({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [text]);

  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-cyan-500/20 bg-[#070710]">
      <div className="flex items-center gap-2 border-b border-cyan-500/15 px-4 py-2.5">
        <div
          className={`h-2 w-2 rounded-full bg-cyan-400 ${
            isStreaming
              ? "animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"
              : ""
          }`}
        />
        <span className="text-sm font-bold uppercase tracking-wider text-cyan-400">
          AI Situation Brief
        </span>
        {isStreaming && (
          <span className="ml-auto font-mono text-[10px] text-cyan-600">
            ● LIVE
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="max-h-[40vh] overflow-y-auto px-5 py-4 font-mono text-base leading-relaxed text-zinc-300"
      >
        {text ? (
          <>
            <span className="whitespace-pre-wrap">{text}</span>
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-cyan-400 opacity-80" />
            )}
          </>
        ) : (
          <span className="text-zinc-700">Awaiting situation data…</span>
        )}
      </div>
    </div>
  );
}

/* ─── 3-dot progress ────────────────────────────────────────────────────── */

type PhaseGroup = "attack" | "defend" | "restore" | "none";

function getPhaseGroup(phase: LoopPhase): PhaseGroup {
  if (
    ["red-planning", "red-deploying", "chaos-active", "countdown"].includes(
      phase,
    )
  )
    return "attack";
  if (
    [
      "analyst-briefing",
      "blue-detecting",
      "blue-remediating",
      "awaiting-fix",
    ].includes(phase)
  )
    return "defend";
  if (phase === "recovering") return "restore";
  return "none";
}

function ProgressDots({ phase }: { phase: LoopPhase }) {
  const group = getPhaseGroup(phase);
  const dots: {
    label: string;
    active: PhaseGroup;
    color: string;
    bg: string;
  }[] = [
    { label: "ATTACK", active: "attack", color: "text-red-400", bg: "bg-red-500" },
    { label: "DEFEND", active: "defend", color: "text-blue-400", bg: "bg-blue-500" },
    {
      label: "RESTORE",
      active: "restore",
      color: "text-emerald-400",
      bg: "bg-emerald-500",
    },
  ];

  const groupOrder: PhaseGroup[] = ["attack", "defend", "restore"];
  const currentIdx = groupOrder.indexOf(group);

  return (
    <div className="flex items-center justify-center gap-3">
      {dots.map((d, i) => {
        const isActive = d.active === group;
        const isPast = currentIdx > i;
        return (
          <div key={d.label} className="flex items-center gap-3">
            {i > 0 && (
              <div
                className={`h-px w-8 ${isPast || isActive ? "bg-white/20" : "bg-white/5"}`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-all duration-500 ${
                  isActive
                    ? `${d.bg} text-white shadow-[0_0_12px_rgba(255,255,255,0.15)] scale-110`
                    : isPast
                      ? `${d.bg}/40 text-white/60`
                      : "bg-zinc-800 text-zinc-600"
                }`}
              >
                {isPast ? "✓" : isActive ? "●" : "○"}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                  isActive
                    ? d.color
                    : isPast
                      ? "text-zinc-500"
                      : "text-zinc-700"
                }`}
              >
                {d.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */

const ALL_SECTOR_IDS = [
  "northeast",
  "southeast",
  "central",
  "western",
] as const;

export default function AgentWarRoom({
  sectorStatuses,
  sectorMetrics = {},
  onChaosStateChange,
  onLoopInit,
  onLoopStop,
}: AgentWarRoomProps) {
  const [loopRunning, setLoopRunning] = useState(false);
  const [phase, setPhase] = useState<LoopPhase>("idle");
  const [cycle, setCycle] = useState(0);
  const [mode, setMode] = useState<"interactive" | "auto-loop">("interactive");
  const [countdown, setCountdown] = useState<number | null>(null);

  const [redText, setRedText] = useState("");
  const [redActions, setRedActions] = useState<string[]>([]);
  const [scenario, setScenario] = useState<ScenarioMeta | null>(null);
  const [blueText, setBlueText] = useState("");
  const [blueActions, setBlueActions] = useState<string[]>([]);
  const [analystText, setAnalystText] = useState("");
  const [analystStreaming, setAnalystStreaming] = useState(false);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [attackedSectors, setAttackedSectors] = useState<Set<SectorTargetId>>(
    new Set(),
  );
  const [completedFixes, setCompletedFixes] = useState<Set<number>>(new Set());
  const [fixProcessing, setFixProcessing] = useState<number | null>(null);
  const [fixTarget, setFixTarget] = useState<SectorTargetId | null>(null);
  const [awaitingContinue, setAwaitingContinue] = useState(false);
  const [damageStartTime, setDamageStartTime] = useState<number | null>(null);
  const [liveDamage, setLiveDamage] = useState(0);
  const [attackElapsed, setAttackElapsed] = useState(0);
  const [finalDamage, setFinalDamage] = useState(0);
  const [totalAttackTime, setTotalAttackTime] = useState(0);
  const [triageChoice, setTriageChoice] = useState<string | null>(null);
  const [triagePenalty, setTriagePenalty] = useState(0);
  const [triageOptimal, setTriageOptimal] = useState(false);
  const triageOptimalRef = useRef(false);
  const [escalationChoice, setEscalationChoice] = useState<string | null>(null);
  const [escalationOptimal, setEscalationOptimal] = useState(false);
  const [escalationPenalty, setEscalationPenalty] = useState(0);
  const [containmentChoice, setContainmentChoice] = useState<string | null>(null);
  const [containmentOptimal, setContainmentOptimal] = useState(false);
  const [containmentPenalty, setContainmentPenalty] = useState(0);
  const [showContainmentDecision, setShowContainmentDecision] = useState(false);
  const [cmdInput, setCmdInput] = useState("");
  const [cmdError, setCmdError] = useState(false);
  const [cmdHint, setCmdHint] = useState(false);
  const [defenderMode, setDefenderMode] = useState<"pending" | "manual" | "agentic">("pending");
  const cmdInputRef = useRef<HTMLInputElement>(null);
  const failureTriggeredRef = useRef(false);

  const abortRef = useRef<AbortController | null>(null);
  const continueResolverRef = useRef<(() => void) | null>(null);
  const loopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fixResolverRef = useRef<(() => void) | null>(null);
  const fixProcessingRef = useRef<number | null>(null);

  const [showAccessGranted, setShowAccessGranted] = useState(false);
  const prevPhaseRef = useRef<LoopPhase>("idle");
  const accessGrantedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [soundEnabled, setSoundEnabled] = useState(true);
  const soundEnabledRef = useRef(true);

  const buildSnapshotRef = useRef<
    () => { timestamp: number; sectors: Record<string, unknown> }
  >(() => ({ timestamp: Date.now(), sectors: {} }));
  const onChaosChangeRef = useRef(onChaosStateChange);
  const onLoopInitRef = useRef(onLoopInit);
  const onLoopStopRef = useRef(onLoopStop);

  const startPhaseTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhaseTimer(0);
    timerRef.current = setInterval(() => setPhaseTimer((t) => t + 1), 1000);
  }, []);

  const stopPhaseTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const sleep = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = setTimeout(resolve, ms);
      abortRef.current?.signal.addEventListener("abort", () => {
        clearTimeout(id);
        resolve();
      });
    });

  /** In interactive mode, pause until the user clicks "Continue →".
   *  In auto-loop mode, just wait `autoFallbackMs` so the audience can read. */
  const waitForContinue = async (autoFallbackMs = 8000) => {
    if (abortRef.current?.signal.aborted) return;
    if (loopRef.current) {
      await sleep(autoFallbackMs);
      return;
    }
    setAwaitingContinue(true);
    await new Promise<void>((resolve) => {
      continueResolverRef.current = resolve;
      abortRef.current?.signal.addEventListener("abort", () => resolve(), { once: true });
    });
    setAwaitingContinue(false);
    continueResolverRef.current = null;
  };

  const handleContinue = useCallback(() => {
    setAwaitingContinue(false);
    continueResolverRef.current?.();
    continueResolverRef.current = null;
  }, []);

  const handleTriageChoice = useCallback(
    (choiceId: string, optimal: boolean, penaltySec: number) => {
      setTriageChoice(choiceId);
      setTriagePenalty(penaltySec);
      setTriageOptimal(optimal);
      triageOptimalRef.current = optimal;
      if (penaltySec > 0) {
        setDamageStartTime((prev) => (prev ? prev - penaltySec * 1000 : prev));
      }
      setTimeout(() => handleContinue(), optimal ? 2500 : 4000);
    },
    [handleContinue],
  );

  const handleEscalationChoice = useCallback(
    (choiceId: string, optimal: boolean, penaltySec: number) => {
      setEscalationChoice(choiceId);
      setEscalationOptimal(optimal);
      setEscalationPenalty(penaltySec);
      if (penaltySec > 0) {
        setDamageStartTime((prev) => (prev ? prev - penaltySec * 1000 : prev));
      }
      setTimeout(() => handleContinue(), optimal ? 2000 : 3500);
    },
    [handleContinue],
  );

  const handleContainmentChoice = useCallback(
    (choiceId: string, optimal: boolean, penaltySec: number) => {
      setContainmentChoice(choiceId);
      setContainmentOptimal(optimal);
      setContainmentPenalty(penaltySec);
      setShowContainmentDecision(false);
      if (penaltySec > 0) {
        setDamageStartTime((prev) => (prev ? prev - penaltySec * 1000 : prev));
      }
    },
    [],
  );

  const buildTelemetrySnapshot = useCallback(() => {
    const sectors: Record<string, unknown> = {};
    for (const [id, status] of Object.entries(sectorStatuses)) {
      const metrics = sectorMetrics[id] ?? {};
      sectors[id] = { ok: status !== "offline", ...metrics, status };
    }
    return { timestamp: Date.now(), sectors };
  }, [sectorStatuses, sectorMetrics]);

  useEffect(() => {
    buildSnapshotRef.current = buildTelemetrySnapshot;
  }, [buildTelemetrySnapshot]);
  useEffect(() => {
    onChaosChangeRef.current = onChaosStateChange;
  }, [onChaosStateChange]);
  useEffect(() => {
    onLoopInitRef.current = onLoopInit;
  }, [onLoopInit]);
  useEffect(() => {
    onLoopStopRef.current = onLoopStop;
  }, [onLoopStop]);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabledRef.current) return;
    switch (phase) {
      case "red-planning":
        playRedAlert();
        break;
      case "chaos-active":
        playAlarm();
        break;
      case "blue-detecting":
        playBlueActivate();
        break;
      case "recovering":
        playRecovery();
        break;
      default:
        break;
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (
      phase === "chaos-active" &&
      (prev === "red-deploying" || prev === "red-planning")
    ) {
      setShowAccessGranted(true);
      if (accessGrantedTimerRef.current)
        clearTimeout(accessGrantedTimerRef.current);
      accessGrantedTimerRef.current = setTimeout(
        () => setShowAccessGranted(false),
        3200,
      );
    } else if (
      phase === "idle" ||
      phase === "awaiting-target" ||
      phase === "paused"
    ) {
      setShowAccessGranted(false);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Live damage ticker ────────────────────────────────────────────── */

  useEffect(() => {
    if (!damageStartTime || !scenario) return;
    const rate = parseLossRate(scenario.targetSector as SectorTargetId);
    const interval = setInterval(() => {
      const elapsed = (Date.now() - damageStartTime) / 1000;
      setLiveDamage(Math.floor(elapsed * rate));
      setAttackElapsed(Math.floor(elapsed));
    }, 80);
    return () => clearInterval(interval);
  }, [damageStartTime, scenario]);

  /* ── Real-time failure gate: abort scenario the moment damage hits $15M ──── */
  useEffect(() => {
    if (failureTriggeredRef.current) return;
    if (!damageStartTime || liveDamage < FAILURE_DAMAGE_THRESHOLD) return;
    const activePhases = [
      "chaos-active", "analyst-briefing",
      "blue-detecting", "blue-remediating", "awaiting-fix",
    ] as LoopPhase[];
    if (!activePhases.includes(phase)) return;

    // Lock so this only fires once per run
    failureTriggeredRef.current = true;
    loopRef.current = false;

    // Freeze final stats from live values
    setFinalDamage(liveDamage);
    setTotalAttackTime(Math.round((Date.now() - damageStartTime) / 1000));
    setDamageStartTime(null);
    setAwaitingContinue(false);
    setLoopRunning(false);
    fixProcessingRef.current = null;
    setFixProcessing(null);

    // Unblock any in-flight awaits so runSingleScenario exits cleanly
    abortRef.current?.abort();
    continueResolverRef.current?.();
    continueResolverRef.current = null;
    fixResolverRef.current?.();
    fixResolverRef.current = null;

    setPhase("critical-failure");
  }, [liveDamage, phase, damageStartTime]);

  /* ── Core scenario flow ────────────────────────────────────────────── */

  const runSingleScenario = useCallback(
    async (targetSector?: SectorTargetId) => {
      const abort = new AbortController();
      abortRef.current = abort;
      let chaosStartedAt: number | null = null;

      setPhase("red-planning");
      startPhaseTimer();
      setRedText("");
      setRedActions([]);
      setBlueText("");
      setBlueActions([]);
      setAnalystText("");
      setScenario(null);
      setTriageChoice(null);
      setTriagePenalty(0);
      setTriageOptimal(false);
      triageOptimalRef.current = false;
      setEscalationChoice(null);
      setEscalationOptimal(false);
      setEscalationPenalty(0);
      setContainmentChoice(null);
      setContainmentOptimal(false);
      setContainmentPenalty(0);
      setShowContainmentDecision(false);
      setDamageStartTime(null);
      setLiveDamage(0);
      setAttackElapsed(0);
      setFinalDamage(0);
      setTotalAttackTime(0);

      const telemetry = buildSnapshotRef.current();
      const cap = { scenario: null as ScenarioMeta | null };
      const redBody: Record<string, unknown> = { cycle: 0, telemetry };
      if (targetSector) redBody.sector = targetSector;

      await consumeSSE(
        "/api/agents/red",
        redBody,
        (type, data) => {
          if (type === "narrative")
            setRedText((prev) => prev + ((data.text as string) ?? ""));
          else if (type === "action") {
            setRedActions((prev) => [
              ...prev,
              (data.text as string) ?? "",
            ]);
            setPhase("red-deploying");
            startPhaseTimer();
          } else if (type === "scenario") {
            cap.scenario = data.scenario as ScenarioMeta;
            setScenario(cap.scenario);
          }
        },
        abort.signal,
      );

      if (!loopRef.current && !targetSector) return;
      if (abort.signal.aborted) return;

      // Gate: let user read the Red Agent's full attack plan
      await waitForContinue(6000);
      if (abort.signal.aborted) return;

      setPhase("chaos-active");
      startPhaseTimer();
      chaosStartedAt = Date.now();
      setDamageStartTime(chaosStartedAt);
      if (cap.scenario)
        onChaosChangeRef.current?.(
          cap.scenario.targetSector,
          cap.scenario.impact as SectorStatus,
        );
      await sleep(5000); // let ACCESS GRANTED play + show impact
      if (abort.signal.aborted) return;
      // Gate: let user digest the attack impact
      await waitForContinue(12000);
      if (abort.signal.aborted) return;

      setPhase("analyst-briefing");
      startPhaseTimer();
      setAnalystStreaming(true);
      const freshTelemetry = buildSnapshotRef.current();
      await consumeSSE(
        "/api/analyst/stream",
        {
          telemetry: freshTelemetry,
          scenario: cap.scenario
            ? { ...cap.scenario, analystBrief: undefined }
            : undefined,
        },
        (type, data) => {
          if (type === "text" || !type || type === "narrative") {
            setAnalystText(
              (prev) => prev + ((data.text as string) ?? ""),
            );
          }
        },
        abort.signal,
      );
      setAnalystStreaming(false);
      if (abort.signal.aborted) return;

      // Gate: let user read the full analyst brief before moving on
      await waitForContinue(10000);
      if (abort.signal.aborted) return;

      setPhase("blue-detecting");
      startPhaseTimer();
      const chaosSnapshot = buildSnapshotRef.current();
      await consumeSSE(
        "/api/agents/blue",
        {
          telemetry: chaosSnapshot,
          scenario: cap.scenario ?? undefined,
        },
        (type, data) => {
          if (type === "narrative")
            setBlueText(
              (prev) => prev + ((data.text as string) ?? ""),
            );
          else if (type === "action") {
            setBlueActions((prev) => [
              ...prev,
              (data.text as string) ?? "",
            ]);
            setPhase("blue-remediating");
            startPhaseTimer();
          }
        },
        abort.signal,
      );
      if (abort.signal.aborted) return;

      // Gate: let user read Blue Agent's defense plan
      await waitForContinue(6000);
      if (abort.signal.aborted) return;

      if (targetSector) {
        setPhase("awaiting-fix");
        startPhaseTimer();
        setCompletedFixes(new Set());
        setFixProcessing(null);
        fixProcessingRef.current = null;
        setFixTarget(targetSector);
        await new Promise<void>((resolve) => {
          fixResolverRef.current = resolve;
        });
        if (abort.signal.aborted) return;
      }

      // Freeze damage counter and compute scorecard stats
      if (chaosStartedAt && cap.scenario) {
        const elapsed = (Date.now() - chaosStartedAt) / 1000;
        const rate = parseLossRate(cap.scenario.targetSector as SectorTargetId);
        setTotalAttackTime(Math.round(elapsed));
        setFinalDamage(Math.floor(elapsed * rate));
      }
      setDamageStartTime(null);

      setPhase("recovering");
      startPhaseTimer();
      if (cap.scenario)
        onChaosChangeRef.current?.(cap.scenario.targetSector, "nominal");
      if (targetSector) {
        await waitForContinue(12000);
      } else {
        await sleep(25000);
      }
    },
    [startPhaseTimer],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const runAutoLoop = useCallback(async () => {
    loopRef.current = true;
    let currentCycle = 0;
    while (loopRef.current) {
      setPhase("idle");
      startPhaseTimer();
      await sleep(6000);
      if (!loopRef.current) break;
      setCycle(currentCycle);
      await runSingleScenario();
      if (!loopRef.current) break;
      currentCycle++;
    }
    setPhase("idle");
    stopPhaseTimer();
  }, [startPhaseTimer, stopPhaseTimer, runSingleScenario]);

  const handleSectorSelect = useCallback(
    async (sectorId: SectorTargetId) => {
      resumeAudio();
      if (soundEnabledRef.current) playTargetSelect();
      onLoopInitRef.current?.(ALL_SECTOR_IDS);
      setLoopRunning(true);
      setRedText("");
      setRedActions([]);
      setBlueText("");
      setBlueActions([]);
      setAnalystText("");
      setScenario(null);
      setCompletedFixes(new Set());
      setFixProcessing(null);
      setFixTarget(null);
      fixProcessingRef.current = null;
      setDefenderMode("pending");
      setEscalationChoice(null);
      setEscalationOptimal(false);
      setEscalationPenalty(0);
      setContainmentChoice(null);
      setContainmentOptimal(false);
      setContainmentPenalty(0);
      setShowContainmentDecision(false);

      setPhase("countdown");
      startPhaseTimer();
      for (let i = 3; i >= 1; i--) {
        setCountdown(i);
        if (soundEnabledRef.current) playCountdownTick();
        await new Promise<void>((r) => setTimeout(r, 1000));
      }
      setCountdown(null);

      setCycle(SECTOR_TARGETS.findIndex((s) => s.id === sectorId));
      await runSingleScenario(sectorId);
      if (!failureTriggeredRef.current) {
        setAttackedSectors((prev) => new Set(prev).add(sectorId));
        setPhase("awaiting-target");
        stopPhaseTimer();
        setLoopRunning(false);
      }
    },
    [runSingleScenario, startPhaseTimer, stopPhaseTimer],
  );

  const handleFixStep = useCallback(
    async (stepIndex: number, target: SectorTargetId) => {
      const steps = REMEDIATION_STEPS[target];
      if (!steps || stepIndex >= steps.length) return;
      if (fixProcessingRef.current !== null) return;
      fixProcessingRef.current = stepIndex;
      setFixProcessing(stepIndex);
      if (soundEnabledRef.current) playFixAction();
      await new Promise<void>((r) =>
        setTimeout(r, steps[stepIndex].durationMs),
      );
      fixProcessingRef.current = null;
      setFixProcessing(null);
      setCompletedFixes((prev) => {
        const next = new Set(prev);
        next.add(stepIndex);
        if (next.size === steps.length) {
          if (soundEnabledRef.current) playAllFixed();
          setTimeout(() => {
            fixResolverRef.current?.();
            fixResolverRef.current = null;
          }, 1500);
        } else if (stepIndex === 0) {
          // After first remediation step, trigger containment strategy decision
          setTimeout(() => setShowContainmentDecision(true), 600);
        }
        return next;
      });
    },
    [],
  );

  const handleCommandSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!fixTarget || fixProcessingRef.current !== null) return;
      const steps = REMEDIATION_STEPS[fixTarget];
      const commands = REMEDIATION_COMMANDS[fixTarget];
      if (!steps || !commands) return;
      const nextIdx = steps.findIndex((_, i) => !completedFixes.has(i));
      if (nextIdx === -1) return;
      const expected = commands[nextIdx];
      const input = cmdInput.trim();
      if (input.toLowerCase() === expected.toLowerCase()) {
        setCmdError(false);
        setCmdHint(false);
        setCmdInput("");
        handleFixStep(nextIdx, fixTarget);
      } else {
        setCmdError(true);
        setCmdHint(true);
        setTimeout(() => setCmdError(false), 1200);
      }
    },
    [fixTarget, completedFixes, cmdInput, handleFixStep],
  );

  /* ── Agentic runbook: auto-step through fixes when AI mode selected ──── */
  useEffect(() => {
    if (defenderMode !== "agentic" || phase !== "awaiting-fix" || !fixTarget) return;
    if (fixProcessingRef.current !== null) return;
    const steps = REMEDIATION_STEPS[fixTarget];
    if (!steps) return;
    const nextIdx = steps.findIndex((_, i) => !completedFixes.has(i));
    if (nextIdx === -1) return;
    const t = setTimeout(() => handleFixStep(nextIdx, fixTarget), 1000);
    return () => clearTimeout(t);
  }, [defenderMode, phase, fixTarget, completedFixes, handleFixStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartAutoLoop = useCallback(() => {
    resumeAudio();
    if (soundEnabledRef.current) playLoopStart();
    onLoopInitRef.current?.(ALL_SECTOR_IDS);
    setLoopRunning(true);
    setMode("auto-loop");
    setRedText("");
    setRedActions([]);
    setBlueText("");
    setBlueActions([]);
    setAnalystText("");
    setScenario(null);
    setCycle(0);
    runAutoLoop();
  }, [runAutoLoop]);

  const handleStop = useCallback(() => {
    loopRef.current = false;
    abortRef.current?.abort();
    continueResolverRef.current?.();
    continueResolverRef.current = null;
    setAwaitingContinue(false);
    setDamageStartTime(null);
    fixResolverRef.current?.();
    fixResolverRef.current = null;
    fixProcessingRef.current = null;
    setLoopRunning(false);
    setPhase("paused");
    stopPhaseTimer();
    setCountdown(null);
    setMode("interactive");
    setFixProcessing(null);
    onLoopStopRef.current?.();
  }, [stopPhaseTimer]);

  const handleReset = useCallback(() => {
    handleStop();
    setPhase("idle");
    setAttackedSectors(new Set());
    setCompletedFixes(new Set());
    setFixProcessing(null);
    setFixTarget(null);
    fixProcessingRef.current = null;
    setRedText("");
    setRedActions([]);
    setBlueText("");
    setBlueActions([]);
    setAnalystText("");
    setScenario(null);
    setCycle(0);
    setTriageChoice(null);
    setTriagePenalty(0);
    setTriageOptimal(false);
    triageOptimalRef.current = false;
    setEscalationChoice(null);
    setEscalationOptimal(false);
    setEscalationPenalty(0);
    setContainmentChoice(null);
    setContainmentOptimal(false);
    setContainmentPenalty(0);
    setShowContainmentDecision(false);
    setDamageStartTime(null);
    setLiveDamage(0);
    setAttackElapsed(0);
    setFinalDamage(0);
    setTotalAttackTime(0);
    setCmdInput("");
    setCmdError(false);
    setCmdHint(false);
    setDefenderMode("pending");
    failureTriggeredRef.current = false;
  }, [handleStop]);

  useEffect(() => {
    return () => {
      loopRef.current = false;
      abortRef.current?.abort();
      if (timerRef.current) clearInterval(timerRef.current);
      if (accessGrantedTimerRef.current)
        clearTimeout(accessGrantedTimerRef.current);
    };
  }, []);

  /* ── Derived ───────────────────────────────────────────────────────── */

  const showTargetSelection =
    !loopRunning &&
    mode === "interactive" &&
    (phase === "idle" || phase === "paused" || phase === "awaiting-target");

  const fixSteps = fixTarget ? REMEDIATION_STEPS[fixTarget] : null;
  const fixTargetInfo = fixTarget
    ? SECTOR_TARGETS.find((s) => s.id === fixTarget)
    : null;
  const fixAllDone = fixSteps
    ? completedFixes.size === fixSteps.length
    : false;
  const fixPct = fixSteps
    ? Math.round((completedFixes.size / fixSteps.length) * 100)
    : 0;

  const triageData = scenario
    ? TRIAGE_DECISIONS[scenario.targetSector as SectorTargetId]
    : null;
  const triageOptimalOption = triageData?.options.find((o) => o.optimal);

  const isAttackPhase = [
    "red-planning",
    "red-deploying",
    "chaos-active",
    "countdown",
  ].includes(phase);
  const isDefendPhase = [
    "analyst-briefing",
    "blue-detecting",
    "blue-remediating",
    "awaiting-fix",
  ].includes(phase);
  const isActivePhase = isAttackPhase || isDefendPhase || phase === "recovering" || phase === "critical-failure";

  /* ── Render ─────────────────────────────────────────────────────── */

  return (
    <div className="relative flex h-full flex-col">
      {/* ── Floating control bar — always visible ──────────────────── */}
      <div className="absolute left-4 right-4 top-4 z-30 flex items-center justify-between rounded-xl border border-white/10 bg-[#050508]/90 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {!loopRunning ? (
            <>
              <button
                onClick={handleStartAutoLoop}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-700"
              >
                ⟳ Auto
              </button>
              {attackedSectors.size > 0 && (
                <button
                  onClick={handleReset}
                  className="rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition hover:bg-zinc-700"
                >
                  ↺ Reset
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleStop}
              className="rounded-lg bg-red-500/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-red-400 transition hover:bg-red-500/25"
            >
              ■ Halt
            </button>
          )}
        </div>

        {/* 3-dot progress — center */}
        {isActivePhase && <ProgressDots phase={phase} />}

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {isActivePhase && (
            <span className="font-mono text-[10px] text-zinc-600">
              {phaseTimer}s
            </span>
          )}
          {attackedSectors.size > 0 && (
            <span className="font-mono text-[10px] text-zinc-700">
              {attackedSectors.size}/4
            </span>
          )}
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className="rounded border border-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500 transition hover:border-white/15 hover:text-zinc-300"
          >
            {soundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* ── Live damage ticker — visible during active attack phases ── */}
      {damageStartTime && isActivePhase && phase !== "countdown" && phase !== "recovering" && (
        <div className="absolute left-4 right-4 top-[56px] z-20 flex items-center justify-between rounded-b-lg border-x border-b border-red-500/20 bg-black/90 px-5 py-1.5 backdrop-blur-sm">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">💀 Grid Damage</span>
              <span className="font-mono text-lg font-black tabular-nums text-red-300">
                ${liveDamage.toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">⏱ Exposure</span>
              <span className="font-mono text-sm font-bold tabular-nums text-amber-300">
                {attackElapsed}s
              </span>
            </div>
          </div>
          <div className="animate-pulse text-xs font-bold text-red-400/60">
            {SECTOR_TARGETS.find((s) => s.id === scenario?.targetSector)?.lossPerSec ?? ""}/sec
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: IDLE / TARGET SELECTION
          ═══════════════════════════════════════════════════════════════ */}
      {showTargetSelection && (
        <div className="scene-fade flex h-full flex-col items-center justify-center px-6">
          {/* 3D model as background hero */}
          <div className="pointer-events-none absolute inset-0 z-0 opacity-30">
            <FacilityViewer sectorStatuses={sectorStatuses} />
          </div>

          <div className="relative z-10 w-full max-w-3xl">
            {attackedSectors.size === 0 ? (
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-black uppercase tracking-wider text-zinc-100">
                  🏭 National Grid Ops Center
                </h2>
                <p className="mt-2 text-base text-zinc-400">
                  AI-Powered Cyber Defense Simulation
                </p>
                <p className="mt-3 text-sm text-zinc-500">
                  You are a Blue Team operator. Pick a sector to defend, watch
                  the AI battle, then help Blue Agent win.
                </p>
                {/* 3-step onboarding */}
                <div className="mt-6 flex items-center justify-center gap-8">
                  {[
                    {
                      n: "1",
                      icon: "🛡️",
                      label: "Choose Sector",
                      color: "text-amber-400",
                    },
                    {
                      n: "2",
                      icon: "👁️",
                      label: "Watch Battle",
                      color: "text-blue-400",
                    },
                    {
                      n: "3",
                      icon: "⚡",
                      label: "Help Blue Win",
                      color: "text-emerald-400",
                    },
                  ].map((s) => (
                    <div key={s.n} className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-black ${s.color}`}
                      >
                        {s.n}
                      </div>
                      <span className={`text-sm font-bold ${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400">
                  🛡️ Choose Your Next Sector
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {attackedSectors.size}/4 defended
                </p>
              </div>
            )}

            {/* Sector target cards — 2×2 */}
            <div className="grid grid-cols-2 gap-4">
              {SECTOR_TARGETS.map((t) => {
                const wasAttacked = attackedSectors.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleSectorSelect(t.id)}
                    className="group relative flex flex-col items-start rounded-xl border border-white/10 bg-[#0a0a14]/80 px-5 py-4 text-left backdrop-blur transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:bg-white/5 active:scale-[0.98]"
                  >
                    {wasAttacked && (
                      <div className="absolute -right-1 -top-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-400">
                        ✓ Defended
                      </div>
                    )}
                    <div className="flex w-full items-center gap-3">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <div className={`text-base font-bold ${t.color}`}>
                          {t.label}
                          <span className="ml-1.5 text-sm opacity-50">
                            ({t.abbr})
                          </span>
                        </div>
                        <div className="text-sm text-zinc-600">
                          {t.region}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
                      <span className="font-mono text-zinc-500">
                        {t.technique}
                      </span>
                      <span
                        className={`font-mono font-bold uppercase ${
                          t.impact === "offline"
                            ? "text-red-400"
                            : "text-amber-400"
                        }`}
                      >
                        → {t.impact}
                      </span>
                      <span className="font-mono font-bold text-zinc-300">
                        {t.lossPerSec}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.companies.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 w-full text-center text-sm font-bold uppercase tracking-wider text-zinc-700 transition-colors group-hover:text-blue-400">
                      🛡️ Defend This Sector
                    </div>
                  </button>
                );
              })}
            </div>

            {attackedSectors.size === 4 && (
              <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-3 text-center">
                <span className="text-base font-bold text-emerald-400">
                  🏆 All 4 sectors defended! Blue Agent won every round.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: COUNTDOWN
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "countdown" && countdown !== null && (
        <div className="scene-fade flex h-full flex-col items-center justify-center bg-black">
          <div className="animate-count-pulse text-[12rem] font-black leading-none text-red-400 drop-shadow-[0_0_60px_rgba(239,68,68,0.5)]">
            {countdown}
          </div>
          <p className="mt-4 text-lg font-bold uppercase tracking-[0.25em] text-red-400/60">
            Red Agent Attacking in {countdown}…
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: RED ATTACK (red-planning / red-deploying)
          ═══════════════════════════════════════════════════════════════ */}
      {(phase === "red-planning" || phase === "red-deploying") && (
        <div className="scene-fade flex h-full flex-col pt-24">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 p-4">
              <NarrativePanel
                side="red"
                title="🔴 Red Agent — Adversary"
                tactic={scenario?.id}
                text={redText}
                actions={redActions}
                phase={phase}
                isActive
              />
            </div>
            <div className="w-1/2 p-4">
              <div className="h-full overflow-hidden rounded-xl border border-white/5">
                <FacilityViewer sectorStatuses={sectorStatuses} />
              </div>
            </div>
          </div>
          {/* Context bar + centered launch CTA */}
          <div className="shrink-0 border-t border-red-500/10 bg-[#050508]/95 px-6 py-4">
            {awaitingContinue ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-zinc-500">
                  The Red Agent&apos;s attack plan is ready. You are the SOC operator — authorize the intrusion.
                </p>
                <button
                  onClick={handleContinue}
                  className="animate-pulse rounded-xl border-2 border-red-500/50 bg-red-500/15 px-12 py-4 text-lg font-black uppercase tracking-[0.2em] text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-all hover:scale-[1.03] hover:border-red-500/70 hover:bg-red-500/25 hover:shadow-[0_0_40px_rgba(239,68,68,0.3)] active:scale-[0.97]"
                >
                  ⚡ LAUNCH ATTACK ⚡
                </button>
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="text-sm font-bold text-red-400">🔴 AI Adversary — Attack Generation</div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  The Red Agent (powered by GPT-4o-mini) is analyzing the grid&apos;s defenses and crafting a
                  targeted attack plan using real MITRE ICS ATT&amp;CK techniques. Watch the AI generate its
                  intrusion narrative in real-time on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: ACCESS GRANTED + CHAOS ACTIVE
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "chaos-active" && (
        <div className="flex h-full flex-col items-center justify-center">
          {showAccessGranted && (
            <div className="animate-access-granted pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/80">
              <div className="text-center">
                <div className="font-mono text-6xl font-black tracking-[0.2em] text-green-400 drop-shadow-[0_0_60px_rgba(0,255,65,0.9)]">
                  ■ ACCESS GRANTED ■
                </div>
                <div className="mt-4 font-mono text-xl font-bold tracking-[0.15em] text-red-400">
                  ▶▶ INTRUSION: {scenario?.sectorAbbr ?? "TARGET"} SECTOR ◀◀
                </div>
                <div className="mt-2 font-mono text-sm text-zinc-500">
                  {scenario?.id} · {scenario?.cve}
                </div>
              </div>
            </div>
          )}
          <div className="absolute inset-0 z-0">
            <FacilityViewer sectorStatuses={sectorStatuses} />
          </div>
          <div className="relative z-10 w-full max-w-2xl px-6">
            {/* Phase 1: Attack impact (before triage appears) */}
            {!awaitingContinue && !triageChoice && (
              <div className="rounded-xl border border-red-500/20 bg-black/70 px-8 py-6 text-center backdrop-blur-sm">
                <p className="animate-pulse font-mono text-lg font-bold text-red-400">
                  ⚠ CHAOS EXPERIMENT ACTIVE
                </p>
                <p className="mt-2 text-2xl font-black text-red-300">
                  {scenario?.sectorLabel ?? "SECTOR"} COMPROMISED
                </p>
                {scenario && (
                  <>
                    <p className="mt-3 font-mono text-sm text-zinc-400">
                      {scenario.id} — {scenario.name} · {scenario.cve}
                    </p>
                    <div className="mt-4 text-left text-sm leading-relaxed text-zinc-500">
                      {SECTOR_CHAOS_CONTEXT[
                        scenario.targetSector as SectorTargetId
                      ] ??
                        "A live chaos experiment is disrupting grid infrastructure."}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Phase 2: Triage decision (replaces mindless Continue) */}
            {awaitingContinue && !triageChoice && scenario && (
              <div className="rounded-xl border border-amber-500/20 bg-black/85 px-6 py-5 backdrop-blur-sm">
                <div className="mb-4 text-center">
                  <div className="animate-pulse text-lg font-black uppercase tracking-wider text-amber-400">
                    ⚡ Triage Decision Required
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    {triageData?.prompt ??
                      "The sector is under attack. How do you respond?"}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {(triageData?.options ?? []).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() =>
                        handleTriageChoice(
                          opt.id,
                          opt.optimal,
                          opt.penaltySec,
                        )
                      }
                      className="group flex w-full items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:scale-[1.01] hover:border-amber-500/30 hover:bg-amber-500/10 active:scale-[0.99]"
                    >
                      <span className="mt-0.5 text-xl">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-zinc-200 group-hover:text-amber-300">
                          {opt.label}
                        </div>
                        <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                          {opt.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 3: Triage result feedback */}
            {triageChoice && scenario && (
              <div
                className={`rounded-xl border px-6 py-5 text-center backdrop-blur-sm ${
                  triageOptimal
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/10"
                }`}
              >
                {triageOptimal ? (
                  <>
                    <div className="text-2xl font-black text-emerald-400">
                      ✅ Optimal Response
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Immediate containment minimizes the exposure window.
                      Damage continues at baseline rate — no additional penalty.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-black text-amber-400">
                      ⚠ Sub-Optimal Response
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      That cost an additional{" "}
                      <span className="font-bold text-amber-300">
                        {triagePenalty} seconds
                      </span>{" "}
                      of exposure, adding{" "}
                      <span className="font-bold text-red-400">
                        $
                        {(
                          triagePenalty *
                          parseLossRate(
                            scenario.targetSector as SectorTargetId,
                          )
                        ).toLocaleString()}
                      </span>{" "}
                      in preventable damage.
                    </p>
                    {triageOptimalOption && (
                      <p className="mt-2 text-xs text-zinc-500">
                        Optimal response: {triageOptimalOption.icon}{" "}
                        <span className="font-bold text-zinc-400">
                          {triageOptimalOption.label}
                        </span>{" "}
                        — {triageOptimalOption.description}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: ANALYST BRIEFING
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "analyst-briefing" && (
        <div className="scene-fade flex h-full flex-col items-center justify-center px-8">
          {/* Context header */}
          <div className="mb-6 max-w-2xl text-center">
            <div className="text-sm font-bold text-cyan-400">📡 AI Intelligence Assessment</div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
              The AI Analyst (GPT-4o-mini) is receiving live telemetry from all four grid sectors and
              producing a Bottom Line Up Front (BLUF) situation report — the kind of automated
              assessment that would take a human analyst 15–30 minutes to prepare.
            </p>
          </div>
          <AnalystBrief text={analystText} isStreaming={analystStreaming} />
          {/* Continue button — only after streaming completes */}
          {awaitingContinue && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm text-zinc-500">Analysis complete. Authorize the Blue Agent to begin active defense.</p>
              <button
                onClick={handleContinue}
                className="animate-pulse rounded-xl border-2 border-blue-500/50 bg-blue-500/15 px-12 py-4 text-lg font-black uppercase tracking-[0.2em] text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all hover:scale-[1.03] hover:border-blue-500/70 hover:bg-blue-500/25 hover:shadow-[0_0_40px_rgba(59,130,246,0.3)] active:scale-[0.97]"
              >
                🛡️ DEPLOY DEFENSES 🛡️
              </button>
            </div>
          )}
          {!awaitingContinue && !analystStreaming && analystText && (
            <p className="mt-4 animate-pulse text-sm text-cyan-400/60">Preparing defense phase…</p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: BLUE DETECT / REMEDIATE
          ═══════════════════════════════════════════════════════════════ */}
      {(phase === "blue-detecting" || phase === "blue-remediating") && (
        <div className="scene-fade flex h-full flex-col pt-24">
          <div className="flex flex-1 min-h-0">
            <div className="w-1/2 p-4">
              <div className="h-full overflow-hidden rounded-xl border border-white/5">
                <FacilityViewer sectorStatuses={sectorStatuses} />
              </div>
            </div>
            <div className="flex-1 p-4">
              <NarrativePanel
                side="blue"
                title="🔵 Blue Agent — Defender"
                tactic={scenario ? "SOC RESPONSE" : undefined}
                text={blueText}
                actions={blueActions}
                phase={phase}
                isActive
              />
            </div>
          </div>
          {/* Context bar */}
          <div className="shrink-0 border-t border-blue-500/10 bg-[#050508]/95 px-6 py-4">
            {awaitingContinue ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-zinc-500">
                  The Blue Agent has generated a defense playbook. Take command of the terminal and execute the remediation.
                </p>
                <button
                  onClick={handleContinue}
                  className="animate-pulse rounded-xl border-2 border-emerald-500/50 bg-emerald-500/15 px-12 py-4 text-lg font-black uppercase tracking-[0.2em] text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15)] transition-all hover:scale-[1.03] hover:border-emerald-500/70 hover:bg-emerald-500/25 hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] active:scale-[0.97]"
                >
                  ⚡ BEGIN REMEDIATION ⚡
                </button>
              </div>
            ) : (
              <div className="max-w-2xl">
                <div className="text-sm font-bold text-blue-400">🔵 AI Defender — Threat Response</div>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                  The Blue Agent (GPT-4o-mini) has detected anomalous telemetry and is generating a
                  defense playbook. It&apos;s analyzing the attack pattern, correlating it with MITRE ICS
                  techniques, and producing step-by-step remediation commands for you to execute.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: AWAITING FIX (interactive remediation)
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "awaiting-fix" && fixTarget && fixSteps && (
        <div className="scene-fade flex h-full flex-col items-center justify-center px-6 pt-24">
          {/* Containment strategy decision modal — appears after step 1 */}
          {showContainmentDecision && !containmentChoice && fixTarget && scenario && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div className="w-full max-w-xl rounded-2xl border border-violet-500/30 bg-[#080810] px-6 py-6 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
                <div className="mb-4 text-center">
                  <div className="animate-pulse text-lg font-black uppercase tracking-wider text-violet-400">
                    🔐 Containment Strategy Decision
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                    {CONTAINMENT_DECISIONS[fixTarget]?.prompt ?? "Breach contained. How do you lock it down?"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">⚠ Damage continues until you decide</p>
                </div>
                <div className="space-y-2">
                  {(CONTAINMENT_DECISIONS[fixTarget]?.options ?? []).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleContainmentChoice(opt.id, opt.optimal, opt.penaltySec)}
                      className="group flex w-full items-start gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-all hover:scale-[1.01] hover:border-violet-500/30 hover:bg-violet-500/10 active:scale-[0.99]"
                    >
                      <span className="mt-0.5 text-xl">{opt.icon}</span>
                      <div>
                        <div className="text-sm font-bold text-zinc-200 group-hover:text-violet-300">{opt.label}</div>
                        <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">{opt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {defenderMode === "pending" ? (
            <div className="w-full max-w-xl text-center">
              <h2 className="mb-1 text-2xl font-black uppercase tracking-wider text-emerald-400">
                ⚡ Choose Your Defense Approach
              </h2>
              <p className="mb-6 text-sm text-zinc-500">
                Blue Agent has staged all countermeasures for{" "}
                <span className="font-bold text-zinc-300">{fixTargetInfo?.label ?? fixTarget}</span>.
                How do you want to proceed?
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDefenderMode("manual")}
                  className="rounded-xl border-2 border-emerald-500/40 bg-emerald-500/5 px-6 py-6 text-left transition-all hover:border-emerald-500/70 hover:bg-emerald-500/15 active:scale-[0.98]"
                >
                  <div className="mb-2 text-3xl">⌨️</div>
                  <div className="mb-1 text-sm font-black uppercase tracking-wider text-emerald-400">Manual Control</div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    You type each command. Direct execution — your speed determines the score.
                  </p>
                </button>
                <button
                  onClick={() => setDefenderMode("agentic")}
                  className="rounded-xl border-2 border-blue-500/40 bg-blue-500/5 px-6 py-6 text-left transition-all hover:border-blue-500/70 hover:bg-blue-500/15 active:scale-[0.98]"
                >
                  <div className="mb-2 text-3xl">🤖</div>
                  <div className="mb-1 text-sm font-black uppercase tracking-wider text-blue-400">Agentic AI Runbook</div>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Blue Agent auto-executes. You observe and authorize. Demonstrates autonomous AI response.
                  </p>
                </button>
              </div>
            </div>
          ) : (
          <div className="w-full max-w-3xl">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-2xl font-black uppercase tracking-wider text-emerald-400">
                  <span className="animate-pulse">{defenderMode === "agentic" ? "🤖" : "⚡"}</span>
                  {defenderMode === "agentic" ? "Blue Agent — Executing Runbook" : "Execute Defense Commands"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {defenderMode === "agentic"
                    ? <>Blue Agent is executing countermeasures autonomously &mdash; observe and authorize.</>
                    : <>Type each command exactly to remediate{" "}
                        <span className="font-bold text-zinc-300">
                          {fixTargetInfo?.label ?? fixTarget}
                        </span>
                      </>
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-4xl font-black text-emerald-400">
                  {completedFixes.size}/{fixSteps.length}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  steps
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-5 h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700 ease-out"
                style={{ width: `${fixPct}%` }}
              />
            </div>

            {/* Terminal-style command history */}
            <div className="mb-4 rounded-xl border border-emerald-500/20 bg-[#070710] font-mono text-sm">
              <div className="flex items-center gap-2 border-b border-emerald-500/10 px-4 py-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {defenderMode === "agentic" ? "🤖 AI Runbook" : "SOC Terminal"} — {fixTargetInfo?.abbr ?? "??"} Sector
                </span>
              </div>
              <div className="max-h-[35vh] overflow-y-auto px-4 py-3 space-y-2">
                {fixSteps.map((step, i) => {
                  const isDone = completedFixes.has(i);
                  const isProc = fixProcessing === i;
                  const isNext = !isDone && !isProc && (i === 0 || completedFixes.has(i - 1));
                  const cmd = REMEDIATION_COMMANDS[fixTarget]?.[i] ?? "";
                  return (
                    <div key={step.id}>
                      {/* Step label */}
                      <div className={`text-[11px] uppercase tracking-wider ${isDone ? "text-emerald-500/50" : isNext ? "text-amber-400" : "text-zinc-700"}`}>
                        Step {i + 1}: {step.icon} {step.label}
                      </div>
                      {/* Completed command echo */}
                      {isDone && (
                        <div className="flex items-center gap-2 text-emerald-400/70">
                          <span className="text-emerald-600">$</span>
                          <span className="line-through decoration-emerald-500/30">{cmd}</span>
                          <span className="ml-auto text-emerald-500">✓</span>
                        </div>
                      )}
                      {/* Processing */}
                      {isProc && (
                        <div className="flex items-center gap-2 text-amber-400">
                          <span className="text-amber-600">$</span>
                          <span>{cmd}</span>
                          <span className="ml-auto animate-pulse">⟳ executing…</span>
                        </div>
                      )}
                      {/* Next step hint */}
                      {isNext && !isProc && (
                        <div className="text-zinc-600">
                          <span className="text-zinc-500">$</span>{" "}
                          <span className="animate-pulse">▊</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Command input — ghost-text (manual) or AI runbook indicator (agentic) */}
              {!fixAllDone && defenderMode === "agentic" && (
                <div className="border-t border-blue-500/10 px-4 py-3">
                  <div className="flex items-center gap-3 text-blue-400/70">
                    <span className="animate-spin text-base leading-none">⟳</span>
                    <span className="font-mono text-xs">Blue Agent executing countermeasures…</span>
                  </div>
                </div>
              )}
              {!fixAllDone && defenderMode === "manual" && (() => {
                const nextIdx = fixSteps.findIndex((_, i) => !completedFixes.has(i));
                const expected = nextIdx >= 0 ? (REMEDIATION_COMMANDS[fixTarget]?.[nextIdx] ?? "") : "";
                return (
                  <form onSubmit={handleCommandSubmit} className="border-t border-emerald-500/10 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 shrink-0">$</span>
                      <div className="relative flex-1 font-mono text-sm">
                        {/* Ghost layer — always shows full expected command */}
                        <div className="pointer-events-none select-none whitespace-pre" aria-hidden="true">
                          {expected.split("").map((ch, ci) => {
                            if (ci >= cmdInput.length) {
                              // Not yet typed — dim grey
                              return <span key={ci} className="text-zinc-700">{ch}</span>;
                            }
                            const typed = cmdInput[ci];
                            const match = typed.toLowerCase() === ch.toLowerCase();
                            return (
                              <span key={ci} className={match ? "text-emerald-400" : "text-red-400"}>
                                {typed}
                              </span>
                            );
                          })}
                          {/* Show any extra characters the user typed beyond the expected length */}
                          {cmdInput.length > expected.length && (
                            <span className="text-red-400">
                              {cmdInput.slice(expected.length)}
                            </span>
                          )}
                        </div>
                        {/* Invisible real input on top for keyboard capture */}
                        <input
                          ref={cmdInputRef}
                          type="text"
                          value={cmdInput}
                          onChange={(e) => { setCmdInput(e.target.value); setCmdError(false); }}
                          autoFocus
                          className="absolute inset-0 w-full bg-transparent text-transparent caret-emerald-400 outline-none"
                          spellCheck={false}
                          autoComplete="off"
                          autoCorrect="off"
                        />
                      </div>
                      <button
                        type="submit"
                        className="shrink-0 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/20"
                      >
                        Enter ↵
                      </button>
                    </div>
                    {cmdHint && (
                      <p className="mt-2 text-xs text-amber-400/80">
                        ⚠ Command not recognized — keep typing, the grey text shows the full command.
                      </p>
                    )}
                  </form>
                );
              })()}
            </div>

            {fixAllDone && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-center">
                <div className="text-2xl font-black text-emerald-400">
                  🏆 RED AGENT EXPELLED — GRID RESTORED
                </div>
                <p className="mt-1 text-sm text-emerald-400/70">
                  {fixTargetInfo?.label} is returning to nominal operations…
                </p>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: RECOVERY
          ═══════════════════════════════════════════════════════════════ */}
      {/* Interactive: full scorecard */}
      {phase === "recovering" && fixTarget && (
        <div className="scene-fade flex h-full flex-col items-center justify-center px-8 pt-24">
          <div className="w-full max-w-2xl">
            {/* Grade */}
            {(() => {
              const g = computeGrade(totalAttackTime, triageOptimal, escalationOptimal || !escalationChoice, containmentOptimal || !containmentChoice);
              return (
                <div className="mb-5 text-center">
                  <div className={`text-8xl font-black leading-none ${gradeColor(g)} ${gradeGlow(g)}`}>
                    {g}
                  </div>
                  <div className={`mt-1 text-sm font-bold uppercase tracking-[0.2em] ${gradeLabelColor(g)}`}>
                    Response Grade
                  </div>
                </div>
              );
            })()}

            {/* Stats 2×3 */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="font-mono text-lg font-black text-red-400">
                  ${finalDamage.toLocaleString()}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Financial Damage
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="font-mono text-lg font-black text-amber-400">
                  {totalAttackTime}s
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Time Under Attack
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${
                  triageOptimal ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {triageOptimal ? "✓ Optimal" : `✗ +${triagePenalty}s`}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Triage Decision
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${
                  escalationOptimal ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {escalationChoice ? (escalationOptimal ? "✓ Optimal" : `✗ +${escalationPenalty}s`) : "—"}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Escalation Priority
                </div>
              </div>
              <div className="rounded-xl border border-violet-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${
                  containmentOptimal ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {containmentChoice ? (containmentOptimal ? "✓ Optimal" : `✗ +${containmentPenalty}s`) : "—"}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Containment Strategy
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="text-lg font-black text-emerald-400">
                  {completedFixes.size}/{fixSteps?.length ?? 4}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">
                  Remediation Steps
                </div>
              </div>
            </div>

            {/* Real-world context */}
            <div className="mb-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                📌 Real-World Context
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                Average SOC team MTTR for ICS incidents:{" "}
                <span className="font-bold text-zinc-200">287 minutes</span>.
                Your AI-assisted response:{" "}
                <span className="font-bold text-emerald-400">
                  {totalAttackTime}s
                </span>
                . That&apos;s{" "}
                <span className="font-bold text-emerald-300">
                  {Math.round((287 * 60) / Math.max(totalAttackTime, 1))}×
                  faster
                </span>
                .
              </p>
            </div>

            {/* RM-4 — Regulatory Exposure Meter */}
            {(() => {
              const tiers: { label: string; max: number; color: string; bar: string; reg: string; nist: string }[] = [
                { label: "Internal Only",      max: 1_000_000,  color: "text-zinc-400",   bar: "bg-zinc-500",   reg: "Internal incident log — no external disclosure required",                      nist: "GOVERN" },
                { label: "FERC Disclosure",    max: 5_000_000,  color: "text-amber-400",  bar: "bg-amber-500",  reg: "FERC 30-day mandatory disclosure for bulk electric system events",              nist: "GOVERN" },
                { label: "CISA Notification",  max: 10_000_000, color: "text-orange-400", bar: "bg-orange-500", reg: "CISA critical infrastructure notification + DHS situational awareness brief", nist: "GOVERN" },
                { label: "SEC 8-K + DOE",       max: 50_000_000, color: "text-red-400",    bar: "bg-red-500",    reg: "SEC 8-K material event filing + DOE emergency notification within 24h",        nist: "GOVERN" },
                { label: "Congressional",       max: Infinity,   color: "text-red-600",    bar: "bg-red-700",    reg: "Congressional briefing threshold — NERC CIP violation review triggered",        nist: "GOVERN" },
              ];
              const reached = tiers.findIndex((t) => finalDamage < t.max);
              const activeTier = reached === -1 ? tiers.length - 1 : reached;
              const maxBarDamage = 50_000_000;
              const pct = Math.min((finalDamage / maxBarDamage) * 100, 100);
              const barColor = tiers[Math.min(activeTier, tiers.length - 1)].bar;
              return (
                <div className="mb-3 rounded-xl border border-zinc-700/40 bg-[#0a0a14] px-4 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      ⚖️ Regulatory Exposure — NIST GOVERN Function
                    </div>
                    <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">RM-4</span>
                  </div>
                  {/* Progress bar */}
                  <div className="relative mb-3 h-3 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* Threshold ticks */}
                    {[1,5,10,50].map((m) => (
                      <div
                        key={m}
                        className="absolute top-0 h-full w-px bg-zinc-600/60"
                        style={{ left: `${Math.min((m * 1_000_000 / maxBarDamage) * 100, 100)}%` }}
                      />
                    ))}
                  </div>
                  {/* Tier labels */}
                  <div className="mb-3 grid grid-cols-5 gap-1">
                    {tiers.map((t, i) => (
                      <div key={t.label} className={`rounded px-1.5 py-1 text-center ${i === activeTier ? `border ${barColor.replace("bg-","border-")}/50 ${t.color} bg-white/5` : "text-zinc-700"}`}>
                        <div className="text-[8px] font-bold uppercase leading-tight">{t.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Active tier detail */}
                  <div className={`rounded-lg border border-zinc-700/30 bg-zinc-900/50 px-3 py-2`}>
                    <div className={`text-[10px] font-bold ${tiers[activeTier].color}`}>
                      {finalDamage > 0 ? `📋 ${tiers[activeTier].label} threshold reached` : "No damage accrued"}
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                      {tiers[activeTier].reg}
                    </p>
                    <p className="mt-1 text-[9px] text-violet-400/70">
                      NIST CSF · <span className="font-bold">GOVERN</span> — Policies, regulations, and oversight obligations that determine how organizations must report and respond to incidents.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Key takeaway */}
            <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                🧠 Key Takeaway
              </div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                GenAI compresses incident response from hours to seconds — but you made{" "}
                <span className="font-bold text-zinc-200">three critical decisions</span> that shaped the outcome.
                {!triageOptimal || !escalationOptimal || !containmentOptimal ? (
                  <> Sub-optimal choices on{" "}
                    {[!triageOptimal && "triage", !escalationOptimal && "escalation", !containmentOptimal && "containment"].filter(Boolean).join(", ")}{" "}
                    added preventable losses. </>
                ) : (
                  <> All three decisions were optimal — you minimized the exposure window at every gate. </>
                )}
                AI surfaces the right answer. You still have to choose it.
              </p>
            </div>

            {/* NIST CSF Framework Card */}
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                  🏛️ NIST Cybersecurity Framework — You Just Practiced This
                </div>
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-400">
                  NIST CSF 2.0
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { fn: "GOVERN",   color: "border-zinc-500/30 bg-zinc-500/5 text-zinc-400",     dot: "bg-zinc-500",   demo: "Policy · AI-assisted response" },
                  { fn: "IDENTIFY", color: "border-amber-500/30 bg-amber-500/5 text-amber-400",   dot: "bg-amber-400", demo: "🔴 Red Agent · attack mapping" },
                  { fn: "DETECT",   color: "border-orange-500/30 bg-orange-500/5 text-orange-400", dot: "bg-orange-400", demo: "📊 Analyst · live telemetry" },
                  { fn: "RESPOND",  color: "border-blue-500/30 bg-blue-500/5 text-blue-400",       dot: "bg-blue-400",  demo: "🔵 Blue Agent · triage choice" },
                  { fn: "RECOVER",  color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400", dot: "bg-emerald-400", demo: "⌨️ Terminal · remediation" },
                ].map((f) => (
                  <div key={f.fn} className={`rounded-lg border px-2 py-2.5 ${f.color}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${f.dot}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider">{f.fn}</span>
                    </div>
                    <p className="text-[9px] leading-relaxed text-zinc-500">{f.demo}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-zinc-600">
                Every MIS, Risk, and IT Governance curriculum references NIST CSF as the standard operating model for cybersecurity programs.
                In this demo you experienced all five functions — compressed into 4 minutes with AI in the loop.
              </p>
            </div>

            {/* Continue to next sector */}
            {awaitingContinue && (
              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  onClick={handleContinue}
                  className="animate-pulse rounded-xl border-2 border-emerald-500/50 bg-emerald-500/15 px-12 py-4 text-lg font-black uppercase tracking-[0.2em] text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15)] transition-all hover:scale-[1.03] hover:border-emerald-500/70 hover:bg-emerald-500/25 hover:shadow-[0_0_40px_rgba(52,211,153,0.3)] active:scale-[0.97]"
                >
                  🛡️ DEFEND ANOTHER SECTOR →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: CRITICAL FAILURE
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "critical-failure" && (
        <div className="scene-fade flex h-full flex-col items-center justify-center px-8 pt-24">
          {/* Red ambient pulse behind everything */}
          <div className="pointer-events-none absolute inset-0 animate-pulse bg-red-900/10" />

          <div className="relative z-10 w-full max-w-2xl">
            {/* Big failure mark */}
            <div className="mb-4 text-center">
              <div className="text-[6rem] font-black leading-none text-red-500 drop-shadow-[0_0_40px_rgba(239,68,68,0.5)] animate-pulse">
                F
              </div>
              <div className="mt-1 text-2xl font-black uppercase tracking-[0.25em] text-red-400">
                🚭 CRITICAL FAILURE
              </div>
              <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-red-400/60">
                Sector Lost — Grid Collapsed
              </p>
            </div>

            {/* Stats grid — all three decision points */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-red-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="font-mono text-lg font-black text-red-400">${finalDamage.toLocaleString()}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Financial Damage</div>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="font-mono text-lg font-black text-amber-400">{totalAttackTime}s</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Time Under Attack</div>
              </div>
              <div className="rounded-xl border border-zinc-700/30 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${triageOptimal ? "text-emerald-400" : "text-red-400"}`}>
                  {triageOptimal ? "✓ Optimal" : "✗ Sub-optimal"}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Triage Decision</div>
              </div>
              <div className="rounded-xl border border-zinc-700/30 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${!escalationChoice ? "text-zinc-600" : escalationOptimal ? "text-emerald-400" : "text-red-400"}`}>
                  {!escalationChoice ? "—" : escalationOptimal ? "✓ Optimal" : "✗ Sub-optimal"}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Escalation Priority</div>
              </div>
              <div className="rounded-xl border border-zinc-700/30 bg-[#0a0a14] px-4 py-3 text-center">
                <div className={`text-lg font-black ${!containmentChoice ? "text-zinc-600" : containmentOptimal ? "text-emerald-400" : "text-red-400"}`}>
                  {!containmentChoice ? "—" : containmentOptimal ? "✓ Optimal" : "✗ Sub-optimal"}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">Containment Strategy</div>
              </div>
              <div className="rounded-xl border border-red-700/20 bg-[#0a0a14] px-4 py-3 text-center">
                <div className="text-lg font-black text-red-500">THRESHOLD</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-600">$15M Gate Hit</div>
              </div>
            </div>

            {/* What went wrong */}
            <div className="mb-5 rounded-xl border border-red-500/15 bg-[#0a0a14] px-4 py-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                📌 What Happened
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                The sector remained under attack for too long. Cascading failures overwhelmed
                downstream systems before remediation could take effect. In a real grid event,
                losses at this scale trigger FERC emergency protocols and congressional oversight.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                AI-assisted defense only works when <span className="text-zinc-200 font-semibold">humans act decisively</span>.
                Hesitation, wrong triage, and slow execution erased the AI’s advantage entirely.
              </p>
            </div>

            {/* Try again */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleReset}
                className="rounded-xl border-2 border-red-500/50 bg-red-500/15 px-12 py-4 text-lg font-black uppercase tracking-[0.2em] text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.15)] transition-all hover:scale-[1.03] hover:border-red-500/70 hover:bg-red-500/25 hover:shadow-[0_0_40px_rgba(239,68,68,0.3)] active:scale-[0.97]"
              >
                🔄 TRY AGAIN
              </button>
              <p className="text-xs text-zinc-600">Sector will be reset to nominal for next attempt</p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-loop recovery: simple message */}
      {phase === "recovering" && !fixTarget && (
        <div className="scene-fade animate-green-pulse flex h-full flex-col items-center justify-center">
          <div className="absolute inset-0 z-0">
            <FacilityViewer sectorStatuses={sectorStatuses} />
          </div>
          <div className="relative z-10 w-full max-w-2xl px-6 text-center">
            <div className="rounded-xl border border-emerald-500/20 bg-black/60 px-10 py-6 backdrop-blur">
              <div className="text-4xl font-black uppercase tracking-wider text-emerald-400">
                ✅ Grid Restored
              </div>
              <p className="mt-3 text-base text-zinc-400">
                All sectors returning to nominal. Blue Agent remediation
                successful.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SCENE: PAUSED
          ═══════════════════════════════════════════════════════════════ */}
      {phase === "paused" && !showTargetSelection && (
        <div className="flex h-full flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-black uppercase tracking-wider text-zinc-500">
              ⏸ Paused
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              Click a button above to resume.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
