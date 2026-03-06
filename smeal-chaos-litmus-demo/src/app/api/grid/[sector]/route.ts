import { NextRequest, NextResponse } from "next/server";

const SECTOR_ENDPOINTS: Record<string, string> = {
  northeast: process.env.GRID_NORTHEAST_URL || "http://localhost:30081",
  southeast: process.env.GRID_SOUTHEAST_URL || "http://localhost:30082",
  central: process.env.GRID_CENTRAL_URL || "http://localhost:30083",
  western: process.env.GRID_WESTERN_URL || "http://localhost:30084",
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
) {
  const { sector } = await params;
  const baseUrl = SECTOR_ENDPOINTS[sector];

  if (!baseUrl) {
    return NextResponse.json(
      { _ok: false, sector, error: "Unknown sector" },
      { status: 404 }
    );
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/api/status`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { _ok: false, sector, error: `Upstream ${res.status}`, latency_ms: Date.now() - start },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ ...data, _ok: true, latency_ms: Date.now() - start });
  } catch (err) {
    return NextResponse.json(
      {
        _ok: false,
        sector,
        error: err instanceof Error ? err.message : "Service unreachable",
        latency_ms: Date.now() - start,
      },
      { status: 502 }
    );
  }
}
