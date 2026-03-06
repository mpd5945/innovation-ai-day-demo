"use client";

import { Suspense, useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

/* ─── Types ─────────────────────────────────────────── */

type SectorStatus = "nominal" | "degraded" | "offline" | "unknown";

interface FacilityModelProps {
  sectorStatuses: Record<string, SectorStatus>;
}

/* ─── Status → colour / intensity mapping ───────────── */

function statusEmissiveColor(status: SectorStatus): THREE.Color {
  switch (status) {
    case "nominal":
      return new THREE.Color(0.05, 0.35, 0.2);   // soft emerald
    case "degraded":
      return new THREE.Color(0.5, 0.35, 0.05);    // warm amber
    case "offline":
      return new THREE.Color(0.45, 0.08, 0.08);   // deep red
    default:
      return new THREE.Color(0.12, 0.12, 0.14);   // dark grey
  }
}

function statusEmissiveIntensity(status: SectorStatus): number {
  switch (status) {
    case "nominal":  return 0.2;
    case "degraded": return 0.45;
    case "offline":  return 0.12;
    default:         return 0.08;
  }
}

function statusLightColor(status: SectorStatus): THREE.Color {
  switch (status) {
    case "nominal":  return new THREE.Color(0.1, 0.85, 0.55);
    case "degraded": return new THREE.Color(0.96, 0.62, 0.04);
    case "offline":  return new THREE.Color(0.94, 0.27, 0.27);
    default:         return new THREE.Color(0.3, 0.3, 0.35);
  }
}

function statusLightIntensity(status: SectorStatus): number {
  switch (status) {
    case "nominal":  return 0.6;
    case "degraded": return 1.2;
    case "offline":  return 0.15;
    default:         return 0.3;
  }
}

/* ─── Quadrant assignment ───────────────────────────── *
 * Model bounds: x ≈ [-95, 21],  z ≈ [-88, 41]
 * Center:       x ≈ -37,        z ≈ -22
 *
 * Quadrants (using mesh centroid):
 *   NE = x > center && z < center  (positive-x, negative-z)
 *   SE = x > center && z > center  (positive-x, positive-z)
 *   CT = x < center && z > center  (negative-x, positive-z)
 *   WE = x < center && z < center  (negative-x, negative-z)
 */

const MODEL_CENTER_X = -37;
const MODEL_CENTER_Z = -22;

const MODEL_SCALE = 0.6;

const SECTOR_KEYS: string[] = ["northeast", "southeast", "central", "western"];
const SECTOR_LABELS: string[] = ["NE", "SE", "CT", "WE"];

function quadrantForCentroid(cx: number, cz: number): string {
  if (cx > MODEL_CENTER_X && cz < MODEL_CENTER_Z) return "northeast";
  if (cx > MODEL_CENTER_X && cz >= MODEL_CENTER_Z) return "southeast";
  if (cx <= MODEL_CENTER_X && cz >= MODEL_CENTER_Z) return "central";
  return "western";
}

/* ─── Sector point lights ───────────────────────────── */

const LIGHT_POSITIONS: [number, number, number][] = [
  [2.2, 1.8, -2.2],   // NE
  [2.2, 1.8, 2.2],    // SE
  [-2.2, 1.8, 2.2],   // CT
  [-2.2, 1.8, -2.2],  // WE
];

function SectorLight({
  position,
  status,
  sectorIndex,
}: {
  position: [number, number, number];
  status: SectorStatus;
  sectorIndex: number;
}) {
  const ref = useRef<THREE.PointLight>(null);
  const color = statusLightColor(status);
  const intensity = statusLightIntensity(status);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (status === "degraded") {
      ref.current.intensity = intensity + Math.sin(clock.getElapsedTime() * 3 + sectorIndex * 1.5) * 0.4;
    } else if (status === "offline") {
      ref.current.intensity = Math.random() > 0.9 ? 0.8 : 0.05;
    } else {
      ref.current.intensity = intensity;
    }
  });

  return <pointLight ref={ref} position={position} color={color} intensity={intensity} distance={6} />;
}

/* ─── The GLB model with per-sector zone colouring ──── */

function Facility({ sectorStatuses }: FacilityModelProps) {
  const { scene } = useGLTF("/power_grid_facility.glb");

  // Clone materials once so each mesh can have independent emissive
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        child.material = (child.material as THREE.MeshStandardMaterial).clone();
      }
    });
  }, [scene]);

  // Per-frame: compute each mesh centroid → quadrant → apply sector emissive
  useFrame(({ clock }) => {
    const box = new THREE.Box3();
    const center = new THREE.Vector3();

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mat = child.material as THREE.MeshStandardMaterial;
      if (!mat.isMeshStandardMaterial) return;

      // Compute world-space centroid of the mesh
      box.setFromObject(child);
      box.getCenter(center);

      // Map to quadrant (use unscaled model coords — scale & offset cancel out
      // because all meshes share the same parent transform)
      const sector = quadrantForCentroid(
        child.geometry.boundingBox
          ? (child.geometry.boundingBox.min.x + child.geometry.boundingBox.max.x) / 2
          : center.x,
        child.geometry.boundingBox
          ? (child.geometry.boundingBox.min.z + child.geometry.boundingBox.max.z) / 2
          : center.z
      );

      const status = sectorStatuses[sector] ?? "unknown";
      const targetColor = statusEmissiveColor(status);
      let targetIntensity = statusEmissiveIntensity(status);

      // Animate degraded pulse
      if (status === "degraded") {
        targetIntensity += Math.sin(clock.getElapsedTime() * 3) * 0.12;
      }
      // Animate offline flicker
      if (status === "offline") {
        targetIntensity = Math.random() > 0.88 ? 0.35 : 0.04;
      }

      // Smooth lerp to target
      mat.emissive.lerp(targetColor, 0.08);
      mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * 0.1;
    });
  });

  return (
    <primitive object={scene} scale={MODEL_SCALE} position={[0, -1.2, 0]} />
  );
}

/* ─── Post-processing effects driven by chaos state ─── */

function ChaosPostProcessing({ sectorStatuses }: FacilityModelProps) {
  const statuses = Object.values(sectorStatuses);
  const offlineCount = statuses.filter((s) => s === "offline").length;
  const degradedCount = statuses.filter((s) => s === "degraded").length;

  // Scale effects based on how much chaos is happening
  const severity = offlineCount * 0.25 + degradedCount * 0.1; // 0 → 1

  const bloomIntensity = 0.4 + severity * 1.2;
  const chromaticOffset = severity * 0.003;
  const vignetteStrength = 0.3 + severity * 0.25;

  const offsetRef = useRef(new THREE.Vector2(chromaticOffset, chromaticOffset));

  useFrame(() => {
    const target = severity * 0.003;
    offsetRef.current.x += (target - offsetRef.current.x) * 0.05;
    offsetRef.current.y += (target - offsetRef.current.y) * 0.05;
  });

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.35}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={offsetRef.current}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette
        eskil={false}
        offset={0.1}
        darkness={vignetteStrength}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}

/* ─── Camera setup ──────────────────────────────────── */

// The model is positioned downwards (y ≈ -1.2), so bias target slightly down.
// Camera is placed at [-1.7, 2.9, -6.3] — original position rotated 30° right around Y-axis.
const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, -0.6, 0];
const DEFAULT_CAMERA_POSITION: [number, number, number] = [-1.7, 2.9, -6.3];

function AutoFit() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA_POSITION);
    camera.lookAt(...DEFAULT_CAMERA_TARGET);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/* ─── Loading state ─────────────────────────────────── */

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        <p className="text-xs text-zinc-500">Loading facility model…</p>
      </div>
    </div>
  );
}

/* ─── Exported wrapper ──────────────────────────────── */

export default function FacilityViewer({ sectorStatuses }: FacilityModelProps) {
  const statuses = Object.values(sectorStatuses);
  const hasOffline = statuses.some((s) => s === "offline");
  const hasDegraded = statuses.some((s) => s === "degraded");

  const borderColor = hasOffline
    ? "border-red-500/20"
    : hasDegraded
      ? "border-amber-500/20"
      : "border-emerald-500/10";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-[#0c0c14] ${borderColor} transition-all duration-700`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏭</span>
          <h2 className="text-sm font-semibold text-zinc-200">Facility Overview</h2>
        </div>
        <span className="text-[10px] text-zinc-600">3D Model · Static camera</span>
      </div>

      {/* Canvas */}
      <div className="h-[480px] w-full">
        <Suspense fallback={<LoadingFallback />}>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ fov: 40, near: 0.1, far: 100 }}
          >
            <AutoFit />

            {/* Base lighting */}
            <ambientLight intensity={0.2} />
            <directionalLight position={[5, 8, 5]} intensity={0.5} color="#e0e8ff" />
            <directionalLight position={[-4, 6, -3]} intensity={0.15} color="#a0b0ff" />

            {/* Sector point lights */}
            {SECTOR_KEYS.map((key, i) => (
              <SectorLight
                key={key}
                position={LIGHT_POSITIONS[i]}
                status={sectorStatuses[key] ?? "unknown"}
                sectorIndex={i}
              />
            ))}

            {/* The model — per-sector zone highlighting */}
            <Facility sectorStatuses={sectorStatuses} />

            {/* Ground shadow */}
            <ContactShadows
              position={[0, -1.2, 0]}
              opacity={0.3}
              scale={10}
              blur={2}
              far={4}
            />

            {/* Environment */}
            <Environment preset="night" />

            {/* Post-processing FX */}
            <ChaosPostProcessing sectorStatuses={sectorStatuses} />
          </Canvas>
        </Suspense>
      </div>

      {/* Sector legend */}
      <div className="flex items-center justify-center gap-6 border-t border-white/5 px-5 py-2.5">
        {SECTOR_KEYS.map((key, i) => {
          const status = sectorStatuses[key] ?? "unknown";
          const dotColor =
            status === "nominal"
              ? "bg-emerald-400"
              : status === "degraded"
                ? "bg-amber-400 animate-pulse"
                : status === "offline"
                  ? "bg-red-500 animate-pulse"
                  : "bg-zinc-600";
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
              <span className="font-mono text-[10px] text-zinc-500">{SECTOR_LABELS[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Preload the model
useGLTF.preload("/power_grid_facility.glb");
