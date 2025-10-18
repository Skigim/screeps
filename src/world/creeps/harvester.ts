/**
 * HARVESTER BEHAVIOR MODULE
 * 
 * The harvester is the backbone of your economy in Screeps.
 * It gathers energy from sources and delivers it to spawn/extensions.
 * 
 * RCL1 Strategy:
 * - Harvest from the nearest active source
 * - Deliver energy to spawn first (ensures spawning never stops)
 * - If spawn is full, deliver to extensions (RCL2+)
 * - If all structures are full, help upgrade the controller
 * 
 * State Machine:
 * - working: false → Creep is empty, needs to harvest
 * - working: true → Creep is full, needs to deliver energy
 */

/**
 * Main behavior function for harvester role.
 * Called once per game tick for each harvester creep.
 * 
 * @param creep - The creep to run harvester behavior on
 * 
 * @example
 * ```typescript
 * const harvester = Game.creeps['harvester_12345'];
 * runHarvester(harvester);
 * ```
 */
export function runHarvester(creep: Creep): void {
  // State machine: Switch between harvesting and delivering
  // When completely full, switch to "working" (delivering) mode
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }
  // When completely empty, switch to harvesting mode
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }

  if (!creep.memory.working) {
    // HARVESTING MODE: Get energy from source
    harvestEnergy(creep);
  } else {
    // DELIVERING MODE: Deliver energy to structures
    deliverEnergy(creep);
  }
}

/**
 * Harvests energy from the nearest active source.
 * 
 * Flow:
 * 1. Find the closest active source (has energy remaining)
 * 2. If in range, harvest from it
 * 3. If not in range, move towards it
 * 
 * @param creep - The creep that should harvest
 * 
 * @remarks
 * Uses pathfinding with yellow visualization for easy debugging.
 * Active sources are those with energy > 0.
 */
function harvestEnergy(creep: Creep): void {
  // Find the nearest source that still has energy
  const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  
  if (source) {
    // Try to harvest. Returns OK if successful, or an error code
    const result = creep.harvest(source);
    
    if (result === ERR_NOT_IN_RANGE) {
      // Too far away, move closer
      creep.travelTo(source);
    }
    // Other possible errors (ERR_NOT_ENOUGH_RESOURCES, ERR_BUSY, etc.)
    // are handled automatically by the game engine
  }
}

/**
 * Delivers energy to spawn, extensions, or controller.
 * 
 * Priority system:
 * 1. Spawn first (critical - enables spawning new creeps)
 * 2. Extensions next (RCL2+, increases spawn capacity)
 * 3. Controller if all structures are full (don't waste time)
 * 
 * @param creep - The creep that should deliver energy
 * 
 * @remarks
 * This ensures your spawn never runs out of energy, which would
 * halt creep production and potentially collapse your economy.
 */
function deliverEnergy(creep: Creep): void {
  // Find all spawn and extension structures that need energy
  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType === STRUCTURE_SPAWN ||
         structure.structureType === STRUCTURE_EXTENSION) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (targets.length > 0) {
    // Priority: Spawn first, then closest extension
    const spawn = targets.find(t => t.structureType === STRUCTURE_SPAWN);
    const target = spawn || targets[0];
    
    const result = creep.transfer(target, RESOURCE_ENERGY);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    }
  } else {
    // All spawn/extensions full, help with upgrading
    // This prevents wasting harvester time when storage is full
    upgradeControllerFallback(creep);
  }
}

/**
 * Fallback behavior: Upgrade controller when no delivery targets.
 * 
 * This prevents harvesters from idling when spawn and extensions
 * are full. Instead, they contribute to controller progress.
 * 
 * @param creep - The creep that should upgrade
 */
function upgradeControllerFallback(creep: Creep): void {
  const controller = creep.room.controller;
  
  if (controller) {
    const result = creep.upgradeController(controller);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(controller);
    }
  }
}
