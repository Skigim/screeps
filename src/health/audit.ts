import type { Policy, RoomMetricsMemory } from "../types/contracts";
import { getRoomRuntimeFrame } from "../core/heap";
import type { TickContext } from "./check";
import { pushAlert } from "./check";

const AUDIT_WINDOW = 50;

type AugmentedRoomMemory = RoomMemory & {
  metrics?: RoomMetricsMemory;
  policy?: Policy;
};

const toPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const runRoomAudit = (room: Room, _context: TickContext): void => {
  const memory = room.memory as AugmentedRoomMemory;
  if (!memory.metrics) {
    memory.metrics = {};
  }
  const metrics = memory.metrics as RoomMetricsMemory;
  const runtime = getRoomRuntimeFrame(room.name);

  const continuityWindow = runtime.upgradeSuccess.slice(-AUDIT_WINDOW);
  if (continuityWindow.length === AUDIT_WINDOW) {
    const continuity = continuityWindow.reduce((sum, value) => sum + value, 0) / AUDIT_WINDOW;
    metrics.upgradeContinuityPct = Math.round(continuity * 100);
    if (continuity < 0.9) {
      pushAlert(room, "WARN", `upgrade continuity ${toPercent(continuity)} below SLA`);
    }
  }

  const starvedWindow = runtime.spawnStarved.slice(-AUDIT_WINDOW);
  if (starvedWindow.length === AUDIT_WINDOW) {
    const starvedTicks = starvedWindow.reduce((sum, value) => sum + value, 0);
    metrics.spawnStarvationTicks = starvedTicks;
    if (starvedTicks > 3) {
      pushAlert(room, "WARN", `spawn starvation ${starvedTicks} ticks in window`);
    }
  }
};
