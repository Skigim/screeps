/**
 * Stats Collector - Tracks performance and room metrics
 * Stores data in Memory.stats with automatic cleanup of old data
 */

export interface TickStats {
  time: number; // Game tick
  cpu: {
    used: number;
    limit: number;
    bucket: number;
  };
  memory: {
    used: number;
  };
  gcl: {
    level: number;
    progress: number;
    progressTotal: number;
  };
  rooms: {
    [roomName: string]: RoomStats;
  };
}

export interface RoomStats {
  rcl: number;
  controller: {
    progress: number;
    progressTotal: number;
    ticksToDowngrade: number;
  };
  energy: {
    available: number;
    capacity: number;
  };
  creeps: {
    [role: string]: number; // Role -> count
  };
  spawns: {
    total: number;
    spawning: number;
  };
  sources: {
    total: number;
    energyAvailable: number;
    energyCapacity: number;
    assignedWorkParts: number;
    maxWorkParts: number;
  };
}

export class StatsCollector {
  private static readonly MAX_TICKS_STORED = 20; // Keep last 20 ticks of stats

  /**
   * Collect stats for current tick
   */
  public static collect(): void {
    const tick = Game.time;

    // Initialize stats structure if needed
    if (!Memory.stats) {
      Memory.stats = {};
    }

    const stats: TickStats = {
      time: tick,
      cpu: {
        used: Game.cpu.getUsed(),
        limit: Game.cpu.limit,
        bucket: Game.cpu.bucket
      },
      memory: {
        used: RawMemory.get().length
      },
      gcl: {
        level: Game.gcl.level,
        progress: Game.gcl.progress,
        progressTotal: Game.gcl.progressTotal
      },
      rooms: {}
    };

    // Collect room stats
    for (const roomName in Game.rooms) {
      const room = Game.rooms[roomName];
      if (!room.controller || !room.controller.my) continue;

      stats.rooms[roomName] = this.collectRoomStats(room);
    }

    // Store stats for this tick
    Memory.stats[tick] = stats;

    // Clean up old stats
    this.cleanup();
  }

  /**
   * Collect stats for a single room
   */
  private static collectRoomStats(room: Room): RoomStats {
    // Count creeps by role
    const creepCounts: { [role: string]: number } = {};
    const creeps = room.find(FIND_MY_CREEPS);
    for (const creep of creeps) {
      const role = creep.memory.role;
      creepCounts[role] = (creepCounts[role] || 0) + 1;
    }

    // Count spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    const spawningCount = spawns.filter(s => s.spawning).length;

    // Source stats
    const sources = room.find(FIND_SOURCES);
    let totalEnergy = 0;
    let totalCapacity = 0;
    let assignedWorkParts = 0;

    for (const source of sources) {
      totalEnergy += source.energy;
      totalCapacity += source.energyCapacity;

      // Count assigned work parts
      const assignedCreeps = Object.values(Game.creeps).filter(
        c => c.memory.assignedSource === source.id
      );
      assignedWorkParts += assignedCreeps.reduce((total, creep) => {
        return total + creep.body.filter(part => part.type === WORK).length;
      }, 0);
    }

    return {
      rcl: room.controller?.level || 0,
      controller: {
        progress: room.controller?.progress || 0,
        progressTotal: room.controller?.progressTotal || 0,
        ticksToDowngrade: room.controller?.ticksToDowngrade || 0
      },
      energy: {
        available: room.energyAvailable,
        capacity: room.energyCapacityAvailable
      },
      creeps: creepCounts,
      spawns: {
        total: spawns.length,
        spawning: spawningCount
      },
      sources: {
        total: sources.length,
        energyAvailable: totalEnergy,
        energyCapacity: totalCapacity,
        assignedWorkParts: assignedWorkParts,
        maxWorkParts: sources.length * 5 // 5 work parts per source max
      }
    };
  }

  /**
   * Clean up old stats to prevent Memory bloat
   */
  private static cleanup(): void {
    if (!Memory.stats) return;

    const ticks = Object.keys(Memory.stats).map(Number).sort((a, b) => b - a);

    // Keep only the most recent ticks
    if (ticks.length > this.MAX_TICKS_STORED) {
      const ticksToRemove = ticks.slice(this.MAX_TICKS_STORED);
      for (const tick of ticksToRemove) {
        delete Memory.stats[tick];
      }
    }
  }

  /**
   * Get stats for a specific tick
   */
  public static getStats(tick: number): TickStats | null {
    if (!Memory.stats || !Memory.stats[tick]) return null;
    return Memory.stats[tick];
  }

  /**
   * Get all stored stats
   */
  public static getAllStats(): { [tick: number]: TickStats } {
    return Memory.stats || {};
  }

  /**
   * Clear all stats (useful for debugging)
   */
  public static clear(): void {
    Memory.stats = {};
  }

  /**
   * Display stats summary in console
   */
  public static displaySummary(): void {
    if (!Memory.stats) {
      console.log("No stats collected yet");
      return;
    }

    const ticks = Object.keys(Memory.stats).map(Number).sort((a, b) => b - a);
    if (ticks.length === 0) {
      console.log("No stats collected yet");
      return;
    }

    const latestTick = ticks[0];
    const stats = Memory.stats[latestTick];

    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║ Stats Summary (Tick ${latestTick})`.padEnd(45) + '║');
    console.log(`╠════════════════════════════════════════════╣`);
    console.log(`║ CPU: ${stats.cpu.used.toFixed(2)}/${stats.cpu.limit} | Bucket: ${stats.cpu.bucket}`.padEnd(45) + '║');
    console.log(`║ Memory: ${(stats.memory.used / 1024).toFixed(1)} KB`.padEnd(45) + '║');
    console.log(`║ GCL: ${stats.gcl.level} (${stats.gcl.progress}/${stats.gcl.progressTotal})`.padEnd(45) + '║');
    console.log(`╠════════════════════════════════════════════╣`);

    for (const roomName in stats.rooms) {
      const room = stats.rooms[roomName];
      const creepCounts = Object.values(room.creeps) as number[];
      const totalCreeps = creepCounts.reduce((a, b) => a + b, 0);
      console.log(`║ Room: ${roomName}`.padEnd(45) + '║');
      console.log(`║   RCL: ${room.rcl} | Energy: ${room.energy.available}/${room.energy.capacity}`.padEnd(45) + '║');
      console.log(`║   Creeps: ${totalCreeps}`.padEnd(45) + '║');
      for (const role in room.creeps) {
        console.log(`║     ${role}: ${room.creeps[role]}`.padEnd(45) + '║');
      }
    }

    console.log(`╚════════════════════════════════════════════╝`);
    console.log(`Stored ticks: ${ticks.length}/${this.MAX_TICKS_STORED}`);
  }
}
