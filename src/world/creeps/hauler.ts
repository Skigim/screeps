/**
 * HAULER BEHAVIOR
 * 
 * Dedicated transport creep focused on energy movement.
 * Haulers can be task-assigned to specific structures or sources.
 * 
 * Strategy:
 * - If assigned to a source: Pick up from nearby dropped energy/containers, haul to spawn/extensions, idle at source
 * - If assigned to a structure: Pick up from that structure and haul to spawn/extensions
 * - If not assigned: Generic hauler that picks up from anywhere and delivers
 * 
 * Best for: Rooms with complex energy flows (multiple sources, distant structures)
 */

/**
 * Main behavior for hauler role.
 * Respects task assignments to specific structures or sources.
 * 
 * @param creep - The creep to run hauler behavior on
 */
export function runHauler(creep: Creep): void {
  // Get assignment target if available
  let targetStructure: RoomObject | null = null;
  let isSourceAssignment = false;

  if (creep.memory.task && creep.memory.task.targetId) {
    const targetName = creep.memory.task.targetId;
    
    // Try to interpret as source (SourceA, SourceB, etc.)
    if (targetName.startsWith('Source')) {
      const sourceIndex = targetName.charCodeAt(targetName.length - 1) - 'A'.charCodeAt(0);
      const sources = creep.room.find(FIND_SOURCES);
      if (sources[sourceIndex]) {
        targetStructure = sources[sourceIndex];
        isSourceAssignment = true;
      }
    } else {
      // Try to find as named structure (SpawnA, StorageA, ContainerA, etc.)
      const allStructures = creep.room.find(FIND_MY_STRUCTURES);
      targetStructure = allStructures.find(s => {
        return s.pos.x > 0; // placeholder - in reality you'd need better naming
      }) || null;

      // Fallback: If target looks like "ContainerX", find containers
      if (!targetStructure && targetName.startsWith('Container')) {
        const containers = creep.room.find(FIND_STRUCTURES, {
          filter: (s) => s.structureType === STRUCTURE_CONTAINER
        });
        targetStructure = containers[0] || null;
      }
    }
  }

  // State machine: Switch between picking up and delivering
  if (creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
  }
  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
    creep.memory.working = false;
  }

  if (!creep.memory.working) {
    // PICKUP MODE: Find energy to transport
    if (isSourceAssignment && targetStructure) {
      // Assigned to source: Pick up from surroundings
      pickupFromSource(creep, targetStructure as Source);
    } else if (targetStructure) {
      // Assigned to structure: Pick up from that structure
      pickupFromStructure(creep, targetStructure);
    } else {
      // Generic pickup
      pickupEnergy(creep);
    }
  } else {
    // DELIVERY MODE: Move energy to structures
    deliverEnergy(creep);
  }
}

/**
 * Pick up energy from a source's surroundings.
 * 
 * Priority for sources:
 * 1. Dropped energy around the source
 * 2. Containers near the source
 * 3. Idle at source (wait for more energy)
 * 
 * @param creep - The hauler creep
 * @param source - The source structure
 */
function pickupFromSource(creep: Creep, source: Source): void {
  // Look for dropped energy near the source (within 3 squares)
  const nearbyEnergy = source.pos.findInRange(FIND_DROPPED_RESOURCES, 3, {
    filter: (resource) => resource.resourceType === RESOURCE_ENERGY
  });

  if (nearbyEnergy.length > 0) {
    const closest = creep.pos.findClosestByPath(nearbyEnergy);
    if (closest) {
      const result = creep.pickup(closest);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(closest);
      }
      return;
    }
  }

  // Look for containers near the source
  const nearbyContainers = source.pos.findInRange(FIND_STRUCTURES, 3, {
    filter: (s) => {
      return (
        s.structureType === STRUCTURE_CONTAINER &&
        (s as any).store.getUsedCapacity(RESOURCE_ENERGY) > 0
      );
    }
  });

  if (nearbyContainers.length > 0) {
    const closest = creep.pos.findClosestByPath(nearbyContainers);
    if (closest) {
      const result = creep.withdraw(closest as any, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(closest);
      }
      return;
    }
  }

  // Nothing found - move to source and idle
  if (!creep.pos.isEqualTo(source.pos)) {
    creep.travelTo(source);
  }
}

/**
 * Pick up energy from a specific structure.
 * 
 * @param creep - The hauler creep
 * @param structure - The target structure
 */
function pickupFromStructure(creep: Creep, structure: RoomObject): void {
  const result = creep.withdraw(structure as any, RESOURCE_ENERGY);
  
  if (result === ERR_NOT_IN_RANGE) {
    creep.travelTo(structure);
  } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
    // Structure is empty, stay nearby and wait
    if (!creep.pos.isEqualTo(structure.pos)) {
      creep.travelTo(structure);
    }
  }
}

/**
 * Pick up energy from available sources.
 * 
 * Priority:
 * 1. Dropped energy on ground (fastest to pick up)
 * 2. Containers (stored energy)
 * 3. Idle
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
