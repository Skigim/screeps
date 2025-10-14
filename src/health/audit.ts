import type { Policy, RoomMetricsMemory } from '../types/contracts';
import type { TickContext } from './check';
import { pushAlert } from './check';

const AUDIT_WINDOW = 50;

type AugmentedRoomMemory = RoomMemory & {
  metrics?: RoomMetricsMemory;
  policy?: Policy;
};

const toPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const runRoomAudit = (room: Room, _context: TickContext): void => {
  const memory = room.memory as AugmentedRoomMemory;
  const metrics = memory.metrics;

  if (!metrics) {
    return;
  }

  if (metrics.upgradeContinuity.length >= AUDIT_WINDOW) {
    const continuity = metrics.upgradeContinuity.reduce((sum, value) => sum + value, 0) / metrics.upgradeContinuity.length;
    if (continuity < 0.9) {
      pushAlert(room, 'WARN', `upgrade continuity ${toPercent(continuity)} below SLA`);
    }
  }

  if (metrics.spawnStarvation.length >= AUDIT_WINDOW) {
    const starvedTicks = metrics.spawnStarvation.reduce((sum, value) => sum + value, 0);
    if (starvedTicks > 3) {
      pushAlert(room, 'WARN', `spawn starvation ${starvedTicks} ticks in window`);
    }
  }
};
