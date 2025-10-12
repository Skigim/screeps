import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

export class RoleUpgrader {
  public static run(creep: Creep, config: RCLConfig): void {
    // Get role config for this role
    const roleConfig = config.roles.upgrader;
    if (!roleConfig) {
      console.log(`⚠️ No upgrader config found for ${creep.name}`);
      return;
    }

    // Toggle working state
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      // Upgrade controller
      if (creep.room.controller) {
        if (creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, creep.room.controller);
        }
      }
    } else {
      // Withdraw energy from spawn/extensions (never harvest)
      const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: any) => {
          return (
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN) &&
            structure.store &&
            structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
          );
        }
      });

      if (target) {
        if (creep.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, target);
        }
      } else {
        // No energy available - help haul from sources to spawn/extensions
        const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
          filter: resource => resource.resourceType === RESOURCE_ENERGY
        });

        if (droppedEnergy) {
          if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, droppedEnergy);
          }
        }
      }
    }
  }
}
