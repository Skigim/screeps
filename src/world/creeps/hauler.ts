/**
 * HAULER BEHAVIOR
 * 
 * Dedicated transport creep focused on energy movement.
 * Haulers pick up energy from one location and move it to another.
 * 
 * Strategy:
 * - Pick up energy from containers, ruins, or dropped resources
 * - Transport it to spawn, extensions, or storage
 * - Minimize wasted movement
 * 
 * Best for: Rooms with complex energy flows (multiple sources, distant structures)
 */

/**
 * Main behavior for hauler role.
 * Moves energy from sources to structures.
 * 
 * @param creep - The creep to run hauler behavior on
 */
export function runHauler(creep: Creep): void {
  // State machine: Switch between picking up and delivering
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }

  if (!creep.memory.working) {
    // PICKUP MODE: Find energy to transport
    pickupEnergy(creep);
  } else {
    // DELIVERY MODE: Move energy to structures
    deliverEnergy(creep);
  }
}

/**
 * Pick up energy from available sources.
 * 
 * Priority:
 * 1. Dropped energy on ground (fastest to pick up)
 * 2. Tombstones (from dead creeps)
 * 3. Containers (stored energy)
 * 4. Ruins (from destroyed structures)
 * 
 * @param creep - The hauler creep
 */
function pickupEnergy(creep: Creep): void {
  // First, look for dropped energy on the ground
  const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
    filter: (resource) => resource.resourceType === RESOURCE_ENERGY
  });

  if (droppedEnergy) {
    const result = creep.pickup(droppedEnergy);
    if (result === ERR_NOT_IN_RANGE) {
      creep.travelTo(droppedEnergy);
    }
    return;
  }

  // Look for containers with energy
  const containers = creep.room.find(FIND_STRUCTURES, {
    filter: (structure) => {
      return (
        structure.structureType === STRUCTURE_CONTAINER &&
        (structure as any).store.getUsedCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (containers.length > 0) {
    const container = creep.pos.findClosestByPath(containers);
    if (container) {
      const result = creep.withdraw(container as any, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(container);
      }
    }
  }
}

/**
 * Deliver energy to priority structures.
 * 
 * Priority:
 * 1. Spawn (critical for spawning)
 * 2. Extensions (capacity for spawning)
 * 3. Storage/Containers (long-term storage)
 * 
 * @param creep - The hauler creep
 */
function deliverEnergy(creep: Creep): void {
  // Find structures that need energy
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
    // Priority: Spawn first
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
    // Spawn/extensions full, try storage
    const storage = creep.room.find(FIND_MY_STRUCTURES, {
      filter: (s) => {
        return (
          s.structureType === STRUCTURE_STORAGE &&
          (s as any).store.getFreeCapacity(RESOURCE_ENERGY) > 0
        );
      }
    });

    if (storage.length > 0) {
      const target = storage[0];
      const result = creep.transfer(target as any, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      }
    }
  }
}
