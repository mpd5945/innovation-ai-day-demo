/**
 * /api/telemetry — Aggregated snapshot of all four grid sectors.
 * Fans out to each sector's /api/grid/[sector] proxy and returns a
 * combined JSON payload for use by AI agents and the analyst.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SECTORS = ["northeast", "southeast", "central", "western"] as const;
type SectorId = (typeof SECTORS)[number];

const SECTOR_ENDPOINTS: Record<SectorId, string> = {
  northeast: process.env.GRID_NORTHEAST_URL || "http://localhost:30081",
  southeast: process.env.GRID_SOUTHEAST_URL || "http://localhost:30082",
  central: process.env.GRID_CENTRAL_URL || "http://localhost:30083",
  western: process.env.GRID_WESTERN_URL || "http://localhost:30084",
};

async function fetchSector(sector: SectorId) {
  const start = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4_000);
    const res = await fetch(`${SECTOR_ENDPOINTS[sector]}/api/status`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    const latency = Date.now() - start;
    if (!res.ok) return { sector, ok: false, latency, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { sector, ok: true, latency, ...data };
  } catch (err) {
    return {
      sector,
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export async function GET() {
  const results = await Promise.all(SECTORS.map(fetchSector));

  const snapshot = {
    timestamp: Date.now(),
    sectors: Object.fromEntries(results.map((r) => [r.sector, r])),
    summary: {
      offline: results.filter((r) => !r.ok).map((r) => r.sector),
      degraded: results
        .filter((r) => r.ok && r.latency > 800)
        .map((r) => r.sector),
      nominal: results.filter((r) => r.ok && r.latency <= 800).map((r) => r.sector),
    },
  };

  return NextResponse.json(snapshot);
}
