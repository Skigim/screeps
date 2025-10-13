import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";

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
      // Deliver energy with smart prioritization
      // CRITICAL: NEVER fill spawn (it auto-regenerates 300 energy)
      // Priority:
      // 1. Extensions (need energy for spawning)
      // 2. Destination container near spawn (for builders/upgraders)
      // 3. Controller container (for upgraders)

      // 1. HIGHEST PRIORITY: Fill extensions
      const extension = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: (structure: any) => {
          return (
            structure.structureType === STRUCTURE_EXTENSION &&
            structure.store &&
            structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
          );
        }
      });

      if (extension) {
        if (creep.transfer(extension, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, extension);
        }
        return;
      }

      // 2. SECOND PRIORITY: Fill destination container (spawn-adjacent container for builders/upgraders)
      const progressionState = RoomStateManager.getProgressionState(creep.room.name);

      if (progressionState?.destContainerId) {
        const destContainer = Game.getObjectById(progressionState.destContainerId);

        if (destContainer?.store) {
          const freeCapacity = destContainer.store.getFreeCapacity(RESOURCE_ENERGY);
          if (freeCapacity && freeCapacity > 0) {
            if (creep.transfer(destContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
              Traveler.travelTo(creep, destContainer);
            }
            return;
          }
        }
      }

      // 3. THIRD PRIORITY: Fill controller container
      const controllerContainer = creep.room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
        filter: s => s.structureType === STRUCTURE_CONTAINER
      })[0] as StructureContainer | undefined;

      if (controllerContainer?.store) {
        const freeCapacity = controllerContainer.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeCapacity && freeCapacity > 0) {
          if (creep.transfer(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, controllerContainer);
          }
          return;
        }
      }

      // All containers full - idle near controller
      const controller = creep.room.controller;
      if (controller && creep.pos.getRangeTo(controller) > 3) {
        Traveler.travelTo(creep, controller, { range: 3 });
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

      // 3. No energy available - idle off road network
      // Haulers have no WORK parts, so they can't harvest
      // Track idle time for spawn management metrics
      const controller = creep.room.controller;
      if (controller) {
        // Move to controller area (typically off main roads)
        if (creep.pos.getRangeTo(controller) > 3) {
          Traveler.travelTo(creep, controller, { range: 3 });
        }
      }
    }
  }
}
