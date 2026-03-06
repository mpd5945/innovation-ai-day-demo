"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { playSectorOffline, playSectorDegraded } from "./lib/sounds";

const AgentWarRoom = dynamic(() => import("./components/AgentWarRoom"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
        <p className="text-sm text-zinc-500">Loading AI Command Center…</p>
      </div>
    </div>
  ),
});

/* ─── Types ─────────────────────────────────────────── */

type SectorId = "northeast" | "southeast" | "central" | "western";
type SectorStatus = "nominal" | "degraded" | "offline" | "unknown";

interface SectorMeta {
  id: SectorId;
  label: string;
  abbr: string;
  color: string;
  region: string;
}

interface SectorState {
  meta: SectorMeta;
  status: SectorStatus;
  prevStatus: SectorStatus;
  load_pct: number;
  frequency_hz: number;
  voltage_kv: number;
  generators_online: number;
  generators_total: number;
  capacity_mw: number;
  latency_ms: number;
  lastSuccessAt: number;
  consecutiveErrors: number;
  transitionAt: number;
}

/* ─── Constants ─────────────────────────────────────── */

const SECTORS: SectorMeta[] = [
  { id: "northeast", label: "Northeast Corridor", abbr: "NE", color: "#3b82f6", region: "New England · NY · NJ · PA" },
  { id: "southeast", label: "Southeast Grid", abbr: "SE", color: "#10b981", region: "VA · NC · SC · GA · FL" },
  { id: "central", label: "Central Hub", abbr: "CT", color: "#f59e0b", region: "OH · IN · IL · MI · WI" },
  { id: "western", label: "Western Interconnect", abbr: "WE", color: "#8b5cf6", region: "CO · UT · NV · CA · OR · WA" },
];

const POLL_INTERVAL = 2000;
const LATENCY_DEGRADED_THRESHOLD = 800;

/* ─── Helpers ───────────────────────────────────────── */

function initSectorState(meta: SectorMeta): SectorState {
  return {
    meta,
    status: "unknown",
    prevStatus: "unknown",
    load_pct: 0,
    frequency_hz: 0,
    voltage_kv: 0,
    generators_online: 0,
    generators_total: 5,
    capacity_mw: 0,
    latency_ms: 0,
    lastSuccessAt: 0,
    consecutiveErrors: 0,
    transitionAt: 0,
  };
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour12: false });
}

function overallSystemStatus(states: SectorState[]): { label: string; color: string; dot: string } {
  const statuses = states.map((s) => s.status);
  if (statuses.every((s) => s === "nominal"))
    return { label: "NOMINAL", color: "text-emerald-400", dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" };
  if (statuses.some((s) => s === "offline"))
    return { label: "ALERT", color: "text-red-400 animate-pulse", dot: "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)] animate-pulse" };
  if (statuses.some((s) => s === "degraded"))
    return { label: "DEGRADED", color: "text-amber-400", dot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)] animate-pulse" };
  return { label: "INIT", color: "text-zinc-400", dot: "bg-zinc-600" };
}

/* ─── Main ──────────────────────────────────────────── */

export default function Home() {
  const [sectors, setSectors] = useState<SectorState[]>(() => SECTORS.map(initSectorState));
  const [clock, setClock] = useState<number | null>(null);

  /** Simulated overrides driven by the AI agent loop — wins over polling. */
  const [simulatedOverrides, setSimulatedOverrides] = useState<Record<string, SectorStatus>>({});

  // Clock
  useEffect(() => {
    setClock(Date.now());
    const id = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /** Called by AgentWarRoom when chaos starts or a sector is restored. */
  const handleChaosStateChange = useCallback(
    (sector: string, status: SectorStatus) => {
      setSimulatedOverrides((prev) => ({ ...prev, [sector]: status }));
    },
    []
  );

  /** Called when the loop starts — initialise all sectors to nominal. */
  const handleLoopInit = useCallback((sectorIds: readonly string[]) => {
    const init: Record<string, SectorStatus> = {};
    for (const s of sectorIds) init[s] = "nominal";
    setSimulatedOverrides(init);
  }, []);

  /** Called when the loop stops — clear overrides. */
  const handleLoopStop = useCallback(() => {
    setSimulatedOverrides({});
  }, []);

  const pollSector = useCallback(async (sectorId: SectorId) => {
    const start = Date.now();
    try {
      const res = await fetch(`/api/grid/${sectorId}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      const latency = Date.now() - start;
      if (!res.ok) return { ok: false as const, latency, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { ok: true as const, latency, data };
    } catch {
      return { ok: false as const, latency: Date.now() - start, error: "unreachable" };
    }
  }, []);

  // Background polling — keeps sector data fresh
  useEffect(() => {
    let cancelled = false;
    async function tick() {
      if (cancelled) return;
      const results = await Promise.all(SECTORS.map((m) => pollSector(m.id)));
      setSectors((prev) =>
        prev.map((s, i) => {
          const result = results[i];
          let newStatus: SectorStatus;
          let newData = {
            load_pct: s.load_pct,
            frequency_hz: s.frequency_hz,
            voltage_kv: s.voltage_kv,
            generators_online: s.generators_online,
            generators_total: s.generators_total,
            capacity_mw: s.capacity_mw,
          };

          if (result.ok) {
            newData = {
              load_pct: result.data.load_pct ?? s.load_pct,
              frequency_hz: result.data.frequency_hz ?? s.frequency_hz,
              voltage_kv: result.data.voltage_kv ?? s.voltage_kv,
              generators_online: result.data.generators_online ?? s.generators_online,
              generators_total: result.data.generators_total ?? s.generators_total,
              capacity_mw: result.data.capacity_mw ?? s.capacity_mw,
            };
            newStatus = result.latency > LATENCY_DEGRADED_THRESHOLD ? "degraded" : "nominal";
          } else {
            newStatus = "offline";
          }

          return {
            ...s,
            ...newData,
            status: newStatus,
            prevStatus: newStatus !== s.status ? s.status : s.prevStatus,
            latency_ms: result.latency,
            lastSuccessAt: result.ok ? Date.now() : s.lastSuccessAt,
            consecutiveErrors: result.ok ? 0 : s.consecutiveErrors + 1,
            transitionAt: newStatus !== s.status ? Date.now() : s.transitionAt,
          };
        })
      );
    }
    void tick();
    const id = setInterval(() => void tick(), POLL_INTERVAL);
    return () => { cancelled = true; clearInterval(id); };
  }, [pollSector]);

  // Sound on real K8s transitions
  const prevSectorsRef = useRef<SectorState[]>([]);
  useEffect(() => {
    sectors.forEach((sector, i) => {
      const prev = prevSectorsRef.current[i];
      if (!prev || prev.status === sector.status || prev.status === "unknown") return;
      if (sector.status === "offline") playSectorOffline();
      else if (sector.status === "degraded") playSectorDegraded();
    });
    prevSectorsRef.current = sectors;
  }, [sectors]);

  /** Flat status map — simulated overrides win. */
  const sectorStatusMap = useMemo(
    () => ({
      ...Object.fromEntries(sectors.map((s) => [s.meta.id, s.status])),
      ...simulatedOverrides,
    }) as Record<string, SectorStatus>,
    [sectors, simulatedOverrides]
  );

  const sectorMetricsMap = useMemo(
    () =>
      Object.fromEntries(
        sectors.map((s) => [
          s.meta.id,
          { load_pct: s.load_pct, frequency_hz: s.frequency_hz, voltage_kv: s.voltage_kv, latency_ms: s.latency_ms },
        ])
      ),
    [sectors]
  );

  const sys = overallSystemStatus(
    sectors.map((s) => {
      const override = simulatedOverrides[s.meta.id];
      return override ? { ...s, status: override } : s;
    })
  );

  return (
    <div className="flex h-screen flex-col bg-[#050508] text-zinc-50 selection:bg-emerald-500/30">
      {/* ── Thin header ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <span className="text-lg">⚡</span>
          <h1 className="text-base font-bold tracking-tight">National Grid Ops</h1>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            AI Defense Sim
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${sys.dot}`} />
            <span className={`font-mono text-xs font-bold tracking-wider ${sys.color}`}>
              {sys.label}
            </span>
          </div>
          {clock !== null && (
            <span className="font-mono text-[10px] tabular-nums text-zinc-600">
              {formatTime(clock)}
            </span>
          )}
        </div>
      </header>

      {/* ── Full-height AgentWarRoom — the single cinematic stage ──── */}
      <main className="min-h-0 flex-1">
        <AgentWarRoom
          sectorStatuses={sectorStatusMap}
          sectorMetrics={sectorMetricsMap}
          onChaosStateChange={handleChaosStateChange}
          onLoopInit={handleLoopInit}
          onLoopStop={handleLoopStop}
        />
      </main>
    </div>
  );
}

