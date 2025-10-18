/**
 * SPAWN LOCK SYSTEM
 * 
 * Locks spawning when critical creeps (core production team) drop below safe TTL.
 * Prevents spawn exhaustion and ensures critical roles are replaced naturally.
 */

/**
 * Check if spawn should be locked based on critical creep TTL
 * Critical creeps: 2 miners + 3 haulers (core production team)
 */
export function isSpawnLocked(room: Room): boolean {
  if (!Memory.empire) {
    Memory.empire = {};
  }

  if (!Memory.empire.spawnLocks) {
    (Memory.empire as any).spawnLocks = {};
  }

  const locks = (Memory.empire as any).spawnLocks as Record<string, number>;

  // Get all critical role creeps (miners and haulers)
  const creeps = room.find(FIND_MY_CREEPS);
  const miners = creeps.filter(c => c.memory.role === 'miner');
  const haulers = creeps.filter(c => c.memory.role === 'hauler');
  const criticalCreeps = [...miners, ...haulers];

  // If we have the full team (2 miners + 3 haulers), check TTL
  if (miners.length >= 2 && haulers.length >= 3) {
    // Find the creep with lowest TTL
    const minTTL = Math.min(...criticalCreeps.map(c => c.ticksToLive || 0));

    // Lock spawn if any critical creep below 250 TTL
    if (minTTL < 250 && minTTL > 0) {
      locks[room.name] = Game.time;
      return true;
    }
  }

  // Unlock if threshold passed
  if (locks[room.name]) {
    delete locks[room.name];
  }

  return false;
}

/**
 * Get spawn lock status for a room
 */
export function getSpawnLockInfo(room: Room): {
  locked: boolean;
  reason?: string;
  minCriticalTTL?: number;
} {
  const creeps = room.find(FIND_MY_CREEPS);
  const miners = creeps.filter(c => c.memory.role === 'miner');
  const haulers = creeps.filter(c => c.memory.role === 'hauler');
  const criticalCreeps = [...miners, ...haulers];

  if (criticalCreeps.length === 0) {
    return { locked: false };
  }

  const minTTL = Math.min(...criticalCreeps.map(c => c.ticksToLive || 0));

  if (minTTL < 250 && minTTL > 0) {
    return {
      locked: true,
      reason: `Critical creep below 250 TTL (${miners.length}M/${haulers.length}H)`,
      minCriticalTTL: minTTL
    };
  }

  return { locked: false };
}

