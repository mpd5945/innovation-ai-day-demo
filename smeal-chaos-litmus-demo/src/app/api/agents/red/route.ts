/**
 * /api/agents/red
 * ─────────────────────────────────────────────────────────────────────────────
 * Red Agent — Analyzes the deployed infrastructure topology, selects the most
 * disruptive chaos experiment informed by MITRE ATT&CK for ICS and real CVEs,
 * applies the LitmusChaos YAML, and streams its planning narrative via SSE.
 *
 * POST body: { cycle: number, telemetry?: object }
 *
 * SSE messages:
 *   data: {"type":"narrative","text":"..."}   — streaming agent text
 *   data: {"type":"action","text":"..."}      — kubectl action taken
 *   data: {"type":"scenario","scenario":{...}} — selected scenario metadata
 *   data: [DONE]
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { getScenarioForCycle, getScenarioForSector, ATTACK_SCENARIOS } from "@/app/lib/agent-knowledge";
import { applyChaosExperiment } from "@/app/lib/kubectl";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const enc = new TextEncoder();

type MsgType = "narrative" | "action" | "scenario" | "error";

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
  const { cycle = 0, telemetry, sector } = body as {
    cycle?: number;
    telemetry?: Record<string, unknown>;
    sector?: "northeast" | "southeast" | "central" | "western";
  };

  // Interactive mode: if a specific sector was requested, use that; otherwise fall back to cycle-based
  const scenario = sector
    ? getScenarioForSector(sector) ?? getScenarioForCycle(cycle)
    : getScenarioForCycle(cycle);

  const stream = new ReadableStream({
    async start(controller) {
      const enqNarrative = (text: string) =>
        controller.enqueue(sse("narrative", { text }));

      // Emit scenario metadata immediately so the UI can show the tactic/CVE
      controller.enqueue(
        sse("scenario", {
          scenario: {
            id: scenario.id,
            name: scenario.name,
            cve: scenario.cve,
            targetSector: scenario.targetSector,
            sectorLabel: scenario.sectorLabel,
            sectorAbbr: scenario.sectorAbbr,
            impact: scenario.impact,
            duration: scenario.duration,
          },
        })
      );

      try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
          /* ── Fallback: stream the pre-written narrative ──────────────── */
          for await (const chunk of simulateStream(scenario.redNarrative)) {
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

          // Build a topology summary for the AI
          const topologySummary = ATTACK_SCENARIOS.map((s) => {
            const sData = (telemetry?.sectors as Record<string, { load_pct?: number; latency_ms?: number; ok?: boolean }>)?.[s.targetSector];
            const state = !sData?.ok
              ? "OFFLINE"
              : (sData.latency_ms ?? 0) > 800
              ? "DEGRADED"
              : "nominal";
            return `${s.sectorAbbr} (${s.sectorLabel}): ${state}, load=${sData?.load_pct ?? "?"}%`;
          }).join("\n");

          const systemPrompt = `You are the Red Agent in an adversarial simulation for a critical infrastructure resilience demonstration at a university AI innovation day.
You embody a highly sophisticated threat actor analyzing ICS/SCADA infrastructure to identify and exploit the highest-impact attack vector.
Your role: explain your attack planning in detail — the vulnerability you're exploiting, why this target, what the cascading impact will be, and how this attack would play out in a real grid scenario.
Ground your analysis in the selected MITRE ATT&CK for ICS technique and the associated CVE.
Tone: cold, analytical, methodical — like APT41 or Sandworm. Max 200 words. No markdown.`;

          const userPrompt = `Current grid topology:
${topologySummary}

Offline sectors: ${offlineSectors.join(", ") || "none"}
Degraded sectors: ${degradedSectors.join(", ") || "none"}

Selected attack: ${scenario.id} — ${scenario.name}
CVE: ${scenario.cve} — ${scenario.cveDescription}
Target: ${scenario.sectorLabel} (${scenario.sectorAbbr})
Chaos experiment: ${scenario.chaosYamlFile}
Expected impact: ${scenario.impact}
Duration: ${scenario.duration}s

Write your attack planning narrative now. Begin with "[RED AGENT — THREAT ANALYSIS]".`;

          const completion = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            stream: true,
            max_tokens: 350,
            temperature: 0.85,
          });

          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) enqNarrative(text);
          }
        }

        /* ── Apply the chaos experiment ─────────────────────────────────── */
        controller.enqueue(
          sse("action", {
            text: `\n\n⚡ Deploying ${scenario.chaosYamlFile} → kubectl apply -f k8s/${scenario.chaosYamlFile}`,
          })
        );

        const result = await applyChaosExperiment(
          scenario.chaosYamlFile,
          scenario.chaosEngineName
        );

        controller.enqueue(
          sse("action", {
            text: result.ok
              ? `✓ ChaosEngine "${scenario.chaosEngineName}" deployed. Chaos duration: ${scenario.duration}s.`
              : `⚠ kubectl returned: ${result.stderr || result.stdout || "no output"} (experiment may already be running or cluster unreachable — dashboard effects will still simulate)`,
          })
        );
      } catch (err) {
        controller.enqueue(
          sse("error", {
            text: `Red Agent error: ${err instanceof Error ? err.message : String(err)}`,
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
