Here’s the upgraded north-star—now with **policies from tick zero** and **squads** instead of teams.

# Upstream Truth, Downstream Will

### A development manifesto for a policy-driven, squad-based Screeps AI

## Core Thesis

This bot is a **hierarchical organism**: information **flows upstream** (telemetry → synthesis → decisions) and intent **flows downstream** (policies → directives → orders). Creeps aren’t clever; they are **sensors with arms**. Brains live higher up. From the first tick, behavior is governed by a **small, explicit policy object**—no vibes, no hidden heuristics.

## Guiding Principles

* **Baselines are brainless.** A baseline creep performs zero strategy. It observes, reports, and executes its current order. That’s it.
* **Managers think; creeps do.** Intelligence sits in **Squad Leaders**, **Room Directors**, and the **Empire Governor**. The higher the tier, the longer the horizon.
* **Single source of truth.** Decisions read only from **RoomState** and **EmpireState**, built from telemetry. No secret creep-state logic.
* **Deterministic directives.** Same inputs → same orders. Reproducible ticks beat clever improvisation.
* **Policy from tick zero.** A minimal policy exists **at RCL1** and is threaded everywhere: BodyFactory sizing, navigation, spawn budgets, upgrading throttle.

---

## Org Chart (Downstream)

* **Empire Governor** — sets **Policy** (threat posture, upgrade mode, energy/CPU/nav hints) and room budgets.
* **Room Director** — turns Policy into **room directives** and resource arbitration (who gets energy, when).
* **Squad Leaders** (by BodyPlan, not ad hoc roles) — own **SLAs** and issue **orders** to their squad.
* **Creeps** — obey the most recent valid order; report telemetry.

Squads align to **plans**: Miner Squad, Hauler Squad, Manager Squad, Upgrader Squad, Builder Squad, Defense Squad, Remote Squad, Industry Squad. The plan defines the body; the **Squad Leader** defines the work.

---

## Data Flow (Upstream)

1. **Telemetry (creep → squad):** pos, store deltas, fatigue, last action/result, local scans (hostiles/roads/wreckage).
2. **Squad Metrics (squad → room):** throughput, idle %, queue length, refill SLA breaches, avg path cost.
3. **RoomState (director):** energy bank, threat vector, construction backlog, link topology, road wear, upgrade pressure.
4. **EmpireState (governor):** credits, mineral sheet, remote catalog, deposit/power-bank targets, market stance.

All upstream data is **append-only for the tick**, then summarized. No “smart” creeps—only honest ones.

---

## Policy (From Tick Zero)

A tiny, boring policy governs everything from the start:

```ts
type Policy = {
  threatLevel: "none" | "poke" | "raid" | "siege"
  upgrade: "conserve" | "steady" | "burn"
  energy: { low: number; high: number }
  cpu: { minBucket: number }
  nav: { moveRatioHint: number }
}
```

**Day-0 defaults (RCL1–2):**

* `threatLevel: "none"` (auto “poke” on first hostile)
* `upgrade: "steady"` (switch to “conserve” when bank < low)
* `energy.low = 200` at RCL1, `5000` once storage exists
* `cpu.minBucket = 3000` → pause optional scans under this
* `nav.moveRatioHint = 0.5` (roads-in-progress assumption)

The **Governor** recomputes Policy every tick from RoomState/EmpireState. Managers and BodyFactory **read policy; they don’t improvise**.

---

## Orders (Downstream Will)

* **Policy → Room Directives** (“conserve upgrading”, “avoid hostiles”, “burn when banked”).
* **Directives → Squad Orders** (Hauler SLA ≤ 300 ticks; Tower ≥ 40% energy).
* **Orders → Tasks** (withdraw A, transfer B, move via waypoint W, upgrade at range 3).
  Orders are **atomic, idempotent, and tick-scoped**; Squad Leaders must renew or replace them each tick.

---

## Tick Pipeline

1. **Sense:** creeps log telemetry (no branching).
2. **Synthesize:** squads aggregate; director builds RoomState; governor builds Policy + EmpireState.
3. **Decide:** policy → directives → squad orders.
4. **Act:** creeps execute orders using **creep-tasks** and **traveler.js** via a central adapter.
5. **Settle:** record KPIs; adjust spawns via **BodyFactory** (plans + profiles) under policy caps.

---

## Squads: Contracts & SLAs

Each Squad declares **Inputs, Outputs, SLA, Escalation**.

**Hauler Squad (example):**

* Inputs: storage/containers/links levels; tower energy.
* Outputs: core refill complete; residual energy stabilized.
* SLA: spawn+extensions refilled within N ticks of deficit; towers ≥ 40% unless siege.
* Escalation: breach ≥ 3 ticks → request more haulers or re-route priority.

---

## Integration Mandates

* **BodyFactory + Profiles:** Squads request spawns by plan + profile (`conserve|steady|burn`, `linksOnline`, `swampy`) with policy-provided `energyCap` and `moveRatio`. Spawn-time caps prevent panic-queue bloat.
* **Traveler.js:** All movement goes through `Travel.moveTo(creep, target, opts)` which injects policy (e.g., `allowHostile`, `reusePath`).
* **creep-tasks:** Orders map to canonical tasks; tasks handle micro and call Travel. Role files remain thin adapters, not strategy brains.

---

## Failure & Backpressure

* **Idempotent orders** survive lag.
* **Timeouts** ensure stale orders expire; Squad Leaders must renew.
* **Escalation** pushes resource requests up (more spawns, different priorities) instead of letting creeps freelance.
* **Graceful degradation:** under `siege`, industry pauses, haulers feed towers first, upgraders drop to `conserve`.

---

## KPIs (Don’t Guess—Measure)

* Refill SLA (median ticks to core full)
* Energy delivery steps/energy (should crater at RCL5 links)
* Controller throughput by policy (burn vs steady)
* Remote ROI (net after travel/defense)
* Order fulfillment rate (no-error completions/tick)
* Decision latency (telemetry → directive → observable effect)

---

## Day-One Checklist (Rebuild Mode)

1. **Policy object live** from tick 1 (thread to BodyFactory, Travel adapter, SpawnManager, UpgradeGovernor).
2. **Orders/Telemetry schemas defined** and enforced (no free-form creep thinking).
3. **Squad SLAs** documented and logged; directors arbitrate with policy, not ad hoc switches.
4. **All movement via Travel**, all actions via tasks bound to orders.
5. **One visible lever**: make `upgrade="conserve"` kick in at low bank and watch upgraders shrink automatically. That’s policy doing work.

---

**Mantra to code by:**
**Upstream truth, downstream will.** Squads execute; leaders decide; policy rules all—starting at tick zero.
