/**
 * agent-knowledge.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Structured knowledge base used by the Red and Blue agents.
 * Each scenario maps a MITRE ATT&CK for ICS technique + real CVE to a
 * LitmusChaos experiment targeting one of the four grid sectors.
 */

export type ImpactLevel = "degraded" | "offline";

export interface AttackScenario {
  /** MITRE ATT&CK for ICS technique ID */
  id: string;
  /** Human-readable technique name */
  name: string;
  /** Associated real-world CVE */
  cve: string;
  /** One-line CVE description */
  cveDescription: string;
  /** Filename under k8s/ to kubectl-apply */
  chaosYamlFile: string;
  /** ChaosEngine .metadata.name — used for cleanup */
  chaosEngineName: string;
  /** Which sector this experiment targets */
  targetSector: "northeast" | "southeast" | "central" | "western";
  sectorLabel: string;
  sectorAbbr: string;
  /** Approximate chaos duration in seconds */
  duration: number;
  /** Expected dashboard impact */
  impact: ImpactLevel;
  /** Red Agent planning narrative (streamed to audience) */
  redNarrative: string;
  /** Blue Agent detection & response narrative (streamed to audience) */
  blueNarrative: string;
  /** Analyst situation awareness brief (streamed to audience) */
  analystBrief: string;
}

export const ATTACK_SCENARIOS: AttackScenario[] = [
  /* ── Experiment 1 ─────────────────────────────────────────────────────── */
  {
    id: "T0816",
    name: "Device Restart / Shutdown",
    cve: "CVE-2021-22657",
    cveDescription:
      "Rockwell Automation FactoryTalk Services Platform — Authentication bypass enables unauthorized process termination",
    chaosYamlFile: "engine-northeast-pod-delete.yml",
    chaosEngineName: "grid-northeast-pod-delete",
    targetSector: "northeast",
    sectorLabel: "Northeast Corridor",
    sectorAbbr: "NE",
    duration: 60,
    impact: "offline",
    redNarrative: `[RED AGENT — THREAT ANALYSIS]

Technique: MITRE ATT&CK for ICS — T0816 Device Restart/Shutdown
CVE Reference: CVE-2021-22657 (Rockwell Automation FactoryTalk)
Target: Northeast Corridor · grid-sector-northeast · Port 30081

Reconnaissance complete. Northeast sector running at 62% load capacity with 4 of 5 generators online. Authentication boundary analysis identified a FactoryTalk-class vulnerability pattern: the controller process accepts unauthenticated restart commands over the management interface.

Historical analog: This technique was observed in the 2015 Ukraine power attack (BlackEnergy) — adversaries forced SCADA process termination to deny operator visibility during the physical switching phase of the attack. The 6-minute blind window that followed allowed attackers to complete switching operations without detection.

Deploying pod-delete chaos experiment. Kubernetes will terminate the running pod and suppress restart for 60 seconds. During this window, NE sector telemetry will be completely dark. Impact assessment: HIGH. New England through Pennsylvania blind.

Initiating attack...`,

    blueNarrative: `[BLUE AGENT — ANOMALY DETECTION]

ALERT: Northeast Corridor offline. All telemetry feeds interrupted.

Signature analysis running... Process termination confirmed — this is not hardware failure. The pod was actively terminated. Pattern matching against MITRE ATT&CK for ICS: HIGH confidence match on T0816 Device Restart/Shutdown. Cross-referencing with CVE-2021-22657 FactoryTalk authentication bypass profile: MATCH.

Threat intelligence: Termination-based attacks in ICS environments typically precede physical manipulation attempts. The adversary wants a blind window. We cannot give them one.

Automated response sequence activating:
  [1] Flagging event as potential adversarial activity — escalating to Tier 2
  [2] Isolating NE subnet from cross-sector coordination to prevent cascade spread
  [3] Switching NE load monitoring to tie-line differential calculations via CT and SE
  [4] Triggering emergency pod restart: kubectl rollout restart deployment/grid-sector-northeast -n smeal-day
  [5] Activating enhanced logging — capturing all pre-incident network flows for forensics

Rollout restart deployed. Kubernetes readiness probe monitoring... Estimated restoration: 15–30 seconds.

Post-incident action required: Deploy pod anti-affinity rules and implement process-level authentication for all controller management interfaces.`,

    analystBrief: `SITUATION AWARENESS BRIEF — NORTHEAST CORRIDOR OFFLINE
Timestamp: {ts} | Severity: CRITICAL | Technique: T0816

WHAT IS FAILING
Northeast Corridor SCADA controller has gone completely dark — all telemetry interrupted, Kubernetes pod forcibly terminated. This is not a network blip. An adversary has forced a blind window, exactly as observed in the 2015 Ukraine grid attack that knocked out power for 230,000 people.

BUSINESS EXPOSURE
The NE sector powers 28 million people from Maine to Pennsylvania — Wall Street trading floors, Boston's biotech corridor, every major Northeastern hospital system, and four of the top-ten U.S. data center markets. A sustained 1-hour outage in this corridor carries an estimated $700M+ in direct economic losses. Financial exchanges maintain UPS backup for ~15 minutes; after that, trading halts. The reputational and regulatory exposure for any company with SLA-backed services here is immediate and measurable.

CASCADE RISK
The 2003 Northeast Blackout — triggered by a software alarm failure strikingly similar to this scenario — cost $10 billion, affected 55 million people, and took 4 days to fully restore. That cascade began with a single sector going blind, which masked overload conditions in adjacent areas until automatic relays triggered a domino collapse. We are at step one of that sequence right now.

WHY AI CHANGES THIS
This GenAI system detected and classified the attack technique — MITRE T0816 — and dispatched a Blue Agent response before a human analyst could have opened a trouble ticket. In production grid environments, machine-speed threat correlation compresses the adversary's blind window from minutes to seconds. That delta is the difference between a recoverable incident and a cascading blackout.

STRATEGIC RESPONSE
Kubernetes self-healing restores visibility within 60 seconds. Long-term: N+1 hot-standby controller redundancy and process-level authentication on all management interfaces eliminates this attack vector. NERC CIP-007 non-compliance carries fines up to $1M per day per violation.`,
  },

  /* ── Experiment 2 ─────────────────────────────────────────────────────── */
  {
    id: "T0815",
    name: "Denial of View",
    cve: "CVE-2019-13557",
    cveDescription:
      "WECON PI Studio HMI — Slow-communication injection causes operator display lag exceeding safety thresholds",
    chaosYamlFile: "engine-southeast-network-latency.yml",
    chaosEngineName: "grid-southeast-network-latency",
    targetSector: "southeast",
    sectorLabel: "Southeast Grid",
    sectorAbbr: "SE",
    duration: 90,
    impact: "degraded",
    redNarrative: `[RED AGENT — THREAT ANALYSIS]

Technique: MITRE ATT&CK for ICS — T0815 Denial of View
CVE Reference: CVE-2019-13557 (WECON PI Studio HMI)
Target: Southeast Grid · grid-sector-southeast · Port 30082

Topology analysis complete. Southeast sector running at 58% load — below critical threshold, which makes this attack harder to detect. Healthz endpoint will continue returning HTTP 200, so no automated alerting will trigger. Identified HMI latency injection vector matching CVE-2019-13557: slow-communication injection causes operator displays to show stale data while the underlying system continues changing state.

This is the most realistic and most dangerous attack class in the ICS threat landscape. The service appears alive. The dashboard says DEGRADED, not OFFLINE. Many operators treat sub-1-second latency spikes as transient noise and take no action. Meanwhile, 2 seconds of data staleness in a 60Hz-regulated power grid is an eternity.

Deploying pod-network-latency experiment: injecting 2000ms via tc netem on interface eth0 inside the container. From the operator's perspective: everything looks slow but fine. From the attacker's perspective: the grid is flying blind with a false sense of awareness.

Initiating attack...`,

    blueNarrative: `[BLUE AGENT — ANOMALY DETECTION]

ALERT: Southeast Grid response latency spiked to 2000ms+. Sector showing DEGRADED.

Critical nuance: the service IS alive. This is not pod failure. This is Denial of View — the most insidious attack pattern in ICS security. Operators see data. The data is real. The data is 2 seconds old. In a 60Hz grid, that staleness window can mask a generator trip, a voltage sag, or a developing fault that automated protection systems would normally catch in milliseconds.

Network traffic analysis: detecting deliberate tc netem manipulation inside the container network namespace. This is not transient congestion — the latency profile is uniform, consistent, and artificially injected. Pattern matches CVE-2019-13557 profile. MITRE T0815 confirmed.

Automated response sequence activating:
  [1] Marking all SE data as STALE — displaying freshness timestamps on dashboard
  [2] Switching to secondary SE telemetry path: inferring SE load from NE and CT tie-line differential
  [3] Cross-validating SE voltage readings against historical baseline ± tolerance bands
  [4] Alerting operators: "SE DATA STALE >2s — DO NOT USE FOR SWITCHING DECISIONS"
  [5] Deploying rollout restart to flush tc netem injection rules: kubectl rollout restart deployment/grid-sector-southeast -n smeal-day

Recovery in progress. Note: root cause is network-layer injection, not process failure. Restart clears the netem rules. Post-incident: deploy container-level network anomaly detection (eBPF-based) to detect future tc manipulation.`,

    analystBrief: `SITUATION AWARENESS BRIEF — SOUTHEAST GRID DEGRADED
Timestamp: {ts} | Severity: HIGH | Technique: T0815

WHAT IS FAILING
Southeast Grid SCADA communication is experiencing 2,000ms+ artificial latency. The service returns HTTP 200 — it looks healthy to every automated monitor. But all operational telemetry is 2 full seconds stale. This is the most dangerous ICS attack pattern: the system appears fine while flying blind.

BUSINESS EXPOSURE
SE Grid covers Virginia through Florida — Port of Savannah (the U.S.'s busiest container port by volume), Miami International Airport, and the manufacturing supply chains feeding automotive plants across Tennessee and Alabama. Stale SCADA data creates a direct compliance exposure: NERC CIP and FERC Order 693 require demonstrable real-time situational awareness. Any misoperation while operators look at 2-second-old data is a reportable reliability incident. The cyber insurance market prices this risk at a 40–60% premium uplift for utilities without real-time anomaly detection.

CASCADE RISK
Two seconds of staleness masks voltage sags, frequency deviations, and generator trips that protective relays respond to in milliseconds. The gap between "what the system did" and "what operators know" is precisely where equipment damage originates. This dynamic preceded the 2003 Northeast Blackout: alarms that weren't seen, conditions that cascaded silently across four states.

WHY AI CHANGES THIS
A rules-based monitoring system sees HTTP 200 and reports nominal. This GenAI analyst correlated latency profile, timing signature, and MITRE ATT&CK pattern data to identify deliberate injection in under 10 seconds — the kind of semantic reasoning that transforms a missed alarm into a caught attack, and a potential cascade into a 90-second recovery.

STRATEGIC RESPONSE
Timestamp all telemetry at the source and surface data-age warnings in operator displays. Implement secondary low-latency telemetry paths on independent network segments. eBPF-based container network monitoring detects the tc netem injection before it reaches 2,000ms.`,
  },

  /* ── Experiment 3 ─────────────────────────────────────────────────────── */
  {
    id: "T0828",
    name: "Loss of Safety — Resource Exhaustion",
    cve: "CVE-2022-2708",
    cveDescription:
      "Hitachi SCADA ProcessSuite — Malformed polling requests cause disproportionate CPU consumption, degrading safety system response",
    chaosYamlFile: "engine-central-cpu-hog.yml",
    chaosEngineName: "grid-central-cpu-hog",
    targetSector: "central",
    sectorLabel: "Central Hub",
    sectorAbbr: "CT",
    duration: 120,
    impact: "degraded",
    redNarrative: `[RED AGENT — THREAT ANALYSIS]

Technique: MITRE ATT&CK for ICS — T0828 Loss of Safety
CVE Reference: CVE-2022-2708 (Hitachi SCADA ProcessSuite)
Target: Central Hub · grid-sector-central · Port 30083

Central Hub is the most strategically valuable target in our topology. It is the coordination nexus bridging Northeast and Western interconnects. At 71% load, it is the highest-stressed sector. Disrupting the hub disrupts all inter-sector coordination. Identified CPU exhaustion vector matching Hitachi SCADA ProcessSuite vulnerability: malformed polling requests cause disproportionate CPU consumption, degrading safety system polling rates.

Historical analog: This attack class was precisely what happened during the 2003 Northeast Blackout. The alarm processing system at FirstEnergy became CPU-saturated — not from an adversary, but from a software bug — and operators lost alarm visibility for 6 critical minutes while cascade conditions developed silently. An adversary who can deliberately replicate that condition controls the timing of the crisis.

Deploying pod-cpu-hog experiment: stressing 2 CPU cores inside the controller container for 120 seconds. Response times will climb. Safety system polling will slow. Inter-sector coordination calls will queue. Watch the cascading effect on NE and WE sectors as their tie-line coordination degrades.

This is the 2003 scenario. Initiating attack...`,

    blueNarrative: `[BLUE AGENT — ANOMALY DETECTION]

ALERT: Central Hub showing elevated response latency. CPU utilization climbing inside controller pod.

This is the most dangerous scenario in our threat model. Central Hub is the coordination node. If it degrades, NE-WE tie-line coordination degrades with it. If safety system polling falls behind schedule, automated frequency protection cannot respond to generation trips fast enough.

Resource analysis: kubectl top pods -n smeal-day confirms CPU at container limit. Throttling active. Pattern matches CVE-2022-2708 Hitachi ProcessSuite exhaustion profile — consistent with malformed polling attack. MITRE T0828 confirmed.

This is the 2003 Northeast Blackout attack pattern: saturate the alarm/coordination system, create a blind window, wait for natural conditions to cause cascade.

Automated response sequence activating:
  [1] Reducing polling frequency to Central Hub — shedding non-critical load from the controller
  [2] Activating rate limiting on inter-sector coordination calls (CT → NE and CT → WE)
  [3] Switching NE-WE coordination to direct peer-to-peer path, bypassing CT temporarily
  [4] Monitoring NE and WE frequency for cascade precursors (threshold: ±0.1 Hz)
  [5] Deploying resource limit patch and rollout restart: kubectl rollout restart deployment/grid-sector-central -n smeal-day

CPU exhaustion clears on container restart. Recovery expected within 20–30 seconds. Post-incident: mandate CPU resource limits with HPA on all coordination tier services, and implement separate process isolation for safety-critical functions.`,

    analystBrief: `SITUATION AWARENESS BRIEF — CENTRAL HUB CPU EXHAUSTION
Timestamp: {ts} | Severity: HIGH | Technique: T0828

WHAT IS FAILING
Central Hub controller is under CPU resource exhaustion — service stays up but slows, coordination functions degrading. Not a crash. A performance collapse: more dangerous precisely because automated alerts stay silent while the system's ability to respond to real events silently erodes.

BUSINESS EXPOSURE
Central Hub coordinates Ohio through Wisconsin — the Midwest manufacturing belt. Ford and GM assembly plants, Dow Chemical complexes, ArcelorMittal steel mills, and the entire just-in-time auto parts supply chain depend on uninterrupted grid frequency here. A 30-minute Central Hub outage translates to tens of millions in halted automotive production alone. More critically: Central Hub is the coordination nexus between NE and WE sectors. When it slows, inter-regional automatic generation control (AGC) slows with it — creating a vulnerability window across the entire Eastern Interconnect, not just the Midwest.

CASCADE RISK
This is the 2003 Northeast Blackout scenario — precisely. The $10B, 55-million-person event didn't start with equipment failure. It started with an alarm management system that became CPU-saturated. Operators lost situational awareness for 6 minutes while cascade conditions developed silently across four states. An adversary who can deliberately replicate that saturation controls the timing and severity of the crisis.

WHY AI CHANGES THIS
The 2003 operators had no AI analyst. They had a console that stopped showing alarms. This system correlated CPU utilization telemetry, response latency patterns, and CVE-2022-2708 vulnerability data to confirm a deliberate attack in seconds, not minutes. That detection speed is what prevents a software slowdown from becoming a blackout.

STRATEGIC RESPONSE
Kubernetes CPU resource limits with autoscaling prevent exhaustion before it starts. Architecture-level: safety-critical functions — frequency protection, load shedding — must run in isolated processes with guaranteed CPU priority, unreachable by the layer being exhausted. NERC CIP-007-6 mandates exactly this separation.`,
  },

  /* ── Experiment 4 ─────────────────────────────────────────────────────── */
  {
    id: "T0814",
    name: "Denial of Service — Total Blackout",
    cve: "CVE-2015-5374",
    cveDescription:
      "Siemens SCALANCE X-200 Industrial Ethernet switch — Unauthenticated packet flood causes total communication blackout",
    chaosYamlFile: "engine-western-network-loss.yml",
    chaosEngineName: "grid-western-network-loss",
    targetSector: "western",
    sectorLabel: "Western Interconnect",
    sectorAbbr: "WE",
    duration: 90,
    impact: "offline",
    redNarrative: `[RED AGENT — THREAT ANALYSIS]

Technique: MITRE ATT&CK for ICS — T0814 Denial of Service
CVE Reference: CVE-2015-5374 (Siemens SCALANCE X-200)
Target: Western Interconnect · grid-sector-western · Port 30084

This is the maximum-impact scenario. Western Interconnect manages Colorado through Washington State — the primary renewable generation hub for the Western grid, including the hydroelectric and wind assets that provide frequency regulation for the entire Western synchronous island. Identified network layer attack vector matching Siemens SCALANCE X-200 vulnerability: unauthenticated packet flood targeting industrial Ethernet switches causes complete communication blackout.

Critical distinction from T0815 (Denial of View): this is not latency. This is silence. The pod is running. Kubernetes shows it healthy. Processes are executing. But zero packets leave the container. From the control room's perspective: total blackout. No telemetry. No alarms. No ability to send commands. The controller is invisible.

This was the core technique in the December 2015 Ukraine power grid attack — BlackEnergy malware combined network isolation of SCADA workstations with simultaneous breaker manipulation. The isolation was not to disable the system. It was to prevent operators from seeing what was happening while attackers completed switching operations. 230,000 customers lost power for up to 6 hours.

Deploying pod-network-loss: 100% packet drop via tc netem, 90 seconds. No Kubernetes self-healing will help — the pod is healthy. We need network-layer remediation.

Initiating the blackout...`,

    blueNarrative: `[BLUE AGENT — ANOMALY DETECTION]

CRITICAL ALERT: Western Interconnect — TOTAL BLACKOUT. Zero telemetry. Zero response. Pod running but completely unreachable.

This is the highest-severity scenario in our threat model. CRITICAL DISTINCTION: This pod is RUNNING. Kubernetes healthcheck says HEALTHY. But no data is reaching us. Network-layer isolation. No pod restart will fix this — Kubernetes has nothing to restart. We need to clear the network rules from inside the container.

Forensic signature: uniform packet loss (100%), not intermittent. This is not physical failure. This is deliberate tc netem injection. Pattern matches CVE-2015-5374 / BlackEnergy network isolation profile. MITRE T0814 Denial of Service confirmed. Confidence: HIGH.

IMMEDIATE THREAT ASSESSMENT: Without WE telemetry, Western grid automatic generation control is blind. Any generation trip in the Colorado-Washington corridor will cause uncorrected frequency deviation. WECC emergency protocols require operator action within 5 minutes of losing AGC control. The clock is running.

Automated response sequence activating:
  [1] IMMEDIATE: Operator alert — "ADVERSARIAL NETWORK ISOLATION DETECTED — DO NOT RELY ON WE DATA"
  [2] Activating out-of-band telemetry: inferring WE load from tie-line differential (WE-CT interconnect)
  [3] Pre-staging emergency frequency response commands for manual execution if WE stays dark >120s
  [4] Isolating WE network segment to prevent lateral movement to CT and NE
  [5] Executing rollout restart to flush tc netem rules: kubectl rollout restart deployment/grid-sector-western -n smeal-day
  [6] Initiating post-incident forensic packet capture on all smeal-day interfaces

Restart deployed. Network rules flush on container restart. WE should recover telemetry within 30 seconds. This is the Ukraine-2015 scenario. Real-world protocol: NERC emergency notification now.`,

    analystBrief: `SITUATION AWARENESS BRIEF — WESTERN INTERCONNECT TOTAL BLACKOUT
Timestamp: {ts} | Severity: CRITICAL | Technique: T0814

WHAT IS FAILING
Western Interconnect controller has complete network isolation. Kubernetes reports the pod healthy — health checks pass — but zero network packets reach the control plane. The system is running. Operators cannot see it, command it, or know its state. This is the most dangerous SCADA failure mode: apparent normalcy masking total operational blindness.

BUSINESS EXPOSURE
The Western Interconnect powers Colorado through Washington State — the most economically dense grid corridor in the world by digital infrastructure. Amazon, Google, and Microsoft hyperscale data centers in the Pacific Northwest draw gigawatts from this grid. Apple's Reno complex, Silicon Valley cloud infrastructure, and Nevada's data center boom all sit here. Uptime Institute estimates North American data center outages cost an average of $9,000 per minute. With hyperscale concentration, a regional WE blackout now carries potential exposure in the $2–5 billion per hour range. The Western grid also operates as a separate synchronous island — there is no Eastern Interconnect backup when WE goes dark.

CASCADE RISK
This is the Ukraine 2015 attack blueprint. BlackEnergy malware isolated SCADA workstations from the network — exactly this technique — then attackers manually tripped 30 substations, cutting power for 230,000 customers for up to 6 hours. The network isolation wasn't the end goal. It was the blindfold. Colonial Pipeline's 2021 ransomware shutdown ($4.4B market cap impact, 6 days offline) began the same way: operators cut systems they could no longer trust to see.

WHY AI CHANGES THIS
This is where AI creates an asymmetric defender advantage. The attack exploits the gap between "process is running" and "system is operational." A rules-based monitor sees green. This GenAI analyst correlated health check responses, packet-loss signatures, timing patterns, and threat intelligence to identify network-layer isolation as adversarial — not accidental — within seconds of onset. Human analysts would need minutes.

STRATEGIC RESPONSE
Deep telemetry health checks that validate data flow, not just HTTP reachability. Redundant out-of-band control plane on independent network (cellular backup, dedicated management VLAN). eBPF-based anomaly detection inside container network namespaces catches tc netem injection at the source. Rollout restart flushes injected rules in under 30 seconds.`,
  },
];

/** Return the scenario for a given cycle index (loops through all 4) */
export function getScenarioForCycle(cycle: number): AttackScenario {
  return ATTACK_SCENARIOS[cycle % ATTACK_SCENARIOS.length];
}

/** Return the scenario that targets a specific sector (for interactive / gamified mode) */
export function getScenarioForSector(
  sectorId: "northeast" | "southeast" | "central" | "western",
): AttackScenario | undefined {
  return ATTACK_SCENARIOS.find((s) => s.targetSector === sectorId);
}
