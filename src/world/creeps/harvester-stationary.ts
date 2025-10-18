/**
 * STATIONARY HARVESTER BEHAVIOR
 * 
 * Stationary harvesters stay in one place and harvest from a single source.
 * They're optimized for maximum work output, not mobility.
 * 
 * Strategy:
 * - Pick one energy source and stay there
 * - Harvest continuously from that source
 * - Deliver energy to containers/storage nearby
 * - Minimize movement to maximize harvest rate
 * 
 * Best for: Small rooms with sources close to spawn
 */

/**
 * Main behavior for stationary harvester role.
 * Stays at assigned source and harvests continuously.
 * 
 * @param creep - The creep to run stationary harvester behavior on
 */
export function runStationaryHarvester(creep: Creep): void {
  // Assign to a source on first run
  const memory = creep.memory as any;
  if (!memory.assignedSource) {
    const sources = creep.room.find(FIND_SOURCES);
    // Pick the first source (or could be smarter about distribution)
    if (sources.length > 0) {
      memory.assignedSource = sources[0].id;
    }
  }

  // State machine: Switch between harvesting and delivering
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }

  if (!creep.memory.working) {
    // HARVESTING MODE: Stay at source and harvest
    harvestAtSource(creep);
  } else {
    // DELIVERING MODE: Move nearby and drop energy into container
    deliverFromSource(creep);
  }
}

/**
 * Harvest from the assigned source.
 * Stays in place, doesn't roam.
 * 
 * @param creep - The harvester creep
 */
function harvestAtSource(creep: Creep): void {
  const memory = creep.memory as any;
  const sourceId = memory.assignedSource as string;
  const source = Game.getObjectById(sourceId) as Source | null;

  if (!source) {
    // Source disappeared, find a new one
    const sources = creep.room.find(FIND_SOURCES_ACTIVE);
    if (sources.length > 0) {
      memory.assignedSource = sources[0].id;
    }
    return;
  }

  // Try to harvest
  const result = creep.harvest(source);

  if (result === ERR_NOT_IN_RANGE) {
    // Move to the source (only once)
    creep.travelTo(source);
  }
  // If harvesting succeeds, just keep harvesting
}

/**
 * Deliver energy from harvest location.
 * Looks for containers/storage near the source.
 * 
 * @param creep - The harvester creep
 */
function deliverFromSource(creep: Creep): void {
  // Find nearby containers or structures to dump energy into
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
    // Find closest target
    const target = creep.pos.findClosestByRange(targets);
    if (target) {
      const result = creep.transfer(target as any, RESOURCE_ENERGY);

      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      }
    }
  }
}
