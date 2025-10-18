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
  const memory = creep.memory as any;

  // If a task is assigned, use the task target as the source name
  // Otherwise, auto-assign to first source
  if (memory.task?.targetId && !memory.assignedSource) {
    // Task has a target (like 'SourceB'), find the actual source object
    const targetName = memory.task.targetId;
    const sources = creep.room.find(FIND_SOURCES);
    // Try to find source by checking if its auto-assigned name matches
    // (SourceA = 0, SourceB = 1, etc.)
    const sourceIndex = targetName.charCodeAt(targetName.length - 1) - 65; // A=0, B=1, etc.
    if (sources[sourceIndex]) {
      memory.assignedSource = sources[sourceIndex].id;
    } else if (sources.length > 0) {
      memory.assignedSource = sources[0].id;
    }
  } else if (!memory.assignedSource) {
    // No task, auto-assign to first source
    const sources = creep.room.find(FIND_SOURCES);
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
