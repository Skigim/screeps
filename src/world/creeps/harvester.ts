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
 * Harvests energy from a source.
 * 
 * Supports both task-assigned and mobile harvesting:
 * - If creep has no CARRY parts (stationary miner): 
 *   Will automatically stay at assigned/nearest source
 * - If creep has CARRY parts (mobile harvester):
 *   Can be assigned to specific source or roams freely
 * 
 * Flow:
 * 1. Check if creep has a task assignment (e.g., 'harvest' from 'SourceB')
 * 2. If assigned, travel to and harvest from that specific source
 * 3. If not assigned, find nearest active source (mobile behavior)
 * 4. Harvest when in range, travel when not
 * 
 * @param creep - The creep that should harvest
 * 
 * @remarks
 * Creeps without CARRY parts naturally stay put since they can't
 * move energy anyway. Creeps with CARRY parts can be assigned to
 * specific sources or left to roam.
 */
function harvestEnergy(creep: Creep): void {
  let source: Source | null = null;

  // Check if creep has a harvest task with a target source
  if (creep.memory.task && creep.memory.task.type === 'harvest') {
    const targetName = creep.memory.task.targetId;
    if (targetName) {
      // Convert target name (e.g., 'SourceB') to source object
      // SourceA = index 0, SourceB = index 1, etc.
      const sourceIndex = targetName.charCodeAt(targetName.length - 1) - 'A'.charCodeAt(0);
      const sources = creep.room.find(FIND_SOURCES);
      if (sources[sourceIndex]) {
        source = sources[sourceIndex];
      }
    }
  }

  // If no assigned source, find nearest active source (mobile behavior)
  if (!source) {
    source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
  }

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
