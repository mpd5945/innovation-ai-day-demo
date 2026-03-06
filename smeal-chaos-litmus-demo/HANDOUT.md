# Smeal AI Innovation Day — Chaos Engineering Demo
## Reference Handout

---

## 💸 What a Grid Attack Actually Costs

These figures represent estimated financial exposure per sector in this simulation, modeled after real NERC reliability event data and utility incident reports.

| Sector | Loss Rate | Per Minute | 60-Second Exposure |
|---|---|---|---|
| **Northeast** | $194,000/sec | ~$11.6M/min | $11,640,000 |
| **Southeast** | $117,000/sec | ~$7.0M/min | $7,020,000 |
| **Central** | $97,000/sec | ~$5.8M/min | $5,820,000 |
| **Western** | $278,000/sec | ~$16.7M/min | $16,680,000 |

> **$15M threshold** — the failure gate in this demo — reflects the SEC materiality standard for mandatory 8-K cybersecurity disclosures under the **SEC Cybersecurity Disclosure Rules (August 2023)**.

### Real-World Benchmarks
- **IBM Cost of a Data Breach Report 2024**: Average critical infrastructure breach = **$4.82M** *(up 10% YoY)* — [ibm.com/reports/data-breach](https://www.ibm.com/reports/data-breach)
- **Colonial Pipeline (2021)**: ~$4.4M ransom paid; estimated economic impact $1B+ in fuel disruption
- **Ukraine Power Grid Attack (2015–2016)**: ~230,000 customers offline; NERC CIP standards revised as a result
- **FERC 2023 Annual Report**: Physical + cyber attacks on U.S. bulk electric system up 77% vs. 2022

---

## 🏛️ NIST Cybersecurity Framework 2.0

**Authoritative Citation:**
> National Institute of Standards and Technology. (2024). *The NIST Cybersecurity Framework 2.0*. NIST CSWP 29. [https://doi.org/10.6028/NIST.CSWP.29](https://doi.org/10.6028/NIST.CSWP.29)

**Free Download:** [nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf](https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf)

### The Five Functions — What You Practiced Today

| Function | What It Means | In This Demo |
|---|---|---|
| **GOVERN** | Policies, roles, and authority to act | AI system policies enabling autonomous SOC response |
| **IDENTIFY** | Know your assets and attack surface | Red Agent maps grid vulnerabilities before attacking |
| **DETECT** | Spot threats in real time | AI Analyst reads live telemetry, issues BLUF brief |
| **RESPOND** | Contain and eradicate the threat | Blue Agent stages countermeasures + your triage decision |
| **RECOVER** | Restore systems to normal | Command terminal + 4-step remediation sequence |

> CSF 2.0 added **GOVERN** as a new core function in February 2024 — reflecting the rise of AI governance, vendor risk, and board-level cybersecurity accountability.

### Related NIST Standards
- **NIST SP 800-53 Rev 5** — Security and Privacy Controls (the "control catalog" behind CSF) — [doi.org/10.6028/NIST.SP.800-53r5](https://doi.org/10.6028/NIST.SP.800-53r5)
- **NIST SP 800-82 Rev 3** — Guide to OT/ICS Security (applies directly to power grid systems) — [doi.org/10.6028/NIST.SP.800-82r3](https://doi.org/10.6028/NIST.SP.800-82r3)
- **NIST AI RMF 1.0** — AI Risk Management Framework (governs AI systems like the agents in this demo) — [doi.org/10.6028/NIST.AI.100-1](https://doi.org/10.6028/NIST.AI.100-1)

---

## ⚖️ Regulatory Exposure Meter — What Each Tier Means

The RM-4 meter in the demo maps financial damage to real reporting obligations:

| Threshold | Trigger | Requirement |
|---|---|---|
| < $1M | Internal only | Internal incident log; no external disclosure required |
| $1M – $5M | **FERC Disclosure** | FERC 30-day mandatory disclosure for bulk electric system events |
| $5M – $10M | **CISA Notification** | Critical infrastructure notification + DHS situational awareness report |
| $10M – $50M | **SEC 8-K + DOE** | SEC 8-K material event filing + DOE emergency notification within 24 hours |
| > $50M | **Congressional** | Congressional briefing threshold; NERC CIP violation review triggered |

**Key Regulations:**
- **FERC Order 848 / NERC CIP-008-6** — Cybersecurity incident reporting for bulk electric system
- **SEC Rule 33-11216** (eff. Dec 2023) — Mandatory 8-K cybersecurity disclosure within 4 business days of materiality determination
- **CISA Cyber Incident Reporting for Critical Infrastructure Act (CIRCIA)** — 72-hour reporting for critical infrastructure; rules finalizing 2025

---

## 🦠 Attack Types — MITRE ATT&CK for ICS

Each attack in this demo maps to real adversary techniques catalogued by MITRE:

| Demo Attack | MITRE Technique | ICS Matrix Reference |
|---|---|---|
| **CPU Hog** (Central) | T0814 — Denial of Service | [attack.mitre.org/techniques/T0814](https://attack.mitre.org/techniques/T0814) |
| **Pod Delete** (Northeast) | T0816 — Device Restart/Shutdown | [attack.mitre.org/techniques/T0816](https://attack.mitre.org/techniques/T0816) |
| **Network Latency** (Southeast) | T0814 — DoS / T0804 — Block Reporting Message | [attack.mitre.org/techniques/T0804](https://attack.mitre.org/techniques/T0804) |
| **Network Loss** (Western) | T0809 — Data Destruction / T0878 — Alarm Suppression | [attack.mitre.org/techniques/T0878](https://attack.mitre.org/techniques/T0878) |

**Full ICS Matrix:** [attack.mitre.org/matrices/ics](https://attack.mitre.org/matrices/ics/)

---

## 🤖 The Meta-Story: This Demo Was Built by AI

This entire application — ~2,200 lines of TypeScript/React, Kubernetes manifests, Docker configuration, chaos experiments, and this handout — was built in a single session using **GitHub Copilot** in VS Code.

### What Copilot Built
- ✅ Next.js 16 dashboard with real-time polling from 4 Kubernetes microservices
- ✅ Red Agent + Blue Agent AI persona system with streamed analyst briefs
- ✅ 3D power grid model (Three.js / React Three Fiber) with sector-state shaders
- ✅ LitmusChaos Kubernetes experiments (CPU hog, pod delete, network latency/loss)
- ✅ Full scoring system: damage meter, RM-4 regulatory exposure, NIST CSF card, grade, after-action report
- ✅ Defender Mode: Manual terminal **or** Agentic AI Runbook (auto-executes countermeasures)
- ✅ Sound effects, animations, cinematic phase transitions
- ✅ This handout

### The Point
The same AI capabilities that built this demo **can be used to defend systems like this one.**  
The skills you're building in MIS, risk, and strategy courses are increasingly **AI-paired skills.**

**GitHub Copilot:** [github.com/features/copilot](https://github.com/features/copilot)  
**VS Code:** [code.visualstudio.com](https://code.visualstudio.com)

---

## 🔗 Quick References

| Resource | URL |
|---|---|
| NIST CSF 2.0 (full framework) | [nist.gov/cyberframework](https://www.nist.gov/cyberframework) |
| NIST AI RMF | [airc.nist.gov](https://airc.nist.gov) |
| MITRE ATT&CK for ICS | [attack.mitre.org/matrices/ics](https://attack.mitre.org/matrices/ics/) |
| LitmusChaos (open source chaos engineering) | [litmuschaos.io](https://litmuschaos.io) |
| IBM Cost of a Data Breach 2024 | [ibm.com/reports/data-breach](https://www.ibm.com/reports/data-breach) |
| GitHub Copilot | [github.com/features/copilot](https://github.com/features/copilot) |
| FERC Electric Reliability | [ferc.gov/industries-data/electric](https://www.ferc.gov/industries-data/electric) |
| CISA ICS Advisories | [cisa.gov/ics](https://www.cisa.gov/ics) |
| SEC Cybersecurity Disclosure Rule | [sec.gov/rules/final/2023/33-11216.pdf](https://www.sec.gov/rules/final/2023/33-11216.pdf) |

---

*Penn State Smeal College of Business · AI Innovation Day*  
*Demo source: github.com · Built with GitHub Copilot + VS Code*
