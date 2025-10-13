/**
 * Type extensions for Screeps API
 * Custom types for project-specific functionality
 */

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
