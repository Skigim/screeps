/**
 * Type extensions for Screeps API
 * Custom types for project-specific functionality
 */

// Traveler.ts travelTo extension
interface Creep {
  /**
   * Traveler.ts travelTo method - moves the creep using advanced pathfinding
   * @param destination The target position or object with a pos property
   * @param options Optional pathfinding options
   * @returns A return code (OK, ERR_NO_PATH, etc.)
   */
  travelTo(destination: RoomPosition | { pos: RoomPosition }, options?: any): number;
}

// Progression Stats Interface
interface ProgressionStats {
  startTime: number;
  currentPhase: string;
  phaseStartTime: number;
  phaseHistory: Array<{
    phase: string;
    startTick: number;
    endTick?: number;
    duration?: number;
  }>;
  milestones: {
    firstExtension?: number;
    allExtensionsComplete?: number;
    firstContainer?: number;
    allContainersComplete?: number;
    firstStationaryHarvester?: number;
    firstHauler?: number;
    rcl2Complete?: number;
  };
  snapshots: Array<{
    tick: number;
    phase: string;
    creepCount: number;
    energy: number;
    energyCapacity: number;
    controllerProgress: number;
    extensions: number;
    containers: number;
  }>;
}

// Extend Memory interface
interface Memory {
  progressionStats?: { [roomName: string]: ProgressionStats };
  architectPlans?: { [roomName: string]: number }; // Track last RCL Architect ran for each room
}

// Extend CreepMemory interface
interface CreepMemory {
  /**
   * Locked energy source ID - prevents builders from wandering between sources
   * Cleared when creep becomes full or empty
   */
  energySourceId?: string;

  /**
   * Locked construction site ID - builders lock onto ONE container during Phase 1
   * Ensures builders focus on completing one source container at a time
   * Cleared when construction site is complete or removed
   */
  lockedConstructionSiteId?: string;

  /**
   * Request reassignment flag - set by creep role when it wants a new source assignment
   * Prevents assignment thrashing by making assignments sticky by default
   */
  requestReassignment?: boolean;
}
