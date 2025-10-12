import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

export class RoleHarvester {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.harvester;
    if (!roleConfig) {
      console.log(`⚠️ No harvester config found for ${creep.name}`);
      return;
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
