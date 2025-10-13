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

// Promotion Request Interface
interface PromotionRequest {
  role: string;
  replacingCreep: string;
  targetBodyCost: number;
  timestamp: number;
}

// Extend Memory interface
interface Memory {
  progressionStats?: { [roomName: string]: ProgressionStats };
  architectPlans?: { [roomName: string]: number }; // Track last RCL Architect ran for each room
  promotionQueue?: { [roomName: string]: PromotionRequest[] }; // Pending creep promotions
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

  /**
   * Vacuum mode flag - set when upgrader picks up dropped energy from non-source areas
   * When true, upgrader will return energy to spawn/dest container before resuming work
   */
  vacuuming?: boolean;

  /**
   * Energy request flag - set by builders when they need energy delivery from hauler
   * Cleared when builder receives energy or becomes full
   */
  energyRequested?: boolean;

  /**
   * Request time - tick when builder requested energy
   * Used for timeout detection (20 tick threshold before self-serve)
   */
  requestTime?: number;

  /**
   * Assigned builder - set by TrafficManager when hauler is assigned to help a builder
   * Hauler will deliver energy to this builder before resuming normal duty
   */
  assignedBuilder?: string;

  /**
   * Delivery amount - how much energy the hauler should deliver to assigned builder
   * Prevents over-delivery when builder has limited capacity
   */
  deliveryAmount?: number;

  /**
   * Can transport flag - whether this hauler is allowed to help builders
   * Set to false for critical haulers that must focus on spawn/extension delivery
   * At least 2 haulers should have this set to false to prevent spawn starvation
   */
  canTransport?: boolean;
}
