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
    initVersion?: number;   // Version number to force reinit when code changes
    // Traveler uses empire-level memory for route caching
    empire?: {
      mode?: string;
      modeChangedAt?: number;
      distanceMatrix?: {[key: string]: number};
      pathCache?: {[key: string]: string};
      legatus?: any;  // LegatusOficio command registry
      visuals?: {[roomName: string]: {expiresAt: number}};  // RoomVisual persistence
      bodyConfigs?: any;  // Named body configurations
    };
  }
}

export {};
