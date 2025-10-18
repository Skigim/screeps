/**
 * SILENT STATISTICS TRACKING
 * 
 * Tracks RCL progression, creep composition, energy metrics, and performance data
 * completely silently in memory. Never logs to console.
 * 
 * Data available at: Memory.stats
 */

/**
 * Initialize stats tracking if not already present
 */
export function initializeStats(): void {
  if (!Memory.stats) {
    Memory.stats = {
      rcl: 0,
      ticksAtCurrentRcl: 0,
      creepCounts: {
        miner: 0,
        hauler: 0,
        builder: 0,
        upgrader: 0,
        total: 0
      },
      energy: {
        available: 0,
        capacity: 0,
        harvestedThisTick: 0,
        average5Tick: 0
      },
      spawn: {
        totalSpawned: 0,
        lastSpawnTime: 0,
        avgSpawnTime: 0
      },
      rcl_history: []
    };
  }
}

/**
 * Update stats for current tick
 * Called once per tick from main game loop
 */
export function updateStats(room: Room): void {
  if (!Memory.stats) initializeStats();

  const stats = Memory.stats!;
  
  // Ensure all nested objects exist (safety check for existing memory)
  if (!stats.rcl_history) {
    stats.rcl_history = [];
  }
  if (!stats.energy) {
    stats.energy = {
      available: 0,
      capacity: 0,
      harvestedThisTick: 0,
      average5Tick: 0
    };
  }
  if (!stats.creepCounts) {
    stats.creepCounts = {
      miner: 0,
      hauler: 0,
      builder: 0,
      upgrader: 0,
      total: 0
    };
  }
  if (!stats.spawn) {
    stats.spawn = {
      totalSpawned: 0,
      lastSpawnTime: 0,
      avgSpawnTime: 0
    };
  }
  
  const controller = room.controller;

  // Update RCL and tick counter
  if (controller) {
    const currentRcl = controller.level;
    if (currentRcl !== stats.rcl) {
      // RCL changed - log to history and reset counter
      stats.rcl_history.push({
        rcl: stats.rcl || 0,
        ticksToComplete: stats.ticksAtCurrentRcl || 0,
        finalCreeps: { ...stats.creepCounts }
      });
      stats.rcl = currentRcl;
      stats.ticksAtCurrentRcl = 0;
    } else {
      stats.ticksAtCurrentRcl = (stats.ticksAtCurrentRcl || 0) + 1;
    }

    // Update energy
    stats.energy.available = room.energyAvailable;
    stats.energy.capacity = room.energyCapacityAvailable;
  }

  // Count creeps by role
  const creeps = room.find(FIND_MY_CREEPS);
  const counts = {
    miner: 0,
    hauler: 0,
    builder: 0,
    upgrader: 0,
    total: creeps.length
  };

  for (const creep of creeps) {
    const role = creep.memory.role as string;
    if (role in counts) {
      (counts[role as keyof typeof counts] as number)++;
    }
  }

  stats.creepCounts = counts;

  // Track spawns (simple counter)
  const spawns = room.find(FIND_MY_SPAWNS);
  for (const spawn of spawns) {
    if (spawn.spawning) {
      stats.spawn.lastSpawnTime = Game.time;
    }
  }

  // Calculate average spawn time (every 100 ticks check if we spawned)
  if (Game.time % 100 === 0 && stats.spawn.lastSpawnTime > 0) {
    const timeSinceLastSpawn = Game.time - stats.spawn.lastSpawnTime;
    if (stats.spawn.avgSpawnTime === 0) {
      stats.spawn.avgSpawnTime = timeSinceLastSpawn;
    } else {
      stats.spawn.avgSpawnTime = (stats.spawn.avgSpawnTime + timeSinceLastSpawn) / 2;
    }
  }
}

/**
 * Get current stats object
 * @returns Current stats from Memory
 */
export function getStats(): any {
  if (!Memory.stats) initializeStats();
  return Memory.stats!;
}

/**
 * Get RCL history (for analysis after completing RCL)
 * @returns Array of completed RCL data
 */
export function getRclHistory(): any[] {
  if (!Memory.stats) initializeStats();
  return Memory.stats!.rcl_history || [];
}

/**
 * Clear all stats (useful for starting fresh run)
 */
export function clearStats(): void {
  Memory.stats = undefined;
  initializeStats();
}
