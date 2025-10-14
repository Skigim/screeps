/**
 * Task-based Hauler Role
 *
 * Uses creep-tasks library while preserving all custom logic:
 * - 5-tier priority delivery system
 * - Source-specific assignments (no roaming)
 * - Builder helper assignments
 * - Container fill thresholds
 */

import Tasks from "creep-tasks";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";

export class RoleHauler {
  /**
   * Check if a container is mostly full (>= 75%)
   */
  private static isContainerMostlyFull(container: StructureContainer | null | undefined): boolean {
    if (!container?.store) return false;
    const capacity = container.store.getCapacity(RESOURCE_ENERGY);
    const current = container.store.getUsedCapacity(RESOURCE_ENERGY);
    return current >= capacity * 0.75;
  }

  /**
   * Check if all relevant containers are mostly full (>= 75%)
   */
  private static areContainersMostlyFull(room: Room, progressionState: any): boolean {
    if (progressionState?.destContainerId) {
      const destContainer = Game.getObjectById(
        progressionState.destContainerId
      ) as StructureContainer | null;
      if (destContainer && !this.isContainerMostlyFull(destContainer)) {
        return false;
      }
    }

    const controllerContainer = room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    })[0] as StructureContainer | undefined;

    if (controllerContainer && !this.isContainerMostlyFull(controllerContainer)) {
      return false;
    }

    return true;
  }

  public static run(creep: Creep, config: RCLConfig): void {
    // Execute current task if exists
    if (creep.task) {
      return;
    }

    // RCL1: Simple direct delivery to controller
    if (creep.room.controller?.level === 1) {
      this.runRCL1(creep);
      return;
    }

    // RCL2+: Check for builder assignment first
    if (creep.memory.assignedBuilder) {
      const builder = Game.creeps[creep.memory.assignedBuilder];
      if (!builder || builder.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        console.log(`${creep.name}: Builder assignment complete`);
        delete creep.memory.assignedBuilder;
        delete creep.memory.deliveryAmount;
      } else {
        // Deliver to builder
        const transferAmount = creep.memory.deliveryAmount || creep.store[RESOURCE_ENERGY];
        creep.task = Tasks.transfer(builder, RESOURCE_ENERGY, transferAmount);
        return;
      }
    }

    // Decide: gather or deliver
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      this.assignDeliveryTask(creep);
    } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      this.assignGatherTask(creep);
    }
  }

  /**
   * RCL1: Simple container -> controller delivery
   */
  private static runRCL1(creep: Creep): void {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && creep.room.controller) {
      // Full - deliver to controller
      creep.task = Tasks.upgrade(creep.room.controller);
      return;
    }

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      // Empty - gather energy
      const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: s =>
          s.structureType === STRUCTURE_CONTAINER && (s as StructureContainer).store[RESOURCE_ENERGY] > 0
      }) as StructureContainer | null;

      if (container) {
        creep.task = Tasks.withdraw(container, RESOURCE_ENERGY);
        return;
      }

      // No container - pickup dropped energy
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
      });

      if (droppedEnergy) {
        creep.task = Tasks.pickup(droppedEnergy);
      }
    }
  }

  /**
   * Assign delivery task based on 5-tier priority system
   */
  private static assignDeliveryTask(creep: Creep): void {
    const progressionState = RoomStateManager.getProgressionState(creep.room.name);

    // Priority 1: Extensions
    const extension = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (structure: any) =>
        structure.structureType === STRUCTURE_EXTENSION &&
        structure.store &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as StructureExtension | null;

    if (extension) {
      creep.task = Tasks.transfer(extension, RESOURCE_ENERGY);
      return;
    }

    // Priority 2: Spawn
    const spawn = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
      filter: (structure: any) =>
        structure.structureType === STRUCTURE_SPAWN &&
        structure.store &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as StructureSpawn | null;

    if (spawn) {
      creep.task = Tasks.transfer(spawn, RESOURCE_ENERGY);
      return;
    }

    // Priority 3: Destination container
    if (progressionState?.destContainerId) {
      const destContainer = Game.getObjectById(
        progressionState.destContainerId
      ) as StructureContainer | null;

      if (destContainer && destContainer.store?.getFreeCapacity(RESOURCE_ENERGY)! > 0) {
        creep.task = Tasks.transfer(destContainer, RESOURCE_ENERGY);
        return;
      }
    }

    // Priority 4: Controller container
    const controllerContainer = creep.room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    })[0] as StructureContainer | undefined;

    if (controllerContainer && controllerContainer.store?.getFreeCapacity(RESOURCE_ENERGY)! > 0) {
      creep.task = Tasks.transfer(controllerContainer, RESOURCE_ENERGY);
      return;
    }

    // Priority 5: Direct transfer to nearby workers (if containers mostly full)
    if (this.areContainersMostlyFull(creep.room, progressionState)) {
      const nearbyWorker = creep.pos.findClosestByRange(FIND_MY_CREEPS, {
        filter: (c: Creep) =>
          (c.memory.role === "builder" || c.memory.role === "upgrader") &&
          c.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
          !c.memory.working
      });

      if (nearbyWorker && creep.pos.getRangeTo(nearbyWorker) <= 3) {
        creep.task = Tasks.transfer(nearbyWorker, RESOURCE_ENERGY);
        return;
      }
    }

    // All full - idle near controller
    if (creep.room.controller && creep.pos.getRangeTo(creep.room.controller) > 3) {
      creep.task = Tasks.goTo(creep.room.controller, { range: 3 } as any);
    }
  }

  /**
   * Gather energy from assigned source ONLY (no roaming)
   */
  private static assignGatherTask(creep: Creep): void {
    // If no assignment, idle and wait
    if (!creep.memory.assignedSource) {
      if (creep.room.controller && creep.pos.getRangeTo(creep.room.controller) > 3) {
        creep.task = Tasks.goTo(creep.room.controller, { range: 3 } as any);
      }
      return;
    }

    // Get assigned source
    const assignedSource = Game.getObjectById(creep.memory.assignedSource as Id<Source>);

    // If source gone, request reassignment
    if (!assignedSource) {
      creep.memory.requestReassignment = true;
      if (creep.room.controller && creep.pos.getRangeTo(creep.room.controller) > 3) {
        creep.task = Tasks.goTo(creep.room.controller, { range: 3 } as any);
      }
      return;
    }

    // Priority 1: Dropped energy at source
    const droppedAtSource = assignedSource.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount >= 50
    });

    if (droppedAtSource.length > 0) {
      creep.task = Tasks.pickup(droppedAtSource[0]);
      return;
    }

    // Priority 2: Assigned source's container
    const assignedContainer = assignedSource.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: s => {
        if (s.structureType !== STRUCTURE_CONTAINER) return false;
        const container = s as StructureContainer;
        const energy = container.store?.getUsedCapacity(RESOURCE_ENERGY);
        return energy !== null && energy !== undefined && energy > 0;
      }
    })[0] as StructureContainer | undefined;

    if (assignedContainer) {
      creep.task = Tasks.withdraw(assignedContainer, RESOURCE_ENERGY);
      return;
    }

    // Priority 3: Wait near assigned source (no roaming!)
    if (creep.pos.getRangeTo(assignedSource) > 2) {
      creep.task = Tasks.goTo(assignedSource, { range: 2 } as any);
    }
  }
}
