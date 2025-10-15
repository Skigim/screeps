/**
 * Worker squad coordinator. Translates mayor-issued directives and room state into
 * concrete creep-tasks, while tracking workforce metrics and maintaining population.
 *
 * The emphasis is on keeping creeps themselves logic-free (they simply run assigned
 * tasks) while this module manages lifecycle, task reuse, and instrumentation.
 */

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

/**
 * Summary of a creep-task assignment outcome, allowing the squad to reason about
 * churn (changed tasks) and idleness without inspecting creep internals.
 */
type TaskAssignment = {
  changed: boolean;
  idle: boolean;
  signature: string;
  task: TaskInstance | null;
};

/**
 * Produce a stable signature for a task, keyed by name and target reference. Used to
 * detect churn and maintain traceability back to directives.
 */
const signatureForTask = (task: TaskInstance | null): string => {
  if (!task) {
    return "IDLE";
  }

  const taskWithTarget = task as TaskInstance & { target?: RoomObject | RoomPosition | null };
  const liveTarget = taskWithTarget.target ?? null;
  let ref = "";

  if (liveTarget) {
    if ("id" in liveTarget && typeof (liveTarget as { id?: unknown }).id === "string") {
      ref = (liveTarget as { id: string }).id;
    } else if (typeof RoomPosition !== "undefined" && liveTarget instanceof RoomPosition) {
      ref = `${liveTarget.roomName ?? ""}:${liveTarget.x}:${liveTarget.y}`;
    }
  }

  if (!ref) {
    const proto = task.proto as Record<string, unknown> & { targetId?: string };
    ref = proto.targetId ?? "";
    if (!ref) {
      const runtimeTarget = Reflect.get(proto, "_target") as { ref?: string } | undefined;
      ref = runtimeTarget?.ref ?? "";
      const storedPos = runtimeTarget
        ? (Reflect.get(runtimeTarget, "_pos") as { x: number; y: number; roomName: string } | undefined)
        : undefined;
      if (!ref && storedPos) {
        ref = `${storedPos.roomName}:${storedPos.x}:${storedPos.y}`;
      }
    }
  }

  return `${task.name.toUpperCase()}:${ref}`;
};

/**
 * Ensure Heap bookkeeping maps exist before mutation; keeps the hot path null-safe
 * when running outside of the Screeps VM (tests, scripts).
 */
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

/** Lightweight CPU helper so we can sample per-creep assignment cost. */
const cpuNow = (): number => (typeof Game !== "undefined" && Game.cpu ? Game.cpu.getUsed() : 0);

/**
 * Detect whether a spawn/extension can accept energy, supporting both Store API and
 * older energy/energyCapacity fields to keep tests simple.
 */
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

/**
 * Locate the highest-priority refill structure (spawn first, then extensions).
 */
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

/** Pick a harvest source, biasing toward those with current energy. */
const pickHarvestTarget = (snapshot: RoomSenseSnapshot): Source | undefined => {
  const active = snapshot.sources.find(source => source.energy > 0);
  return active ?? snapshot.sources[0];
};

/**
 * Core assignment routine: examine creep state, choose or reuse a task, and stamp
 * telemetry used elsewhere for churn / traceability.
 */
const assignTask = (creep: Creep, room: Room, snapshot: RoomSenseSnapshot, _workerCount?: number): TaskAssignment => {
  ensureHeapMaps();
  const used = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);
  const isEmpty = used === 0;
  const isFull = free === 0;
  const controller = room.controller;
  const refillTarget = findRefillTarget(snapshot);
  const harvestTarget = pickHarvestTarget(snapshot);
  const controllerId = controller?.id;

  let task: TaskInstance | null = null;
  let signature = "IDLE";
  const memory = creep.memory as CreepMemory & { taskSignature?: string; role?: string; squad?: string };
  const previousSignature = memory.taskSignature ?? "";

  // Reuse the in-flight task when possible to avoid task churn and associated memory writes.
  const currentTask = creep.task as TaskInstance | null;
  if (currentTask && typeof currentTask.isValid === "function" && currentTask.isValid()) {
    task = currentTask;
  } else {
    if (!isEmpty) {
      if (refillTarget) {
        task = Tasks.transfer(refillTarget, RESOURCE_ENERGY);
      } else if (controllerId) {
        task = Tasks.upgrade(controller);
      } else if (!isFull && harvestTarget) {
        task = Tasks.harvest(harvestTarget);
      }
    } else if (!isFull && harvestTarget) {
      task = Tasks.harvest(harvestTarget);
    } else if (controllerId) {
      task = Tasks.upgrade(controller);
    }
  }

  if (task) {
    signature = signatureForTask(task);
  }

  const changed = signature !== previousSignature;

  if (changed || memory.taskSignature === undefined) {
    memory.taskSignature = signature;
  }
  if ((memory.role === undefined || memory.role === "") && signature !== "IDLE") {
    memory.role = "worker";
  }
  if ((memory.squad === undefined || memory.squad === "") && signature !== "IDLE") {
    memory.squad = "worker";
  }

  if (Heap.orders) {
    const taskName = task?.name ?? "idle";
    Heap.orders.set(creep.name, {
      id: `${creep.name}:${taskName}`,
      task: taskName,
      signature,
      persisted: !changed,
      assignedTick: Game.time
    });
  }

  return { changed, idle: signature === "IDLE", signature, task };
};

/**
 * Apply a task selection to the creep while minimizing unnecessary writes to
 * Creep.task, which in turn keeps Traveler cache churn low.
 */
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

/**
 * Persist squad metrics to Heap so downstream analytics (chronicle lines, dashboards)
 * have access to recent history without touching game objects.
 */
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

/**
 * Ensure the worker count stays within configured bounds by issuing spawn orders.
 */
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
  const result = idleSpawn.spawnCreep(body, name, {
    memory: {
      role: "worker",
      squad: "worker"
    } as CreepMemory
  });

  if (result !== OK && result !== ERR_BUSY) {
    const energyStatus = `${snapshot.energyAvailable}/${snapshot.energyCapacityAvailable}`;
    console.log(`[worker] spawn ${idleSpawn.name ?? idleSpawn.id} failed to create ${name}: ${result}`, {
      energyStatus
    });
  }
};

/**
 * High-level coordinator orchestrating the worker squad for the tick. Handles
 * population upkeep, task assignment, task execution, and metrics in a single pass.
 */
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
      if (Heap.debug.creepCpuSamples.length > 250) {
        Heap.debug.creepCpuSamples.splice(0, Heap.debug.creepCpuSamples.length - 250);
      }

      ordersIssued += 1;
      if (assignment.changed) {
        ordersChanged += 1;
      }
      if (assignment.idle) {
        idleCount += 1;
        applyTaskAssignment(creep, assignment);
        continue;
      }

      // Execute the assigned task; creeps themselves do not branch on behaviors.
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
