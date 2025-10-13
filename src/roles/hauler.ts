import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";

export class RoleHauler {
  public static run(creep: Creep, config: RCLConfig): void {
    // Toggle working state
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      creep.memory.working = true;
    }

    if (creep.memory.working) {
      // Deliver to spawn/extensions
      const target = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (structure: any) => {
          return (
            (structure.structureType === STRUCTURE_EXTENSION ||
              structure.structureType === STRUCTURE_SPAWN) &&
            structure.store &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        }
      });

      if (target) {
        if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, target);
        }
      } else {
        // If spawn/extensions full, deliver to controller container
        const controllerContainer = creep.room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
          filter: s => s.structureType === STRUCTURE_CONTAINER
        })[0] as StructureContainer | undefined;

        if (controllerContainer?.store) {
          const freeCapacity = controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY);
          if (freeCapacity && freeCapacity > 0) {
            if (creep.transfer(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, controllerContainer);
            }
          }
        }
      }
    } else {
      // Collect energy - prioritize dropped energy, then containers

      // 1. Dropped energy (from stationary harvesters during Phase 2)
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
      });

      if (droppedEnergy) {
        if (creep.pickup(droppedEnergy) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, droppedEnergy);
        }
        return;
      }

      // 2. Source containers
      const sourceContainer = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: s => {
          if (s.structureType !== STRUCTURE_CONTAINER) return false;
          const container = s as StructureContainer;
          const energy = container.store?.getUsedCapacity(RESOURCE_ENERGY);
          return energy !== null && energy !== undefined && energy > 0;
        }
      }) as StructureContainer | null;

      if (sourceContainer) {
        if (creep.withdraw(sourceContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, sourceContainer);
        }
        return;
      }

      // 3. Fallback: Harvest directly (emergency)
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, source);
        }
      }
    }
  }
}
