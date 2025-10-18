/**
 * MOBILE HARVESTER BEHAVIOR
 * 
 * Mobile harvesters roam between multiple sources and harvest from them.
 * They're optimized for flexibility, working multiple sources efficiently.
 * 
 * Strategy:
 * - Find the nearest active source
 * - Harvest from it while it has energy
 * - When source runs out, move to next nearest source
 * - Deliver energy to any nearby spawn/extension/container
 * - Continuously rotate through available sources
 * 
 * Best for: Larger rooms with distant sources or variable source availability
 */

/**
 * Main behavior for mobile harvester role.
 * Roams between sources and harvests from multiple locations.
 * 
 * @param creep - The creep to run mobile harvester behavior on
 */
export function runMobileHarvester(creep: Creep): void {
  // State machine: Switch between harvesting and delivering
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }

  if (!creep.memory.working) {
    // HARVESTING MODE: Find nearest active source
    harvestNearestSource(creep);
  } else {
    // DELIVERING MODE: Deliver to nearby structures
    deliverEnergy(creep);
  }
}

/**
 * Harvest from the nearest active source.
 * Automatically switches sources when current one runs out.
 * 
 * @param creep - The harvester creep
 */
function harvestNearestSource(creep: Creep): void {
  // Find the nearest active source
  const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

  if (source) {
    const result = creep.harvest(source);

    if (result === ERR_NOT_IN_RANGE) {
      // Move towards the source
      creep.travelTo(source);
    }
    // If harvesting succeeds or source is being harvested, continue
  }
}

/**
 * Deliver energy to spawn, extensions, or containers.
 * 
 * Priority:
 * 1. Spawn (critical for spawning new creeps)
 * 2. Extensions (increase spawn capacity)
 * 3. Containers (temporary storage)
 * 4. Storage (long-term storage)
 * 
 * @param creep - The harvester creep
 */
function deliverEnergy(creep: Creep): void {
  // Find all spawn and extension structures that need energy
  const targets = creep.room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType === STRUCTURE_SPAWN ||
         structure.structureType === STRUCTURE_EXTENSION) &&
        (structure as any).store.getFreeCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (targets.length > 0) {
    // Priority: Spawn first, then extensions
    let target: any = targets.find(t => t.structureType === STRUCTURE_SPAWN);
    if (!target) {
      target = targets[0];
    }

    if (target) {
      const result = creep.transfer(target, RESOURCE_ENERGY);

      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      }
    }
  } else {
    // All structures full, help with upgrading
    upgradeControllerFallback(creep);
  }
}

/**
 * Fallback behavior: Upgrade controller when no delivery targets.
 * 
 * @param creep - The harvester creep
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
