## Screeps BodyFactory + Plans — Clean Rebuild v2

A data-driven way to define creep bodies ("plans") and compile them into concrete body arrays at spawn time based on current room context.

**Why this structure?**

- Keep per-RCL config declarative and readable.
- Centralize ratio/constraint logic for testability.
- Toggle situational behavior via profiles (burn, conserve, etc.).
- Integrate cleanly with Traveler and creep-tasks without scattering movement or task code.

---

## Shared Types

```ts
export type ProfileName = string;

export type BodyPlan = {
  name: string;
  chassis: BodyPartConstant[];
  modules?: BodyPartConstant[][];
  maxModuleRepeats?: number;
  constraints?: {
    maxEnergy?: number;
    minEnergy?: number;
    maxParts?: number;
    maxSpawnTime?: number;
    moveRatio?: number;
    carryPerWork?: number;
    healPerTough?: number;
  };
  profiles?: { [profile: ProfileName]: Partial<BodyPlan> };
};

export type CompileCtx = {
  availableEnergy: number;
  policy?: {
    energyCap?: number;
    moveRatio?: number;
  };
  profile?: ProfileName;
};
```

---

## Cost Table and Helpers

```ts
const PART_COST: Record<BodyPartConstant, number> = {
  move: 50,
  work: 100,
  carry: 50,
  attack: 80,
  ranged_attack: 150,
  tough: 10,
  heal: 250,
  claim: 600
};

function bodyCost(parts: BodyPartConstant[]): number {
  let sum = 0;
  for (const p of parts) sum += PART_COST[p];
  return sum;
}

function count(parts: BodyPartConstant[], t: BodyPartConstant): number {
  return parts.reduce((n, p) => n + (p === t ? 1 : 0), 0);
}
```

---

## Constraint Checks

```ts
function passesMoveRatio(parts: BodyPartConstant[], wantRatio?: number): boolean {
  if (!wantRatio || wantRatio <= 0) return true;
  const move = count(parts, MOVE);
  const nonMove = parts.length - move;
  const need = Math.ceil(wantRatio * nonMove);
  return move >= need;
}

function passesCarryPerWork(parts: BodyPartConstant[], cpw?: number): boolean {
  if (!cpw || cpw <= 0) return true;
  const carry = count(parts, CARRY);
  const work = count(parts, WORK);
  const need = Math.ceil(cpw * work);
  return work === 0 ? true : carry >= need;
}

function passesHealPerTough(parts: BodyPartConstant[], hpt?: number): boolean {
  if (!hpt || hpt <= 0) return true;
  const heal = count(parts, HEAL);
  const tough = count(parts, TOUGH);
  const need = Math.ceil(hpt * tough);
  return tough === 0 ? true : heal >= need;
}

function passesSpawnTime(parts: BodyPartConstant[], maxSpawnTime?: number): boolean {
  if (!maxSpawnTime) return true;
  const time = 3 * parts.length;
  return time <= maxSpawnTime;
}
```

---

## Profile Merging

```ts
function mergePlanWithProfile(plan: BodyPlan, profile?: ProfileName): BodyPlan {
  if (!profile) return plan;
  const o = plan.profiles?.[profile];
  if (!o) return plan;
  return {
    name: o.name ?? plan.name,
    chassis: o.chassis ?? plan.chassis,
    modules: o.modules ?? plan.modules,
    maxModuleRepeats: o.maxModuleRepeats ?? plan.maxModuleRepeats,
    constraints: { ...plan.constraints, ...(o.constraints || {}) },
    profiles: plan.profiles
  };
}
```

---

## BodyFactory

```ts
export function compileBody(plan: BodyPlan, ctx: CompileCtx): BodyPartConstant[] {
  const profiled = mergePlanWithProfile(plan, ctx.profile);
  const policyMoveRatio = ctx.policy?.moveRatio;
  const c = profiled.constraints || {};

  const energyCap = Math.min(ctx.availableEnergy, c.maxEnergy ?? Infinity, ctx.policy?.energyCap ?? Infinity);

  if (c.minEnergy && energyCap < c.minEnergy) {
    return bodyCost(profiled.chassis) <= energyCap ? [...profiled.chassis] : [];
  }

  let body = [...profiled.chassis];
  let energy = bodyCost(body);
  if (energy > energyCap) return [];
  if (body.length > (c.maxParts ?? 50)) return [];
  if (!passesMoveRatio(body, c.moveRatio ?? policyMoveRatio)) return [];
  if (!passesCarryPerWork(body, c.carryPerWork)) return [];
  if (!passesHealPerTough(body, c.healPerTough)) return [];
  if (!passesSpawnTime(body, c.maxSpawnTime)) return [];

  const maxRepeats = profiled.maxModuleRepeats ?? 20;
  const bricks = profiled.modules ?? [];

  const tryAdd = (mod: BodyPartConstant[]) => {
    if (!mod || mod.length === 0) return false;
    if (body.length + mod.length > (c.maxParts ?? 50)) return false;
    const newEnergy = energy + bodyCost(mod);
    if (newEnergy > energyCap) return false;

    const candidate = body.concat(mod);
    if (!passesMoveRatio(candidate, c.moveRatio ?? policyMoveRatio)) return false;
    if (!passesCarryPerWork(candidate, c.carryPerWork)) return false;
    if (!passesHealPerTough(candidate, c.healPerTough)) return false;
    if (!passesSpawnTime(candidate, c.maxSpawnTime)) return false;

    body = candidate;
    energy = newEnergy;
    return true;
  };

  let repeats = 0;
  let changed = true;
  while (changed && repeats < maxRepeats) {
    changed = false;
    for (const m of bricks) {
      if (tryAdd(m)) changed = true;
    }
    if (changed) repeats++;
  }

  return body;
}
```

---

## Plan Library (RCL1 → RCL8)

```ts
export const WorkerRCL1Plan: BodyPlan = {
  name: "worker.rcl1",
  chassis: [WORK, CARRY, MOVE],
  modules: [[WORK, CARRY, MOVE]],
  maxModuleRepeats: 2,
  constraints: { maxParts: 12, maxSpawnTime: 300, moveRatio: 0.5 }
};

export const EmergencyPlan: BodyPlan = {
  name: "emergency",
  chassis: [WORK, CARRY, MOVE],
  maxModuleRepeats: 0,
  constraints: { maxParts: 3, maxSpawnTime: 150 }
};

export const MinerPlan: BodyPlan = {
  name: "miner",
  chassis: [WORK, WORK, MOVE],
  modules: [[WORK]],
  maxModuleRepeats: 4,
  constraints: { maxParts: 12, maxEnergy: 800, moveRatio: 0.2 },
  profiles: {
    linked: { chassis: [WORK, WORK, WORK, MOVE], modules: [[WORK]], maxModuleRepeats: 6 }
  }
};

export const HaulerPlan: BodyPlan = {
  name: "hauler",
  chassis: [CARRY, CARRY, MOVE],
  modules: [[CARRY, CARRY, MOVE]],
  maxModuleRepeats: 10,
  constraints: { moveRatio: 0.5, maxParts: 40 },
  profiles: {
    swampy: { modules: [[CARRY, MOVE]], constraints: { moveRatio: 1.0 } },
    linksOnline: { maxModuleRepeats: 4 }
  }
};

export const ManagerPlan: BodyPlan = {
  name: "manager",
  chassis: [CARRY, CARRY, MOVE],
  modules: [[CARRY, CARRY], [MOVE]],
  maxModuleRepeats: 6,
  constraints: { moveRatio: 0.5, maxParts: 24, maxEnergy: 1200 }
};

export const UpgraderPlan: BodyPlan = {
  name: "upgrader",
  chassis: [WORK, CARRY, MOVE],
  modules: [[WORK, WORK, CARRY, MOVE]],
  maxModuleRepeats: 10,
  constraints: { carryPerWork: 0.5, maxParts: 40 },
  profiles: {
    burn: { maxModuleRepeats: 12 },
    steady: { maxModuleRepeats: 8 },
    conserve: { maxModuleRepeats: 3, constraints: { maxEnergy: 600 } }
  }
};

export const BuilderPlan: BodyPlan = {
  name: "builder",
  chassis: [WORK, CARRY, MOVE],
  modules: [[WORK, CARRY, MOVE]],
  maxModuleRepeats: 8,
  constraints: { carryPerWork: 1.0, moveRatio: 0.5, maxParts: 30 }
};

export const ReserverPlan: BodyPlan = {
  name: "reserver",
  chassis: [CLAIM, MOVE],
  modules: [[CLAIM, MOVE]],
  maxModuleRepeats: 2,
  constraints: { maxParts: 10, maxEnergy: 1300 }
};

export const RemoteHaulerPlan: BodyPlan = {
  name: "remoteHauler",
  chassis: [CARRY, CARRY, MOVE],
  modules: [[CARRY, CARRY, MOVE]],
  maxModuleRepeats: 16,
  constraints: { moveRatio: 0.5, maxParts: 45 },
  profiles: {
    swampy: { modules: [[CARRY, MOVE]], constraints: { moveRatio: 1.0 } }
  }
};

export const RangerPlan: BodyPlan = {
  name: "ranger",
  chassis: [TOUGH, MOVE, RANGED_ATTACK, MOVE],
  modules: [[RANGED_ATTACK, MOVE]],
  maxModuleRepeats: 10,
  constraints: { maxParts: 30 },
  profiles: {
    siege: { chassis: [TOUGH, TOUGH, TOUGH, MOVE, RANGED_ATTACK, MOVE] }
  }
};

export const HealerPlan: BodyPlan = {
  name: "healer",
  chassis: [MOVE, HEAL],
  modules: [[MOVE, HEAL]],
  maxModuleRepeats: 12,
  constraints: { maxParts: 25 }
};

export const LabTechPlan: BodyPlan = {
  name: "labtech",
  chassis: [WORK, CARRY, MOVE],
  modules: [[CARRY, CARRY, MOVE]],
  maxModuleRepeats: 6,
  constraints: { moveRatio: 0.5, maxParts: 20 }
};

export const ScoutPlan: BodyPlan = {
  name: "scout",
  chassis: [MOVE],
  maxModuleRepeats: 0,
  constraints: { maxParts: 1, maxSpawnTime: 50 }
};

export const AllPlans: Record<string, BodyPlan> = {
  "worker.rcl1": WorkerRCL1Plan,
  emergency: EmergencyPlan,
  miner: MinerPlan,
  hauler: HaulerPlan,
  manager: ManagerPlan,
  upgrader: UpgraderPlan,
  builder: BuilderPlan,
  reserver: ReserverPlan,
  remoteHauler: RemoteHaulerPlan,
  ranger: RangerPlan,
  healer: HealerPlan,
  labtech: LabTechPlan,
  scout: ScoutPlan
};
```

---

## RCL Config Stubs

```ts
type RoleSpec = {
  min: number;
  max?: number;
  plan: keyof typeof AllPlans;
  profile?: string | ((r: any) => string | undefined);
};

export type RCLConfig = {
  theme: string;
  priorities: string[];
  structures: Partial<Record<BuildableStructureConstant, number>>;
  roles: Record<string, RoleSpec>;
  services: string[];
  policies: any;
  transitions: Array<{ when: (room: Room) => boolean; next: number; notes?: string }>;
};

export const RCL1Config: RCLConfig = {
  theme: "Bootstrap Cleanly",
  priorities: ["build:extensions", "roads:spawn↔sources", "spawn:workers"],
  structures: { extension: 5, road: 1 } as any,
  roles: {
    worker: { min: 4, plan: "worker.rcl1" },
    scout: { min: 1, plan: "scout" },
    emergency: { min: 0, plan: "emergency" }
  },
  services: ["BodyFactory", "ThreatManager", "UpgradeGovernor"],
  policies: { upgrade: "steady" },
  transitions: [{ when: r => r.controller?.level === 2, next: 2 }]
};

export const RCL2Config: RCLConfig = {
  theme: "Split Economy (Miner + Hauler)",
  priorities: ["place:containers@source", "roads:core", "spawn:miners+haulers"],
  structures: { container: 2, extension: "MAX" as any },
  roles: {
    miner: { min: 2, plan: "miner", profile: r => (r.linksOnline ? "linked" : undefined) },
    hauler: {
      min: 2,
      plan: "hauler",
      profile: r => (r.swampy ? "swampy" : r.linksOnline ? "linksOnline" : undefined)
    },
    builder: { min: 1, plan: "builder" },
    upgrader: { min: 1, plan: "upgrader", profile: r => r.policy?.upgrade }
  },
  services: ["BodyFactory", "ThreatManager", "UpgradeGovernor"],
  policies: { upgrade: "steady" },
  transitions: [{ when: r => r.controller?.level === 3, next: 3 }]
};
```

---

## Traveler Integration

```ts
export const Travel = {
  moveTo(
    creep: Creep,
    target: RoomPosition | { pos: RoomPosition },
    opts: any = {}
  ): CreepMoveReturnCode | ERR_NO_PATH | ERR_INVALID_TARGET | OK {
    const roomMem: any = Memory.rooms[creep.room.name] || {};
    const threat: string = (roomMem.policy && roomMem.policy.threatLevel) || "none";
    const danger = threat !== "none";

    const merged = Object.assign(
      {
        range: 1,
        ignoreCreeps: false,
        reusePath: 10,
        allowHostile: !danger,
        preferHighway: true,
        maxOps: 2000
      },
      opts
    );

    return (creep as any).travelTo((target as any).pos || target, merged);
  }
};
```

---

## creep-tasks Integration

```ts
export namespace Tasks {
  export function haulEnergy(creep: Creep, from: Structure | Ruin | Tombstone, to: Structure) {
    const Task = (global as any).Task;
    return new Task("haulEnergy", creep, { fromId: from.id, toId: to.id });
  }

  export function upgrade(creep: Creep, controller: StructureController) {
    const Task = (global as any).Task;
    return new Task("upgrade", creep, { id: controller.id });
  }

  export function build(creep: Creep, site: ConstructionSite) {
    const Task = (global as any).Task;
    return new Task("build", creep, { id: site.id });
  }
}
```

---

## Role Logic Examples

```ts
export const RoleLogic = {
  hauler(creep: Creep) {
    const mem: any = creep.memory;
    if (!mem.state) mem.state = "collect";

    if (mem.state === "collect" && _.sum(creep.store) === creep.store.getCapacity()) mem.state = "deliver";
    if (mem.state === "deliver" && _.sum(creep.store) === 0) mem.state = "collect";

    if (mem.state === "collect") {
      const src = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s =>
          (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
          (s as any).store[RESOURCE_ENERGY] > 0
      });
      if (src) {
        if (creep.withdraw(src as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) Travel.moveTo(creep, src as any);
      }
    } else {
      const targets = creep.room.find(FIND_STRUCTURES, {
        filter: s =>
          (s.structureType === STRUCTURE_SPAWN ||
            s.structureType === STRUCTURE_EXTENSION ||
            s.structureType === STRUCTURE_TOWER) &&
          (s as any).store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });
      const tgt = creep.pos.findClosestByPath(targets);
      if (tgt) {
        if (creep.transfer(tgt as any, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) Travel.moveTo(creep, tgt as any);
      }
    }
  },

  upgrader(creep: Creep) {
    const ctl = creep.room.controller;
    if (!ctl) return;
    if (creep.store[RESOURCE_ENERGY] === 0) {
      const src = creep.pos.findClosestByRange(FIND_STRUCTURES, {
        filter: s =>
          (s.structureType === STRUCTURE_LINK ||
            s.structureType === STRUCTURE_STORAGE ||
            s.structureType === STRUCTURE_CONTAINER) &&
          (s as any).store[RESOURCE_ENERGY] > 0
      });
      if (src) {
        const res =
          src.structureType === STRUCTURE_LINK
            ? (src as StructureLink).transferEnergy(creep)
            : creep.withdraw(src as any, RESOURCE_ENERGY);
        if (res === ERR_NOT_IN_RANGE) Travel.moveTo(creep, src as any);
      }
    } else {
      if (creep.upgradeController(ctl) === ERR_NOT_IN_RANGE) Travel.moveTo(creep, ctl);
    }
  }
};
```

---

## Integration Hints

- Place this module at `src/core/BodyFactory.ts` and export `compileBody` plus types.
- Store individual plan files under `src/creep-plans/` and re-export via an index.
- Keep RCL configs in `src/rcl/RCL{1,2}Config.ts`.
- Register with `methodsIndex` for discovery.
- Build `CompileCtx` in `RoomStateManager` once per tick and pass to `compileBody`.
- Let `SpawnManager` resolve plan + profile, then request parts through `compileBody`.
- Initialize Traveler at global boot so `creep.travelTo` exists; always route movement via `Travel.moveTo`.
- Define a minimal set of canonical tasks and let role code request them rather than issuing raw actions.
