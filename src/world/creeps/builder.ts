/**
 * BUILDER BEHAVIOR MODULE
 * 
 * Builders construct structures from construction sites.
 * They withdraw energy and build roads, extensions, towers, etc.
 * 
 * RCL1 Strategy:
 * - Only spawn builders when construction sites exist
 * - Withdraw energy from spawn/extensions
 * - Build the nearest construction site
 * - If no sites exist, help upgrade controller (don't idle)
 * 
 * Construction priorities (managed externally):
 * - Extensions (increase spawn energy capacity)
 * - Roads (reduce creep fatigue, increase efficiency)
 * - Containers (energy storage near sources)
 * 
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should build
 */

/**
 * Main behavior function for builder role.
 * Called once per game tick for each builder creep.
 * 
 * @param creep - The creep to run builder behavior on
 * 
 * @example
 * ```typescript
 * const builder = Game.creeps['builder_12345'];
 * runBuilder(builder);
 * ```
 */
export function runBuilder(creep: Creep): void {
  // State machine: Switch between withdrawing and building
  // When empty, switch to withdrawing mode
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }
  // When full, switch to building mode
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }

  if (!creep.memory.working) {
    // WITHDRAWING MODE: Get energy from spawn/extensions
    withdrawEnergy(creep);
  } else {
    // BUILDING MODE: Build construction sites or upgrade if none exist
    buildOrUpgrade(creep);
  }
}

/**
 * Withdraws energy from spawn or extensions.
 * 
 * Strategy:
 * 1. Find spawn and extensions with available energy
 * 2. Prefer spawn first (same as upgrader strategy)
 * 3. Move and withdraw
 * 
 * @param creep - The creep that should withdraw energy
 * 
 * @remarks
 * Builders use the same withdrawal strategy as upgraders to
 * minimize competition for extension energy during spawning.
 */
function withdrawEnergy(creep: Creep): void {
  // Find spawn and extensions with energy available
  const sources = creep.room.find(FIND_MY_STRUCTURES, {
    filter: (structure) => {
      return (
        (structure.structureType === STRUCTURE_SPAWN ||
         structure.structureType === STRUCTURE_EXTENSION) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (sources.length > 0) {
    // Prefer spawn first, then closest extension
    const spawn = sources.find(s => s.structureType === STRUCTURE_SPAWN);
    const target = spawn || sources[0];
    
    const result = creep.withdraw(target, RESOURCE_ENERGY);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(target);
    }
  }
}

/**
 * Builds construction sites or upgrades controller as fallback.
 * 
 * Priority:
 * 1. Build nearest construction site
 * 2. If no sites, upgrade controller (prevent idling)
 * 
 * @param creep - The creep that should build
 * 
 * @remarks
 * Construction sites are created manually or by planning code.
 * This function just executes the building, not the planning.
 * 
 * Each build action consumes 5 energy and adds 5 progress to site.
 * A creep with multiple WORK parts builds faster (5 progress per WORK).
 */
function buildOrUpgrade(creep: Creep): void {
  // Find the nearest construction site
  const site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
  
  if (site) {
    // Construction site exists, build it
    const result = creep.build(site);
    
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(site);
    }
  } else {
    // No construction sites, help upgrade controller instead
    // This prevents builders from idling when construction is complete
    upgradeControllerFallback(creep);
  }
}

/**
 * Fallback behavior: Upgrade controller when no construction sites.
 * 
 * This prevents builders from idling and wasting CPU when there's
 * nothing to build. They contribute to RCL progress instead.
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
