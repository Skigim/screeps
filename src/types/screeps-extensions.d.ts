/**
 * Type extensions for Screeps API
 * Extends the older typed-screeps@2.5.3 with modern API features
 */

// Extend the existing StoreDefinition with modern Store API methods
// This uses TypeScript's declaration merging feature to add methods to the existing type
// @ts-ignore: Declaration merging is intentional
interface StoreDefinition {
    /**
     * Returns capacity of this store for the specified resource.
     * For a general purpose store, it returns total capacity if resource is undefined.
     */
    getCapacity(resource?: ResourceConstant): number | null;

    /**
     * Returns the capacity used by the specified resource.
     * For a general purpose store, it returns total used capacity if resource is undefined.
     */
    getUsedCapacity(resource?: ResourceConstant): number | null;

    /**
     * Returns free capacity for the store.
     * For a limited store, it returns the capacity available for the specified resource.
     */
    getFreeCapacity(resource?: ResourceConstant): number | null;
}

// Extend Creep interface with Traveler.ts method and modern store property
interface Creep {
    /**
     * Modern API: A Store object that contains cargo of this creep.
     * This is an alias for the 'carry' property in the old API.
     */
    store: StoreDefinition;

    /**
     * Traveler.ts travelTo method - moves the creep using advanced pathfinding
     * @param destination The target position or object with a pos property
     * @param options Optional pathfinding options
     * @returns A return code (OK, ERR_NO_PATH, etc.)
     */
    travelTo(destination: RoomPosition | { pos: RoomPosition }, options?: any): number;
}

// Ruin interface (new in modern API)
interface Ruin extends RoomObject {
    /**
     * A unique object identifier.
     */
    id: string;

    /**
     * Time of destruction.
     */
    destroyTime: number;

    /**
     * An object containing basic data of the destroyed structure.
     */
    structure: {
        id: string;
        type: string;
        hits: number;
        hitsMax: number;
    };

    /**
     * A Store object that contains resources of this ruin.
     */
    store: StoreDefinition;

    /**
     * The amount of game ticks before this ruin decays.
     */
    ticksToDecay: number;
}

// Add FIND_RUINS constant
declare const FIND_RUINS: 123;

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

