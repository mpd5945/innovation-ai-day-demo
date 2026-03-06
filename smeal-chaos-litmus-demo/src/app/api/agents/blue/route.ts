/**
 * /api/agents/blue
 * ─────────────────────────────────────────────────────────────────────────────
 * Blue Agent — Monitors telemetry, diagnoses anomalies, narrates root-cause
 * analysis, and executes automated Kubernetes remediation.
 *
 * POST body: { telemetry: object, scenario?: object, events?: array }
 *
 * SSE messages:
 *   data: {"type":"narrative","text":"..."}   — streaming detection narrative
 *   data: {"type":"action","text":"..."}      — kubectl remediation taken
 *   data: {"type":"status","phase":"..."}     — detecting | remediating | recovered
 *   data: [DONE]
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { restartSectorDeployment } from "@/app/lib/kubectl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const enc = new TextEncoder();

type MsgType = "narrative" | "action" | "status" | "error";

function sse(type: MsgType, payload: Record<string, unknown>): Uint8Array {
  return enc.encode(`data: ${JSON.stringify({ type, ...payload })}\n\n`);
}
function sseDone() {
  return enc.encode(`data: [DONE]\n\n`);
}

async function* simulateStream(text: string) {
  const words = text.split(" ");
  for (const word of words) {
    yield word + " ";
    await new Promise((r) => setTimeout(r, 14 + Math.random() * 18));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    telemetry,
    scenario,
  } = body as {
    telemetry?: Record<string, unknown>;
    scenario?: {
      id: string;
      name: string;
      targetSector: string;
      sectorLabel: string;
      blueNarrative?: string;
    };
  };

  const stream = new ReadableStream({
    async start(controller) {
      const enqNarrative = (text: string) =>
        controller.enqueue(sse("narrative", { text }));

      controller.enqueue(sse("status", { phase: "detecting" }));

      try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || !scenario) {
          /* ── Fallback: stream pre-written blue narrative ─────────────── */
          const narrative = scenario?.blueNarrative ?? buildFallbackNarrative(telemetry);
          for await (const chunk of simulateStream(narrative)) {
            enqNarrative(chunk);
          }
        } else {
          /* ── OpenAI streaming ─────────────────────────────────────────── */
          const client = new OpenAI({
            apiKey,
            baseURL: process.env.OPENAI_API_BASE,
          });

          const offlineSectors = extractOffline(telemetry);
          const degradedSectors = extractDegraded(telemetry);

          const systemPrompt = `You are the Blue Agent — a defensive AI in a critical infrastructure security operations center.
You detect anomalies, diagnose root causes using cyber threat intelligence, and orchestrate automated remediation.
Your analysis should reference the MITRE ATT&CK for ICS framework, relevant CVEs, and real-world attack precedents.
Format: plain prose narration of your detection process, root cause analysis, and remediation steps — like a SOC analyst thinking out loud.
Tone: urgent, precise, methodical. Max 220 words. No markdown.`;

          const userPrompt = `ACTIVE ANOMALY:
Target sector: ${scenario.targetSector} (${scenario.sectorLabel})
Attack technique: ${scenario.id} — ${scenario.name}

Offline sectors: ${offlineSectors.join(", ") || "none"}
Degraded sectors: ${degradedSectors.join(", ") || "none"}
Telemetry: ${JSON.stringify(telemetry ?? {}, null, 2).slice(0, 600)}

Narrate your detection, root-cause diagnosis, and automated remediation. Begin with "[BLUE AGENT — ANOMALY DETECTION]".`;

          const completion = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
            max_tokens: 380,
            temperature: 0.7,
          });

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) enqNarrative(text);
          }
        }

        /* ── Execute remediation ──────────────────────────────────────────── */
        controller.enqueue(sse("status", { phase: "remediating" }));

        if (scenario?.targetSector) {
          controller.enqueue(
            sse("action", {
              text: `\n\n🛡 Executing: kubectl rollout restart deployment/grid-sector-${scenario.targetSector} -n smeal-day`,
            })
          );

          const result = await restartSectorDeployment(scenario.targetSector);

          controller.enqueue(
            sse("action", {
              text: result.ok
                ? `✓ Rollout restart triggered for ${scenario.sectorLabel}. Pod will cycle and flush injected chaos rules. ETA: 15–30s.`
                : `⚠ Rollout returned: ${result.stderr || result.stdout || "no output"} (cluster may be unreachable — recovery still proceeding via chaos engine timeout)`,
            })
          );
        }

        controller.enqueue(sse("status", { phase: "recovered" }));
      } catch (err) {
        controller.enqueue(
          sse("error", {
            text: `Blue Agent error: ${err instanceof Error ? err.message : String(err)}`,
          })
        );
      }

      controller.enqueue(sseDone());
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function extractOffline(telemetry: Record<string, unknown> | undefined): string[] {
  const sectors = telemetry?.sectors as Record<string, { ok?: boolean }> | undefined;
  if (!sectors) return [];
  return Object.entries(sectors).filter(([, v]) => !v.ok).map(([k]) => k);
}

function extractDegraded(telemetry: Record<string, unknown> | undefined): string[] {
  const sectors = telemetry?.sectors as
    | Record<string, { ok?: boolean; latency?: number }>
    | undefined;
  if (!sectors) return [];
  return Object.entries(sectors)
    .filter(([, v]) => v.ok && (v.latency ?? 0) > 800)
    .map(([k]) => k);
}

function buildFallbackNarrative(telemetry: Record<string, unknown> | undefined): string {
  const offline = extractOffline(telemetry);
  const degraded = extractDegraded(telemetry);

  if (offline.length === 0 && degraded.length === 0) {
    return "[BLUE AGENT — MONITORING]\n\nAll sectors nominal. No anomalies detected. Baseline telemetry looks clean. Continuing passive monitoring across all four grid sectors. Threat detection algorithms running. System ready.";
  }

  return `[BLUE AGENT — ANOMALY DETECTION]\n\nALERT: ${
    offline.length ? `Sectors offline: ${offline.join(", ").toUpperCase()}. ` : ""
  }${
    degraded.length ? `Sectors degraded: ${degraded.join(", ").toUpperCase()}. ` : ""
  }\n\nCorrelating against threat intelligence database... Pattern analysis running... Identifying root cause... Deploying automated remediation sequence. Rollout restart executing. Recovery monitoring initiated.`;
}
