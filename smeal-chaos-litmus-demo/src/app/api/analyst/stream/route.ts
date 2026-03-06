/**
 * /api/analyst/stream
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts a POST with the current grid telemetry snapshot.
 * Streams a human-readable "Situation Awareness Brief" via SSE using OpenAI
 * (or a built-in fallback if no API key is configured).
 *
 * SSE message format:  data: {"text":"..."}\n\n
 * Terminal signal:      data: [DONE]\n\n
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const enc = new TextEncoder();

function sseChunk(text: string): Uint8Array {
  return enc.encode(`data: ${JSON.stringify({ text })}\n\n`);
}
function sseDone(): Uint8Array {
  return enc.encode(`data: [DONE]\n\n`);
}

/** Stream text character-by-character with a small jitter delay (fallback mode) */
async function* simulateStream(text: string) {
  const words = text.split(" ");
  for (const word of words) {
    yield word + " ";
    await new Promise((r) => setTimeout(r, 18 + Math.random() * 22));
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const { telemetry, scenario } = body as {
    telemetry?: Record<string, unknown>;
    scenario?: { id: string; name: string; targetSector: string; analystBrief?: string };
  };

  const ts = new Date().toLocaleTimeString("en-US", { hour12: false });

  const stream = new ReadableStream({
    async start(controller) {
      const enq = (text: string) => controller.enqueue(sseChunk(text));

      // Build the rich pre-written fallback up-front — used whenever OpenAI
      // is unavailable, slow, or returns an error.  This guarantees a great
      // demo experience regardless of network conditions at the event.
      const fallbackBrief =
        scenario?.analystBrief?.replace("{ts}", ts) ??
        buildFallbackBrief(telemetry, ts);

      let usedOpenAI = false;

      try {
        const apiKey = process.env.OPENAI_API_KEY?.trim();

        if (apiKey) {
          /* ── Try OpenAI with a hard 18-second timeout ───────────────── */
          const abort = new AbortController();
          const timeoutId = setTimeout(() => abort.abort(), 18_000);

          const client = new OpenAI({
            apiKey,
            baseURL: process.env.OPENAI_API_BASE?.trim() || undefined,
          });

          const systemPrompt = `You are a SCADA/ICS security analyst briefing a busy operations commander.
Write a BLUF (Bottom Line Up Front) — exactly 3 sentences, no headers, no bullet points, no markdown.
Sentence 1 (BOTTOM LINE): what is failing right now and confirmed attack type.
Sentence 2 (IMPACT): specific dollar exposure per minute, companies/sectors affected, cascade risk if not contained.
Sentence 3 (AI RESPONSE): what the AI system detected, how fast, and what remediation is executing.
Max 60 words total. High urgency. Plain text only.`;

          const offlineSectors = extractOffline(telemetry);
          const degradedSectors = extractDegraded(telemetry);

          const userPrompt = scenario
            ? `ACTIVE CHAOS EXPERIMENT: ${scenario.id} — ${scenario.name}
Target sector: ${scenario.targetSector}
Timestamp: ${ts}
Offline sectors: ${offlineSectors.join(", ") || "none"}
Degraded sectors: ${degradedSectors.join(", ") || "none"}
Write the situation awareness brief now.`
            : `Current grid state at ${ts}. Offline: ${offlineSectors.join(", ") || "none"}. Degraded: ${degradedSectors.join(", ") || "none"}. Write a brief situation awareness summary.`;

          try {
            const completion = await client.chat.completions.create(
              {
                model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                stream: true,
                max_tokens: 100,
                temperature: 0.65,
              },
              { signal: abort.signal }
            );

            clearTimeout(timeoutId);
            usedOpenAI = true;

            for await (const chunk of completion) {
              const text = chunk.choices[0]?.delta?.content ?? "";
              if (text) enq(text);
            }
          } catch {
            // OpenAI failed (connection error, timeout, rate limit, bad key…)
            // Fall through to stream the rich pre-written brief below.
            clearTimeout(timeoutId);
          }
        }
      } catch {
        // Outer catch for any unexpected errors — always fall through to fallback.
      }

      if (!usedOpenAI) {
        /* ── Fallback: stream the rich pre-written brief ────────────────── */
        for await (const chunk of simulateStream(fallbackBrief)) {
          enq(chunk);
        }
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

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function extractOffline(telemetry: Record<string, unknown> | undefined): string[] {
  if (!telemetry) return [];
  const sectors = telemetry.sectors as Record<string, { ok?: boolean }> | undefined;
  if (!sectors) return [];
  return Object.entries(sectors)
    .filter(([, v]) => !v.ok)
    .map(([k]) => k);
}

function extractDegraded(telemetry: Record<string, unknown> | undefined): string[] {
  if (!telemetry) return [];
  const sectors = telemetry.sectors as
    | Record<string, { ok?: boolean; latency?: number }>
    | undefined;
  if (!sectors) return [];
  return Object.entries(sectors)
    .filter(([, v]) => v.ok && (v.latency ?? 0) > 800)
    .map(([k]) => k);
}

function buildFallbackBrief(
  telemetry: Record<string, unknown> | undefined,
  ts: string
): string {
  const offline = extractOffline(telemetry);
  const degraded = extractDegraded(telemetry);

  if (offline.length === 0 && degraded.length === 0) {
    return `BOTTOM LINE: All four grid sectors nominal — no adversary activity detected at ${ts}. No customer or financial exposure; all frequency, voltage, and load telemetry within safe operating bands. AI monitoring continuously active across all SCADA endpoints with zero anomalies flagged.`;
  }

  const offlineUpper = offline.map((s) => s.toUpperCase()).join(", ");
  const degradedUpper = degraded.map((s) => s.toUpperCase()).join(", ");
  const affected = [...offline, ...degraded].map((s) => s.toUpperCase()).join(", ");

  return `BOTTOM LINE: ${offline.length ? `${offlineUpper} sector offline` : `${degradedUpper} sector degraded`} — active cyberattack confirmed, attack surface consistent with deliberate adversary action at ${ts}. Financial exposure running at an estimated $100K–$280K per minute across affected industrial and commercial load; cascade risk to adjacent sectors rises sharply beyond the 90-second containment window. AI correlated the anomaly signature in under 3 seconds and Blue Agent remediation is executing now — containment expected within 60–90 seconds.`;
}
