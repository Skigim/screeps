import { RCL1Config } from "../config/rcl1";
import { Heap } from "../core/heap";
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

  if (!memory.metrics) {
    memory.metrics = {
      upgradeContinuity: [],
      spawnStarvation: []
    };
  }

  return memory.metrics;
};

const updateRolling = (buffer: number[], value: number, cap: number): void => {
  buffer.push(value);
  if (buffer.length > cap) {
    buffer.shift();
  }
};

export const pushAlert = (room: Room, type: "WARN" | "FAIL", msg: string): void => {
  const memory = getAugmentedMemory(room);

  if (!memory.alerts) {
    memory.alerts = [];
  }

  memory.alerts.push({ tick: Game.time, type, msg });

  if (memory.alerts.length > ALERT_LIMIT) {
    memory.alerts.splice(0, memory.alerts.length - ALERT_LIMIT);
  }
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

export const runTickMonitors = (room: Room, context: TickContext): void => {
  const memory = getAugmentedMemory(room);
  const metrics = ensureRoomMetrics(room);

  if (!memory.policy) {
    pushAlert(room, "FAIL", "policy missing");
  }

  const workerCreeps = context.snapshot.myCreeps.filter(
    creep => (creep.memory as CreepMemory & { role?: string }).role === "worker"
  );
  if (workerCreeps.length < RCL1Config.worker.min) {
    pushAlert(room, "WARN", `worker count below target (${workerCreeps.length}/${RCL1Config.worker.min})`);
  }

  const controller = room.controller;
  if (controller && controller.ticksToDowngrade !== undefined && controller.ticksToDowngrade <= 4000) {
    pushAlert(room, "WARN", "controller downgrade risk");
  }

  const creepSamples = Heap.debug?.creepCpuSamples ?? [];
  if (creepSamples.length > 0) {
    const medianCpu = median(creepSamples);
    metrics.creepCpuMedian = medianCpu;
    if (medianCpu > 0.3) {
      pushAlert(room, "WARN", `median creep CPU ${medianCpu.toFixed(3)}ms`);
    }
  }

  const progress = controller?.progress ?? 0;
  const previousProgress = metrics.lastControllerProgress ?? progress;
  const upgraded = progress > previousProgress;
  updateRolling(metrics.upgradeContinuity, upgraded ? 1 : 0, ROLLING_WINDOW);
  metrics.lastControllerProgress = progress;

  const desiredWorkers = RCL1Config.worker.min;
  const starved = workerCreeps.length < desiredWorkers && room.energyAvailable < RCL1Config.spawn.energyBuffer;
  updateRolling(metrics.spawnStarvation, starved ? 1 : 0, ROLLING_WINDOW);

  const spawns = context.snapshot.structures.filter(
    (structure): structure is StructureSpawn => structure.structureType === STRUCTURE_SPAWN
  );

  if (spawns.some(spawn => spawn.spawning)) {
    metrics.lastSpawnTick = Game.time;
  }
};
