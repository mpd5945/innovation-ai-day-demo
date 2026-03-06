"use client";

/**
 * DigitalTwin.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SVG-based Kubernetes topology map for the National Grid digital twin.
 * Shows four sector nodes, inter-sector connections, pod health overlays,
 * and active chaos experiment indicators — all animated reactively.
 */

import { useMemo, useEffect, useRef } from "react";

type SectorStatus = "nominal" | "degraded" | "offline" | "unknown";

interface SectorMeta {
  id: string;
  label: string;
  abbr: string;
  region: string;
  cx: number;
  cy: number;
}

interface DigitalTwinProps {
  sectorStatuses: Record<string, SectorStatus>;
  activeChaosTarget?: string | null;
  activeTactic?: string | null;
  activeCve?: string | null;
  sectorMetrics?: Record<
    string,
    { load_pct?: number; frequency_hz?: number; latency_ms?: number }
  >;
}

const NODES: SectorMeta[] = [
  { id: "northeast", label: "Northeast", abbr: "NE", region: "NY·PA·NE", cx: 280, cy: 80 },
  { id: "southeast", label: "Southeast", abbr: "SE", region: "VA·NC·FL", cx: 280, cy: 230 },
  { id: "central", label: "Central", abbr: "CT", region: "OH·IL·MI", cx: 120, cy: 230 },
  { id: "western", label: "Western", abbr: "WE", region: "CA·OR·WA", cx: 120, cy: 80 },
];

// Edges (pairs of sector IDs)
const EDGES: [string, string][] = [
  ["northeast", "southeast"],
  ["northeast", "central"],
  ["southeast", "central"],
  ["central", "western"],
  ["western", "northeast"],
  ["southeast", "western"],
];

function nodeColor(status: SectorStatus, isChaosTarget: boolean): string {
  if (isChaosTarget) return "#ef4444";
  switch (status) {
    case "nominal":  return "#10b981";
    case "degraded": return "#f59e0b";
    case "offline":  return "#ef4444";
    default:         return "#52525b";
  }
}

function edgeColor(
  statusA: SectorStatus,
  statusB: SectorStatus,
  isActive: boolean
): string {
  if (!isActive) return "rgba(255,255,255,0.06)";
  if (statusA === "offline" || statusB === "offline") return "rgba(239,68,68,0.3)";
  if (statusA === "degraded" || statusB === "degraded") return "rgba(245,158,11,0.4)";
  return "rgba(16,185,129,0.3)";
}

function StatusRing({ status, r, cx, cy }: { status: SectorStatus; r: number; cx: number; cy: number }) {
  const color =
    status === "nominal" ? "#10b981"
    : status === "degraded" ? "#f59e0b"
    : status === "offline" ? "#ef4444"
    : "#52525b";
  const animate = status === "degraded" || status === "offline";

  return (
    <>
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
      {animate && (
        <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.7}>
          <animate attributeName="r" from={r + 4} to={r + 14} dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.8s" repeatCount="indefinite" />
        </circle>
      )}
    </>
  );
}

function DataParticle({
  x1, y1, x2, y2, color, delay,
}: {
  x1: number; y1: number; x2: number; y2: number; color: string; delay: number;
}) {
  const id = `particle-${x1}-${y1}-${x2}-${y2}-${delay}`;
  return (
    <circle r={2} fill={color} opacity={0.8}>
      <animateMotion
        dur={`${1.8 + delay * 0.4}s`}
        repeatCount="indefinite"
        begin={`${delay * 0.6}s`}
        path={`M ${x1} ${y1} L ${x2} ${y2}`}
      />
    </circle>
  );
}

export default function DigitalTwin({
  sectorStatuses,
  activeChaosTarget,
  activeTactic,
  activeCve,
  sectorMetrics = {},
}: DigitalTwinProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const W = 400;
  const H = 310;
  const NODE_R = 32;

  const nodeMap = useMemo(
    () => Object.fromEntries(NODES.map((n) => [n.id, n])),
    []
  );

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#080810]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
            Digital Twin — K8s Topology
          </span>
        </div>
        <span className="font-mono text-[9px] text-zinc-600">smeal-day ns</span>
      </div>

      {/* SVG topology */}
      <div className="flex flex-1 items-center justify-center p-2">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-full w-full max-h-[260px]"
          style={{ overflow: "visible" }}
        >
          {/* Grid lines for atmosphere */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />

          {/* Edges */}
          {EDGES.map(([a, b]) => {
            const na = nodeMap[a];
            const nb = nodeMap[b];
            if (!na || !nb) return null;
            const color = edgeColor(
              sectorStatuses[a] ?? "unknown",
              sectorStatuses[b] ?? "unknown",
              true
            );
            const isActive =
              (sectorStatuses[a] === "nominal" && sectorStatuses[b] === "nominal") ||
              false;
            return (
              <g key={`${a}-${b}`}>
                <line
                  x1={na.cx}
                  y1={na.cy}
                  x2={nb.cx}
                  y2={nb.cy}
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
                {/* Animated data particle on nominal connections */}
                {isActive && (
                  <DataParticle
                    x1={na.cx} y1={na.cy} x2={nb.cx} y2={nb.cy}
                    color="rgba(16,185,129,0.7)"
                    delay={Math.abs(na.cx - nb.cx) % 3}
                  />
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => {
            const status = sectorStatuses[node.id] ?? "unknown";
            const isChaosTarget = activeChaosTarget === node.id;
            const color = nodeColor(status, isChaosTarget);
            const metrics = sectorMetrics[node.id];
            const isOffline = status === "offline";

            return (
              <g key={node.id}>
                {/* Pulse ring for degraded/offline */}
                <StatusRing status={status} r={NODE_R} cx={node.cx} cy={node.cy} />

                {/* Node body */}
                <circle
                  cx={node.cx}
                  cy={node.cy}
                  r={NODE_R}
                  fill={`${color}18`}
                  stroke={color}
                  strokeWidth={isChaosTarget ? 2.5 : 1.5}
                />

                {/* Chaos target indicator */}
                {isChaosTarget && (
                  <>
                    <circle cx={node.cx} cy={node.cy} r={NODE_R + 10} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4}>
                      <animate attributeName="r" from={NODE_R + 8} to={NODE_R + 18} dur="1s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.5" to="0" dur="1s" repeatCount="indefinite" />
                    </circle>
                    <text x={node.cx} y={node.cy - NODE_R - 14} textAnchor="middle" fill="#ef4444" fontSize="9" fontFamily="monospace">
                      ⚡ UNDER ATTACK
                    </text>
                  </>
                )}

                {/* Abbr label */}
                <text
                  x={node.cx}
                  y={node.cy - 6}
                  textAnchor="middle"
                  fill={isOffline ? "#52525b" : color}
                  fontSize="14"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {node.abbr}
                </text>

                {/* Load metric */}
                <text
                  x={node.cx}
                  y={node.cy + 8}
                  textAnchor="middle"
                  fill={isOffline ? "#3f3f46" : "rgba(255,255,255,0.55)"}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {isOffline ? "OFFLINE" : metrics?.load_pct ? `${metrics.load_pct.toFixed(0)}%` : "—"}
                </text>

                {/* Latency badge */}
                {!isOffline && metrics?.latency_ms && metrics.latency_ms > 800 && (
                  <text
                    x={node.cx}
                    y={node.cy + 19}
                    textAnchor="middle"
                    fill="#f59e0b"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {metrics.latency_ms}ms
                  </text>
                )}

                {/* Region label */}
                <text
                  x={node.cx}
                  y={node.cy + NODE_R + 14}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {node.region}
                </text>
              </g>
            );
          })}

          {/* Central label */}
          <text x={W / 2} y={H / 2 + 4} textAnchor="middle" fill="rgba(255,255,255,0.06)" fontSize="11" fontFamily="monospace" fontWeight="bold">
            NATIONAL GRID
          </text>
        </svg>
      </div>

      {/* Active tactic badge */}
      {activeTactic && (
        <div className="border-t border-white/5 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-400">
                {activeTactic}
              </span>
              {activeCve && (
                <span className="font-mono text-[9px] text-zinc-600">{activeCve}</span>
              )}
            </div>
            <span className="font-mono text-[9px] text-zinc-700">LitmusChaos active</span>
          </div>
        </div>
      )}
    </div>
  );
}
