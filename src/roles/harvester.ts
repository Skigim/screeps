import { Traveler } from "../Traveler";
import { AssignmentManager } from "../managers/AssignmentManager";

export class RoleHarvester {
  public static run(creep: Creep): void {
    // Assign to source if not already assigned
    if (AssignmentManager.needsReassignment(creep)) {
      AssignmentManager.assignCreepToSource(creep, creep.room);
    }

    // Toggle working state
    if (creep.store.getFreeCapacity() === 0) {
      creep.memory.working = true;
    }
    if (creep.store.getUsedCapacity() === 0) {
      creep.memory.working = false;
    }

    if (!creep.memory.working) {
      // Harvest energy from assigned source
      if (creep.memory.assignedSource) {
        const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      } else {
        // Fallback: find any source if no assignment
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
          if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, source);
          }
        }
      }
    } else {
      // Transfer energy to spawn or extensions
      const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: any) => {
          return (
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN ||
              structure.structureType === STRUCTURE_TOWER) &&
            structure.store && structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        }
      });

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, target);
        }
      }
    }
  }
}
