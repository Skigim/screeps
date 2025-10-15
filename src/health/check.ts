import { RCL1Config } from "../config/rcl1";
import { Heap, getRoomRuntimeFrame } from "../core/heap";
import type { Directives, HealthAlert, Policy, RoomMetricsMemory, RoomState } from "../types/contracts";
import type { RoomSenseSnapshot } from "../core/state";

const ALERT_LIMIT = 20;
const ROLLING_WINDOW = 50;

export type TickContext = {
  state: RoomState;
  policy: Policy;
  directives: Directives;
  snapshot: RoomSenseSnapshot;
};

type AugmentedRoomMemory = RoomMemory & {
  policy?: Policy;
  metrics?: RoomMetricsMemory;
  alerts?: HealthAlert[];
};

const getAugmentedMemory = (room: Room): AugmentedRoomMemory => room.memory as AugmentedRoomMemory;

const ensureRoomMetrics = (room: Room): RoomMetricsMemory => {
  const memory = getAugmentedMemory(room);
  const existing = memory.metrics ?? {};
  const sanitized: RoomMetricsMemory = {};

  if (typeof existing.upgradeContinuityPct === "number") {
    sanitized.upgradeContinuityPct = existing.upgradeContinuityPct;
  }
  if (typeof existing.spawnStarvationTicks === "number") {
    sanitized.spawnStarvationTicks = existing.spawnStarvationTicks;
  }
  if (typeof existing.lastControllerProgress === "number") {
    sanitized.lastControllerProgress = existing.lastControllerProgress;
  }
  if (typeof existing.lastSpawnTick === "number") {
    sanitized.lastSpawnTick = existing.lastSpawnTick;
  }
  if (typeof existing.creepCpuMedian === "number") {
    sanitized.creepCpuMedian = existing.creepCpuMedian;
  }
  if (typeof existing.cpuP95 === "number") {
    sanitized.cpuP95 = existing.cpuP95;
  }
  if (typeof existing.refillSlaMedian === "number") {
    sanitized.refillSlaMedian = existing.refillSlaMedian;
  }
  if (typeof existing.workerCount === "number") {
    sanitized.workerCount = existing.workerCount;
  }

  memory.metrics = sanitized;

  return memory.metrics;
};

export const pushAlert = (room: Room, type: "WARN" | "FAIL", msg: string): void => {
  const memory = getAugmentedMemory(room);

  if (!memory.alerts) {
    memory.alerts = [];
  }

  memory.alerts.push({ tick: Game.time, type, msg });
  memory.alerts = memory.alerts.slice(-ALERT_LIMIT);
};

const median = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
};

const percentile = (values: number[], fraction: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
  return sorted[Math.max(0, index)];
};

export const runTickMonitors = (room: Room, context: TickContext): void => {
  const memory = getAugmentedMemory(room);
  const metrics = ensureRoomMetrics(room);
  const runtime = getRoomRuntimeFrame(room.name);

  if (!memory.policy) {
    pushAlert(room, "FAIL", "policy missing");
  }

  const workerCreeps = context.snapshot.myCreeps.filter(
    creep => (creep.memory as CreepMemory & { role?: string }).role === "worker"
  );
  if (workerCreeps.length < RCL1Config.worker.min) {
    pushAlert(room, "WARN", `worker count below target (${workerCreeps.length}/${RCL1Config.worker.min})`);
  }

  runtime.workerCounts.push(workerCreeps.length);
  if (runtime.workerCounts.length > ROLLING_WINDOW) {
    runtime.workerCounts.shift();
  }
  metrics.workerCount = workerCreeps.length;

  const controller = room.controller;
  if (controller && controller.ticksToDowngrade !== undefined && controller.ticksToDowngrade <= 4000) {
    pushAlert(room, "WARN", "controller downgrade risk");
  }

  const progress = controller?.progress ?? 0;
  const previousProgress = metrics.lastControllerProgress ?? progress;
  const upgraded = progress > previousProgress ? 1 : 0;
  runtime.upgradeSuccess.push(upgraded);
  if (runtime.upgradeSuccess.length > ROLLING_WINDOW) {
    runtime.upgradeSuccess.shift();
  }
  metrics.lastControllerProgress = progress;

  const desiredWorkers = RCL1Config.worker.min;
  const starved = workerCreeps.length < desiredWorkers && room.energyAvailable < RCL1Config.spawn.energyBuffer;
  runtime.spawnStarved.push(starved ? 1 : 0);
  if (runtime.spawnStarved.length > ROLLING_WINDOW) {
    runtime.spawnStarved.shift();
  }

  const spawns = context.snapshot.structures.filter(
    (structure): structure is StructureSpawn => structure.structureType === STRUCTURE_SPAWN
  );

  if (spawns.some(spawn => spawn.spawning)) {
    metrics.lastSpawnTick = Game.time;
  }

  const creepSamples = Heap.debug?.creepCpuSamples ?? [];
  if (creepSamples.length > 0) {
    const medianCpu = median(creepSamples);
    metrics.creepCpuMedian = Number(medianCpu.toFixed(3));
    runtime.cpuMedians.push(medianCpu);
    if (runtime.cpuMedians.length > 100) {
      runtime.cpuMedians.shift();
    }

    if (medianCpu > 0.3) {
      pushAlert(room, "WARN", `median creep CPU ${medianCpu.toFixed(3)}ms`);
    }
  }

  if (runtime.cpuMedians.length > 0) {
    const cpuP95 = percentile(runtime.cpuMedians, 0.95);
    metrics.cpuP95 = Number(cpuP95.toFixed(3));
  }

  const { energyAvailable, energyCapacityAvailable } = context.snapshot;
  if (energyAvailable < energyCapacityAvailable) {
    if (runtime.refillActiveSince === undefined) {
      runtime.refillActiveSince = Game.time;
    }
  } else if (runtime.refillActiveSince !== undefined) {
    const duration = Game.time - runtime.refillActiveSince;
    runtime.refillActiveSince = undefined;
    if (duration > 0) {
      runtime.refillDurations.push(duration);
      if (runtime.refillDurations.length > ROLLING_WINDOW) {
        runtime.refillDurations.shift();
      }
    }
  }

  if (runtime.refillDurations.length > 0) {
    const refillMedian = median(runtime.refillDurations);
    metrics.refillSlaMedian = Number(refillMedian.toFixed(1));
  }
};
