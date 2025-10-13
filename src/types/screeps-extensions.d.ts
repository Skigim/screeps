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
}

// Extend CreepMemory interface
interface CreepMemory {
  /**
   * Locked energy source ID - prevents builders from wandering between sources
   * Cleared when creep becomes full or empty
   */
  energySourceId?: string;
}
