import { RCL1Config } from "../config/rcl1";
import { calculateBodyCost, compileBody } from "../core/bodyFactory";
import { Heap } from "../core/heap";
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

const orderSignature = (order: { type: string; targetId?: Id<any> }): string =>
  `${order.type}:${order.targetId ?? "none"}`;

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

const assignOrder = (creep: Creep, room: Room, snapshot: RoomSenseSnapshot): { changed: boolean; idle: boolean } => {
  ensureHeapMaps();
  const isEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
  const controller = room.controller;
  let orderType = "IDLE";
  let targetId: Id<any> | undefined;
  const refillTarget = findRefillTarget(snapshot);

  if (isEmpty) {
    const source = snapshot.sources[0];
    if (source) {
      orderType = "HARVEST";
      targetId = source.id;
    }
  } else if (refillTarget) {
    orderType = "TRANSFER";
    targetId = refillTarget.id as Id<any>;
  } else if (controller) {
    orderType = "UPGRADE";
    targetId = controller.id as Id<any>;
  }

  const signature = orderSignature({ type: orderType, targetId });
  const memory = creep.memory as CreepMemory & { orderId?: string; role?: string; squad?: string };
  const previousSignature = memory.orderId ?? "";
  const changed = signature !== previousSignature;

  const order: {
    id: string;
    type: string;
    targetId?: Id<any>;
    res?: ResourceConstant;
    amount?: number;
    params?: Record<string, unknown>;
  } = {
    id: `${creep.name}:${Game.time}`,
    type: orderType,
    params: { persisted: !changed }
  };

  if (targetId) {
    order.targetId = targetId;
  }
  if (orderType === "TRANSFER") {
    order.res = RESOURCE_ENERGY;
    order.amount = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  }

  if (Heap.orders) {
    Heap.orders.set(creep.name, order);
  }
  memory.orderId = signature;
  memory.role = "worker";
  memory.squad = "worker";

  return { changed, idle: orderType === "IDLE" };
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
      const { changed, idle } = assignOrder(creep, context.room, context.snapshot);
      const after = cpuNow();
      const delta = after - before;
      if (!Heap.debug) {
        Heap.debug = {};
      }
      if (!Heap.debug.creepCpuSamples) {
        Heap.debug.creepCpuSamples = [];
      }
      Heap.debug.creepCpuSamples.push(delta);
      ordersIssued += 1;
      if (changed) {
        ordersChanged += 1;
      }
      if (idle) {
        idleCount += 1;
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
