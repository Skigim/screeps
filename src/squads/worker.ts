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

const recordMetrics = (room: Room, idlePct: number, ordersIssued: number, ordersChanged: number): void => {
  const squadName = "worker";
  ensureHeapMaps();
  const entries = Heap.snap!.squads.get(squadName) ?? [];
  const metrics: SquadMetrics = {
    tick: Game.time,
    room: room.name,
    squad: squadName,
    idlePct,
    ordersIssued,
    ordersChanged
  };

  entries.push(metrics);
  if (entries.length > 50) {
    entries.splice(0, entries.length - 50);
  }
  Heap.snap!.squads.set(squadName, entries);
};

const assignOrder = (creep: Creep, room: Room, snapshot: RoomSenseSnapshot): { changed: boolean; idle: boolean } => {
  ensureHeapMaps();
  const isEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
  const controller = room.controller;
  let orderType = "IDLE";
  let targetId: Id<any> | undefined;

  if (isEmpty) {
    const source = snapshot.sources[0];
    if (source) {
      orderType = "HARVEST";
      targetId = source.id;
    }
  } else if (controller) {
    orderType = "UPGRADE";
    targetId = controller.id as Id<any>;
  }

  const signature = orderSignature({ type: orderType, targetId });
  const memory = creep.memory as CreepMemory & { orderId?: string; role?: string; squad?: string };
  const previousSignature = memory.orderId ?? "";
  const changed = signature !== previousSignature;

  const order = {
    id: `${creep.name}:${Game.time}`,
    type: orderType,
    payload: { targetId }
  };

  Heap.orders!.set(creep.name, order);
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
  public run(context: WorkerSquadContext): void {
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
    recordMetrics(context.room, idlePct, ordersIssued, ordersChanged);
  }
}
