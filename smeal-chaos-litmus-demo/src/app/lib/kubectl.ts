/**
 * kubectl.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side helper for running kubectl commands from Next.js API routes.
 * Works on Windows (PowerShell / CMD) and Linux/macOS.
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/** Absolute path to the k8s/ directory */
export const K8S_DIR = path.join(
  process.cwd(),
  "k8s"
);

export interface KubectlResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

/** Run an arbitrary kubectl command and return stdout/stderr */
export async function kubectl(args: string): Promise<KubectlResult> {
  try {
    const { stdout, stderr } = await execAsync(`kubectl ${args}`, {
      timeout: 15_000,
      shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
    });
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    return {
      ok: false,
      stdout: e.stdout?.trim() ?? "",
      stderr: e.stderr?.trim() ?? e.message ?? "kubectl error",
    };
  }
}

/**
 * Apply a chaos YAML file from the k8s/ directory.
 * First attempts to delete a pre-existing engine with the same name (idempotent).
 */
export async function applyChaosExperiment(
  yamlFile: string,
  engineName: string
): Promise<KubectlResult> {
  // Best-effort cleanup of any lingering engine with the same name
  await kubectl(
    `delete chaosengine ${engineName} -n smeal-day --ignore-not-found=true`
  );

  // Small settle delay so the CRD controller processes the deletion
  await sleep(1500);

  const filePath = path.join(K8S_DIR, yamlFile);
  return kubectl(`apply -f "${filePath}"`);
}

/** Restart a sector deployment (flushes tc netem / CPU hog state) */
export async function restartSectorDeployment(
  sector: string
): Promise<KubectlResult> {
  return kubectl(
    `rollout restart deployment/grid-sector-${sector} -n smeal-day`
  );
}

/** Get pod status for all smeal-day pods (compact form) */
export async function getSectorPodStatus(): Promise<
  Array<{ name: string; ready: string; status: string; restarts: string; age: string }>
> {
  const result = await kubectl(
    `get pods -n smeal-day -o custom-columns=NAME:.metadata.name,READY:.status.containerStatuses[0].ready,STATUS:.status.phase,RESTARTS:.status.containerStatuses[0].restartCount,AGE:.metadata.creationTimestamp --no-headers`
  );

  if (!result.ok || !result.stdout) return [];

  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", ready = "", status = "", restarts = "", age = ""] =
        line.split(/\s+/);
      return { name, ready, status, restarts, age };
    });
}

/** Get running ChaosEngines in smeal-day namespace */
export async function getActiveChaosEngines(): Promise<string[]> {
  const result = await kubectl(
    `get chaosengine -n smeal-day -o jsonpath='{.items[*].metadata.name}' 2>/dev/null`
  );
  if (!result.ok || !result.stdout) return [];
  return result.stdout.split(/\s+/).filter(Boolean);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
