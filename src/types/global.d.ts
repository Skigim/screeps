/**
 * MINIMAL TYPE DEFINITIONS
 * Extends Screeps types for custom memory structures
 */

declare global {
  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    task?: any;  // Task assigned to creep
    assignedSource?: string;  // Source ID for stationary harvesters
    // Traveler adds these directly to memory
    _trav?: any;  // Traveler's internal state
    _travel?: any;  // Alternative traveler state
  }

  interface RoomMemory {
    avoid?: boolean;  // Used by Traveler route planning
  }

  interface Memory {
    creeps: {
      [name: string]: CreepMemory;
    };
    structures?: {
      [id: string]: any;
    };
    initialized?: boolean;  // Track if console commands have been registered
    initVersion?: string;   // Build version (commit hash) to force reinit when code changes
    stats?: {              // Silent statistics tracking
      rcl: number;
      ticksAtCurrentRcl: number;
      creepCounts: {
        miner: number;
        hauler: number;
        builder: number;
        upgrader: number;
        total: number;
      };
      energy: {
        available: number;
        capacity: number;
        harvestedThisTick: number;
        average5Tick: number;
      };
      spawn: {
        totalSpawned: number;
        lastSpawnTime: number;
        avgSpawnTime: number;
      };
      rcl_history: Array<{
        rcl: number;
        ticksToComplete: number;
        finalCreeps: any;
      }>;
    };
    // Traveler uses empire-level memory for route caching
    empire?: {
      mode?: string;
      modeChangedAt?: number;
      distanceMatrix?: {[key: string]: number};
      pathCache?: {[key: string]: string};
      legatus?: any;  // LegatusOficio command registry
      visuals?: {[roomName: string]: {expiresAt: number}};  // RoomVisual persistence
      bodyConfigs?: any;  // Named body configurations
      spawnQueue?: Array<{  // Queued spawn commands
        id: string;
        role: string;
        body: BodyPartConstant[];
        task?: {
          type: string;
          targetId?: string;
        };
        room: string;
        createdAt: number;
      }>;
    };
  }
}

export {};
