# Empire Naming Standard (cheat sheet)

A compact reference for consistent titles, scopes, and naming across code, logs, and dashboards.

## Conventions (at a glance)

- **Titles:** One word, PascalCase in prose/log tags (e.g., `Mayor`), lowercase module paths (e.g., `mayor/`).
- **Logs:** `[Title Room?] Message`. Room suffix when applicable: `[Mayor W1N1]`.
- **Files/Namespaces:** `src/<domain>/<module>/…` (lowercase). Exports may use PascalCase.
- **Squads:** “<Name> Squad” in prose/logs, camelCase keys in code (e.g., `haulerSquad`).
- **Metrics keys:** `snake_case` in Memory, `camelCase` in heap.

---

## Titles, scopes, and naming

| Title            | Scope (what it is)  | Responsibilities (short)                       | Module path (default)    | Log tag          | Notes                                  |
| ---------------- | ------------------- | ---------------------------------------------- | ------------------------ | ---------------- | -------------------------------------- |
| **Governor**     | Executive           | Sets thresholds/OKRs; milestone gates          | `core/governor/`         | `[Governor]`     | Human/operator entry points & configs. |
| **Council**      | Executive           | Produces per-tick `Policy`                     | `core/council/`          | `[Council]`      | Single source of truth for policy.     |
| **Mayor**        | Director (per room) | Turns Policy → room Directives                 | `director/mayor/`        | `[Mayor W1N1]`   | One instance per room.                 |
| **Marshal**      | Director            | Threat posture & defense readiness             | `director/marshal/`      | `[Marshal]`      | RCL4+ expands to combat.               |
| **Overseer**     | Director            | Construction & infrastructure programs         | `director/overseer/`     | `[Overseer]`     | Consumes Architect plans.              |
| **Commissioner** | Director            | Trade/market/inter-room logistics              | `director/commissioner/` | `[Commissioner]` | Terminal & market policies.            |
| **Auditor**      | Director            | KPIs, SLAs, compliance                         | `director/auditor/`      | `[Auditor]`      | Writes health/audit summaries.         |
| **Architect**    | Manager             | Layout, roads, path topology (Traveler-backed) | `manager/architect/`     | `[Architect]`    | Feeds distance/roadsPct to state.      |
| **Foreman**      | Manager             | Spawn queue, BodyFactory integration           | `manager/foreman/`       | `[Foreman]`      | Owns spawn intents & results.          |
| **Logistician**  | Manager             | Miners/haulers, refill SLAs                    | `manager/logistician/`   | `[Logistician]`  | Tracks throughput/idle/SLA breach.     |
| **Steward**      | Manager             | Storage/links/terminal balancing               | `manager/steward/`       | `[Steward]`      | RCL4+ storage brain.                   |
| **Custodian**    | Manager             | Repairs, road upkeep, cleanup                  | `manager/custodian/`     | `[Custodian]`    | Triggers repair pulses.                |
| **Sentinel**     | Manager             | Runtime health & alarms                        | `manager/sentinel/`      | `[Sentinel]`     | Low-latency anomaly detection.         |
| **Chronicler**   | Manager             | Reports, summaries, test results               | `manager/chronicler/`    | `[Chronicler]`   | Periodic tick summaries.               |
| **Archivist**    | Manager             | Memory hygiene & segments                      | `manager/archivist/`     | `[Archivist]`    | Compaction, pruning, manifests.        |

---

## Squads (operational units)

| Squad (prose)      | Code key        | Module path       | Log tag            |
| ------------------ | --------------- | ----------------- | ------------------ |
| **Miner Squad**    | `minerSquad`    | `squad/miner/`    | `[Miner Squad]`    |
| **Hauler Squad**   | `haulerSquad`   | `squad/hauler/`   | `[Hauler Squad]`   |
| **Builder Squad**  | `builderSquad`  | `squad/builder/`  | `[Builder Squad]`  |
| **Upgrader Squad** | `upgraderSquad` | `squad/upgrader/` | `[Upgrader Squad]` |
| **Tower Squad**    | `towerSquad`    | `squad/tower/`    | `[Tower Squad]`    |
| **Defense Squad**  | `defenseSquad`  | `squad/defense/`  | `[Defense Squad]`  |
| **Remote Squad**   | `remoteSquad`   | `squad/remote/`   | `[Remote Squad]`   |
| **Industry Squad** | `industrySquad` | `squad/industry/` | `[Industry Squad]` |

---

## Log formatting

- **Prefix:** `[Title [Room]]` — e.g., `[Mayor W1N1]`, `[Foreman]`.
- **Message style:** action-oriented, concise KPIs.
- **Examples:**

  - `[Council] Policy: upgrade=steady threat=none nav.move=0.5`
  - `[Mayor W1N1] Directives: refill=300 upgrade=steady`
  - `[Foreman] Spawned Worker-4 profile=steady`
  - `[Architect] Roads coverage=0.44`
  - `[Logistician] Hauler SLA median=270 p95=420`
  - `[Auditor] Health: GREEN cpu.p95=13.2`

---

## File & symbol naming

- **Modules:** `src/<layer>/<title>/index.ts` (e.g., `src/manager/foreman/index.ts`)
- **Exports:** PascalCase classes or factories (e.g., `export class Foreman { … }`)
- **Helpers:** `utils.ts`, `types.ts`, `contracts.ts` within each module
- **Tests:** co-locate as `*.spec.ts` or `__tests__/…`

**Example tree:**

```
src/
  core/
    council/
    governor/
  director/
    mayor/
    marshal/
    overseer/
    auditor/
  manager/
    architect/
    foreman/
    logistician/
    steward/
    custodian/
    sentinel/
    chronicler/
    archivist/
  squad/
    miner/
    hauler/
    builder/
    upgrader/
```

---

## Keys & schemas (defaults)

- **Memory (compact, snake_case):**

  - `Memory.rooms[room].policy`
    `{ threat_level, upgrade, energy:{low,high}, cpu:{min_bucket}, nav:{move_ratio_hint} }`
  - `Memory.rooms[room].metrics`
    `{ refill_sla, controller_gph, roads_pct }`
  - `Memory.rooms[room].alerts` → capped array of `{ tick, type, msg }`
  - `Memory.rooms[room].tests` → `{ pass, fail, last_fail?: {name, msg} }`

- **Heap (camelCase, tick-scoped):**

  - `global.orders: Map<creepName, Order>`
  - `global.snap.rooms: Map<room, RoomState>`
  - `global.snap.squads: Map<squadKey, SquadMetrics[]>`

---

## Color / severity (optional)

- **GREEN:** SLA met, policy stable
- **YELLOW:** approaching thresholds
- **RED:** breach or failure
- Apply as words or ANSI colors in logs if desired.

---

## Do / Don’t

- **Do** prefix every log with a single-word Title for grep-ability.
- **Do** keep Memory payloads numeric/string and small; keep raw telemetry/orders in heap.
- **Don’t** duplicate Architect’s path/road logic—consume its outputs.
- **Don’t** create new titles casually; prefer extending existing Managers/Squads.

---

This standard keeps names short, scopes crisp, and logs searchable—so the city-state of code stays legible as it scales.
