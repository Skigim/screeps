import { RCL1Config } from "../config/rcl1";
import { calculateBodyCost, compileBody } from "../core/bodyFactory";
import { Heap } from "../core/heap";
import Tasks, { type TaskInstance } from "../vendor/creep-tasks";
import type { Directives, Policy, RoomState, SquadMetrics } from "../types/contracts";
import type { RoomSenseSnapshot } from "../core/state";

export type WorkerSquadContext = {
  room: Room;
  policy: Policy;
  directives: Directives;
  state: RoomState;
  snapshot: RoomSenseSnapshot;
};

export type WorkerSquadReport = {
  workers: number;
  queued: number;
  targetMin: number;
  targetMax: number;
  ordersIssued: number;
  ordersChanged: number;
  idlePct: number;
};

type TaskAssignment = {
  changed: boolean;
  idle: boolean;
  signature: string;
  task: TaskInstance | null;
};

const ensureHeapMaps = (): void => {
  if (!Heap.snap) {
    Heap.snap = { rooms: new Map(), squads: new Map() };
  }
  if (!Heap.snap.squads) {
    Heap.snap.squads = new Map();
  }
  if (!Heap.orders) {
    Heap.orders = new Map();
  }
  if (!Heap.debug) {
    Heap.debug = {};
  }
  if (!Heap.debug.creepCpuSamples) {
    Heap.debug.creepCpuSamples = [];
  }
};

const cpuNow = (): number => (typeof Game !== "undefined" && Game.cpu ? Game.cpu.getUsed() : 0);

const hasEnergyFreeCapacity = (structure: StructureSpawn | StructureExtension): boolean => {
  const store = structure.store as Store<ResourceConstant, false> | undefined;
  if (store && typeof store.getFreeCapacity === "function") {
    const free = store.getFreeCapacity(RESOURCE_ENERGY);
    return typeof free === "number" && free > 0;
  }

  const legacy = structure as StructureSpawn | (StructureExtension & { energy?: number; energyCapacity?: number });
  if (typeof legacy.energy === "number" && typeof legacy.energyCapacity === "number") {
    return legacy.energy < legacy.energyCapacity;
  }

  return false;
};

const findRefillTarget = (snapshot: RoomSenseSnapshot): StructureSpawn | StructureExtension | undefined => {
  const spawn = snapshot.structures.find((structure): structure is StructureSpawn => {
    if (structure.structureType !== STRUCTURE_SPAWN) {
      return false;
    }

    return hasEnergyFreeCapacity(structure as StructureSpawn);
  });
  if (spawn) {
    return spawn;
  }

  return snapshot.structures.find((structure): structure is StructureExtension => {
    if (structure.structureType !== STRUCTURE_EXTENSION) {
      return false;
    }

    return hasEnergyFreeCapacity(structure as StructureExtension);
  });
};

const pickHarvestTarget = (snapshot: RoomSenseSnapshot): Source | undefined => {
  const active = snapshot.sources.find(source => source.energy > 0);
  return active ?? snapshot.sources[0];
};

const assignTask = (creep: Creep, room: Room, snapshot: RoomSenseSnapshot, workerCount: number): TaskAssignment => {
  ensureHeapMaps();
  const used = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);
  const isEmpty = used === 0;
  const isFull = free === 0;
  const controller = room.controller;
  const refillTarget = findRefillTarget(snapshot);
  const harvestTarget = pickHarvestTarget(snapshot);
  const shouldRefillSpawn = !isEmpty && refillTarget && workerCount < RCL1Config.worker.min;

  let task: TaskInstance | null = null;
  let signature = "IDLE";

  if (!isFull && harvestTarget) {
    task = Tasks.harvest(harvestTarget);
    signature = `HARVEST:${harvestTarget.id}`;
  } else if (shouldRefillSpawn) {
    task = Tasks.transfer(refillTarget, RESOURCE_ENERGY);
    signature = `TRANSFER:${refillTarget.id}`;
  } else if (!isEmpty && controller) {
    task = Tasks.upgrade(controller);
    signature = `UPGRADE:${controller.id}`;
  }

  const memory = creep.memory as CreepMemory & { taskSignature?: string; role?: string; squad?: string };
  const previousSignature = memory.taskSignature ?? "";
  const changed = signature !== previousSignature;

  memory.taskSignature = signature;
  memory.role = "worker";
  memory.squad = "worker";

  if (Heap.orders) {
    Heap.orders.set(creep.name, { task: signature, persisted: !changed });
  }

  return { changed, idle: signature === "IDLE", signature, task };
};

const applyTaskAssignment = (creep: Creep, assignment: TaskAssignment): void => {
  if (assignment.task) {
    if (assignment.changed || !creep.task) {
      creep.task = assignment.task;
    }
    return;
  }

  if (creep.task) {
    creep.task = null;
  }
};

const recordMetrics = (
  room: Room,
  headcount: number,
  queued: number,
  idlePct: number,
  ordersIssued: number,
  ordersChanged: number
): void => {
  const squadName = "worker";
  ensureHeapMaps();
  const snap = Heap.snap;
  if (!snap) {
    return;
  }
  const entries = snap.squads.get(squadName) ?? [];
  const metrics: SquadMetrics = {
    tick: Game.time,
    room: room.name,
    squad: squadName,
    idlePct,
    ordersIssued,
    ordersChanged,
    headcount,
    queued
  };

  entries.push(metrics);
  if (entries.length > 50) {
    entries.splice(0, entries.length - 50);
  }
  snap.squads.set(squadName, entries);
};

const maintainPopulation = (context: WorkerSquadContext): void => {
  const { policy, snapshot } = context;
  const workerCreeps = snapshot.myCreeps.filter(
    creep => ((creep.memory as CreepMemory & { role?: string }).role ?? "") === "worker"
  );
  if (workerCreeps.length >= RCL1Config.worker.max) {
    return;
  }

  const idleSpawn = snapshot.structures.find((structure): structure is StructureSpawn => {
    if (structure.structureType !== STRUCTURE_SPAWN) {
      return false;
    }

    const spawn = structure as StructureSpawn;
    return !spawn.spawning;
  });

  if (!idleSpawn) {
    return;
  }

  const body = compileBody("worker", RCL1Config.worker.bodyPlan, snapshot.energyCapacityAvailable, policy);
  const cost = calculateBodyCost(body);

  if (snapshot.energyAvailable < cost) {
    return;
  }

  const name = `wrk-${Game.time}-${Math.floor(Math.random() * 1000)}`;
  idleSpawn.spawnCreep(body, name, {
    memory: {
      role: "worker",
      squad: "worker"
    } as CreepMemory
  });
};

export class WorkerSquad {
  public run(context: WorkerSquadContext): WorkerSquadReport {
    maintainPopulation(context);

    const workerCreeps = context.snapshot.myCreeps.filter(
      creep => ((creep.memory as CreepMemory & { role?: string }).role ?? "") === "worker"
    );
    let ordersIssued = 0;
    let ordersChanged = 0;
    let idleCount = 0;

    for (const creep of workerCreeps) {
      const before = cpuNow();
      const assignment = assignTask(creep, context.room, context.snapshot, workerCreeps.length);
      const after = cpuNow();
      const delta = after - before;
      ensureHeapMaps();
      if (!Heap.debug) {
        Heap.debug = {};
      }
      if (!Heap.debug.creepCpuSamples) {
        Heap.debug.creepCpuSamples = [];
      }
      Heap.debug.creepCpuSamples.push(delta);

      ordersIssued += 1;
      if (assignment.changed) {
        ordersChanged += 1;
      }
      if (assignment.idle) {
        idleCount += 1;
        applyTaskAssignment(creep, assignment);
        continue;
      }

      applyTaskAssignment(creep, assignment);
      if (typeof creep.runTask === "function") {
        creep.runTask();
      }
    }

    const idlePct = workerCreeps.length === 0 ? 0 : idleCount / workerCreeps.length;
    const queued = context.snapshot.structures.reduce((count, structure) => {
      if (structure.structureType !== STRUCTURE_SPAWN) {
        return count;
      }

      const spawn = structure as StructureSpawn;
      return spawn.spawning ? count + 1 : count;
    }, 0);

    recordMetrics(context.room, workerCreeps.length, queued, idlePct, ordersIssued, ordersChanged);

    return {
      workers: workerCreeps.length,
      queued,
      targetMin: RCL1Config.worker.min,
      targetMax: RCL1Config.worker.max,
      ordersIssued,
      ordersChanged,
      idlePct
    };
  }
}

export const workerInternals = {
  assignTask
};
