import { Traveler } from "../Traveler";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";

export class RoleHauler {
  /**
   * Check if a container is mostly full (>= 75%)
   * Used to determine if haulers should help workers directly
   */
  private static isContainerMostlyFull(container: StructureContainer | null | undefined): boolean {
    if (!container?.store) return false;

    const capacity = container.store.getCapacity(RESOURCE_ENERGY);
    const current = container.store.getUsedCapacity(RESOURCE_ENERGY);

    return current >= (capacity * 0.75);
  }

  /**
   * Check if all relevant containers are mostly full (>= 75%)
   * This prevents thrashing - we don't need them 100% full
   */
  private static areContainersMostlyFull(room: Room, progressionState: any): boolean {
    // Check destination container if it exists
    if (progressionState?.destContainerId) {
      const destContainer = Game.getObjectById(progressionState.destContainerId) as StructureContainer | null;
      if (destContainer && !this.isContainerMostlyFull(destContainer)) {
        return false; // Dest container needs filling
      }
    }

    // Check controller container if it exists
    const controllerContainer = room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    })[0] as StructureContainer | undefined;

    if (controllerContainer && !this.isContainerMostlyFull(controllerContainer)) {
      return false; // Controller container needs filling
    }

    // All containers (that exist) are mostly full
    return true;
  }

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

      // 4. FOURTH PRIORITY: Direct transfer to nearby workers (builders/upgraders)
      // Only do this if containers are mostly full (>= 75%)
      // This prevents thrashing - we don't need them 100% full to help workers
      if (this.areContainersMostlyFull(creep.room, progressionState)) {
        const nearbyWorker = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
          filter: (c: Creep) => {
            // Only help builders and upgraders
            if (c.memory.role !== "builder" && c.memory.role !== "upgrader") return false;

            // Only help if they need energy (not full, not currently working)
            const needsEnergy = c.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
            const notWorking = !c.memory.working;

            return needsEnergy && notWorking;
          }
        });

        if (nearbyWorker && creep.pos.getRangeTo(nearbyWorker) <= 3) {
          if (creep.transfer(nearbyWorker, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            Traveler.travelTo(creep, nearbyWorker);
          }
          return;
        }
      }

      // All containers mostly full and no workers need help - idle near controller
      const controller = creep.room.controller;
      if (controller && creep.pos.getRangeTo(controller) > 3) {
        Traveler.travelTo(creep, controller, { range: 3 });
      }
    } else {
      // Collect energy from assigned source ONLY
      // CRITICAL: Each hauler is permanently assigned to ONE source
      // This prevents haulers from all clustering on the same container
      // Haulers should NEVER roam - they stay loyal to their assigned source

      // If no assignment, idle and wait for assignment
      if (!creep.memory.assignedSource) {
        const controller = creep.room.controller;
        if (controller && creep.pos.getRangeTo(controller) > 3) {
          Traveler.travelTo(creep, controller, { range: 3 });
        }
        return;
      }

      // Get assigned source
      const assignedSource = Game.getObjectById(creep.memory.assignedSource as Id<Source>);

      // If assigned source no longer exists, request reassignment
      if (!assignedSource) {
        creep.memory.requestReassignment = true;
        const controller = creep.room.controller;
        if (controller && creep.pos.getRangeTo(controller) > 3) {
          Traveler.travelTo(creep, controller, { range: 3 });
        }
        return;
      }

      // 1. Check for dropped energy AT the assigned source (harvester overflow)
      const droppedAtSource = assignedSource.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
        filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
      });

      if (droppedAtSource.length > 0) {
        const dropped = droppedAtSource[0];
        if (creep.pickup(dropped) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, dropped);
        }
        return;
      }

      // 2. Withdraw from assigned source's container
      const assignedContainer = assignedSource.pos.findInRange(FIND_STRUCTURES, 1, {
        filter: s => {
          if (s.structureType !== STRUCTURE_CONTAINER) return false;
          const container = s as StructureContainer;
          const energy = container.store?.getUsedCapacity(RESOURCE_ENERGY);
          return energy !== null && energy !== undefined && energy > 0;
        }
      })[0] as StructureContainer | undefined;

      if (assignedContainer) {
        if (creep.withdraw(assignedContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          Traveler.travelTo(creep, assignedContainer);
        }
        return;
      }

      // 3. Container empty - wait near the assigned source for energy
      // Stay loyal - don't roam to other sources!
      if (creep.pos.getRangeTo(assignedSource) > 2) {
        Traveler.travelTo(creep, assignedSource, { range: 2 });
      }
    }
  }
}
