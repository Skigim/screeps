## Execution Model

- **Think once, act many:** Keep expensive logic in Governor, Directors, and Squad Leaders. Creeps handle O(1) orders—no local pathfinding or target searches.
- **Traveler defaults:** Use `reusePath` 10–20, `ignoreCreeps` false for core loops, `preferHighway` true. Only inflate `maxOps` for long hauls or stuck cases; cache CostMatrices.
- **Pathfinder sparingly:** Precompute remote/highway routes at squad level. Store target IDs instead of calling `findClosestByPath` each tick.
- **Single scan:** Run one room sense pass (structures, hostiles, sites) and share the snapshot; forbid duplicate `room.find()` calls per role.
- **Lazy + batched:** Rebuild metrics only when inputs change (energy delta, construction backlog). Otherwise reuse aggregates.
- **Rate-limit extras:** Market scans, observers, remote mapping, and lab planning run every _N_ ticks or via triggers.
- **CPU governor:** When bucket < 3000, skip optional work, set upgrades to conserve, and throttle path recomputes.

## Memory Discipline

- **Tick orders in heap:** Store orders in `global.orders` and reissue each tick. Write to `Creep.memory` only if data must survive resets.
- **Telemetry summaries:** Sample in heap ring buffers; commit summaries (counts/means) to `Room.memory.metrics` at tick end. Persist raw logs only when debugging.
- **IDs over objects:** Persist object IDs and compact `{x, y}` tuples; resolve live objects at runtime.
- **Compact enums:** Use short strings (`"burn" | "steady" | "conserve"`) or ints. Avoid massive nested Memory trees.
- **Creep.memory tax:** Keep memory minimal (role, squad, state). Clear stale creep memory post-death.
- **Segments:** Store empire state/market sheets in `RawMemory.segments`; segment 0 holds a manifest and checksums.

## Practical Shapes

```ts
// Memory.rooms[roomName]
{
  policy: { threatLevel: "none", upgrade: "steady", energy: { low: 200, high: 1e12 }, cpu: { minBucket: 3000 }, nav: { moveRatioHint: 0.5 } },
  metrics: { refillSLA: 210, controllerGPH: 4.8, remoteROI: 0.62 },
  flags: { linksOnline: false, roadsPct: 0.3 }
}

// global heap
global.orders = new Map<string, Order>();
global.snap = {
  rooms: new Map<string, RoomSnapshot>(),
  squads: new Map<string, SquadMetrics>()
};

// creep loop
const order = global.orders.get(creep.name);
if (!order) return; // idle report
// convert to creep-task; move via Travel
```

## BodyFactory & Spawn Cost Control

- Pass `policy.energyCap` into `compileBody` to intentionally under-spend in conserve mode.
- Enforce `maxSpawnTime` to avoid 1k-tick giants under stress.
- Cache compiled bodies by `(plan, profile, energyCap)` in heap while inputs stay stable.

## Director & Squad CPU Patterns

- **Dirty flags:** When energy delta is zero, construction unchanged, and no hostiles, reuse previous orders/metrics.
- **Order renewals:** Refresh TTL for identical orders; replan only on failure or environmental change.
- **Stuck detection:** After two `ERR_NO_PATH` results from Traveler, escalate once to re-path.

## What This Architecture Avoids

- Per-creep target searches each tick.
- Branch-heavy creep state machines.
- Repeated room scans per role.
- Constant Memory churn for orders, paths, telemetry.

## Sanity KPIs

- CPU/tick median and p95 (target p95 below allotted CPU).
- Serialization spikes (from `RawMemory`) as Memory health indicators.
- Orders issued vs. orders changed (if equal, you’re over-planning).
- Path recomputes per tick (should fall once infrastructure stabilizes).

## TL;DR

- Central brains + dumb workers minimize CPU usage.
- Keep orders/telemetry in heap; summarize to Memory.
- Scan once, decide once, act everywhere.
- Let policy throttle movement ratios, body budgets, and optional jobs to stay inside the bucket and out of JSON hell.

## RCL 1-3 Strategic Roadmap

### Phase 1 - RCL 1: Bootstrap Cleanly

- **Goal:** Maintain uninterrupted controller upgrades with minimal CPU usage.
- **Deliverables:**
  - `RoomStateManager` snapshots covering energy bank, hostiles, and road coverage percent.
  - `derivePolicy(room, state)` that writes `Memory.rooms[room].policy` every tick with defaults (`threatLevel: "none"`, `upgrade: "steady"`, `energy.low: 200`, `nav.moveRatioHint: 0.5`).
  - `SpawnManager` driven by `RCL1Config`, `BodyFactory`, and policy to keep 3-4 workers alive.
  - Heap-scoped registries for Orders and Telemetry.
  - Worker creeps as `[WORK, CARRY, MOVE]` executing orders via `creep-tasks` and Traveler only.
- **Definition of Done:** Continuous upgrading, controller never drops below 4 000 ticks to downgrade, median CPU per creep < 0.3 ms, and all bodies compiled through `BodyFactory` under policy control.
- **Validation:**
  - Tick checks: policy present, spawn loop keeps >=3 workers, controller `ticksToDowngrade > 4000`, median creep CPU < 0.3.
  - Rolling (25-50 ticks): upgrade continuity >= 90 %, spawn starvation < 3 ticks.
  - Unit asserts: policy derivation matches defaults, worker body spawn time < 300 ticks.
- **Exit Gate:** Sustain 1 000 ticks with zero downgrades and CPU within budget.

### Phase 2 - RCL 2: Split the Economy

- **Goal:** Separate harvesting and logistics while scaling through squad directives.
- **Deliverables:**
  - Miner and Hauler Squads tracking throughput, idle percent, and SLA breaches; summaries recorded in `Heap.snap.squads`.
  - Director aggregates squad metrics into next-tick directives.
  - Policy upgrades: add `upgrade: "conserve" | "steady"`, raise `energy.low` to 5 000, adjust `nav.moveRatioHint` based on road coverage.
  - `BodyFactory` profiles for linked, swampy, and links-online variants.
- **Definition of Done:** Both sources mined continuously, core refill SLA median <= 300 ticks, and upgrader scaling obeys conserve/steady toggle.
- **Validation:**
  - Tick checks: miner uptime >= 95 %, refill SLA median <= 300, policy throttles as expected.
  - Rolling metrics: throughput trending upward, Traveler path recomputes per creep falling, hauler idle percent < 20 %.
  - Unit asserts: squad metrics valid, profile flips when `linksOnline === true`.
- **Exit Gate:** Stable dual-source mining with SLA met and adaptive upgrader throttling.

### Phase 3 - RCL 3: Stabilize and Immunize

- **Goal:** Harden infrastructure and close the governance loop.
- **Deliverables:**
  - Tower Squad that autofires and heals only, plus a "Downgrade Guard" trigger when controller `ticksToDowngrade < 1000`.
  - Policy extension: `threatLevel` toggles `"none" | "poke"` and CPU backpressure suspends optional scans under 3 000 bucket.
  - Director issues room-level directives for refills and upgrades; squads execute under Manager enforcement.
  - Persist SLA averages, idle percent, and threat metrics to policy memory.
- **Definition of Done:** Controller `ticksToDowngrade >= 2500`, towers stay >= 40 % energy for >= 90 % of ticks, CPU steady within target while policy responds to backpressure.
- **Validation:**
  - Tick checks: tower online/firing, emergency upgrader spawns when needed, CPU backpressure triggers disable optional work.
  - Rolling metrics: road health > 50 % average hits, tower refill priority respected when `threatLevel === "poke"`.
  - Unit asserts: directive routing accurate, spawn time caps enforced per profile.
- **Exit Gate:** 1 000 ticks with tower coverage and autonomous policy loop.

### Continuous Checks (All Phases)

- Orders remain idempotent; identical directives generate identical orders unless state changes.
- Creeps never improvise; every action traces to an active order ID.
- Memory hygiene enforced: dead creeps cleared, metrics windows bounded, serialization time stable.
- CPU governor forces `upgrade: "conserve"` and disables optional modules when p95 CPU exceeds budget for 100 ticks.

### Implementation Tasks

- Metrics scaffolding: per-tick RoomState, Policy, and per-squad stats (throughput, SLA breaches, idle percent, orders issued/changed).
- Monitors: `Health.check(room)` every tick; `Audit.run(room)` every 50-100 ticks.
- Assertions harness: `assert(name, condition, details?)` logging to `Memory.rooms[room].tests` with pass/fail counts; enable every 500 ticks or in simulation.
- Reporting: compile milestone summary every 1 000 ticks with phase status (`✅`/`⚠️`/`❌`).

### Exit Criteria for RCL 4 Prep

- All three phases hit Definition of Done within the last 1 000 ticks.
- No recurring warnings in monitors or assertions.
- CPU p95 below budget with stable heap and memory churn.
- Ready to introduce storage control, defensive policies, and combat squads at RCL 4.
