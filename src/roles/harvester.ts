/**
 * Task-based Harvester Role
 *
 * Mostly preserves custom logic due to unique stationary harvester behavior.
 * Uses tasks for mobile harvester movement and delivery.
 */

import Tasks from "creep-tasks";
import type { RCLConfig } from "configs/RCL1Config";
import { RoomStateManager } from "managers/RoomStateManager";
import { AssignmentManager } from "managers/AssignmentManager";

export class RoleHarvester {
  public static run(creep: Creep, config: RCLConfig): void {
    const roleConfig = config.roles.harvester;
    if (!roleConfig) {
      console.log(`⚠️ No harvester config found for ${creep.name}`);
      return;
    }

    // Execute current task if exists
    if (creep.task) {
      console.log(`[${creep.name}] Executing task: ${creep.task.name}`);
      return;
    }

    console.log(`[${creep.name}] Idle - assigned source: ${creep.memory.assignedSource}`);

    const progressionState = RoomStateManager.getProgressionState(creep.room.name);
    const isRCL1WithContainers =
      creep.room.controller?.level === 1 && config.spawning.useContainers;
    const useDropMining = isRCL1WithContainers || progressionState?.useHaulers || false;

    const hasCarryParts = creep.getActiveBodyparts(CARRY) > 0;
    const isStationaryHarvester = !hasCarryParts;

    // STATIONARY HARVESTER: Custom logic (tasks not beneficial here)
    if (isStationaryHarvester && useDropMining) {
      this.runStationaryHarvester(creep);
      return;
    }

    // MOBILE HARVESTER: Use task-based system
    this.runMobileHarvester(creep);
  }

  /**
   * Stationary harvester - custom logic preserved
   * Parks on container and harvests continuously
   */
  private static runStationaryHarvester(creep: Creep): void {
    if (!creep.memory.assignedSource) return;

    const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
    if (!source) return;

    // Find container at source
    const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    }) as StructureContainer[];

    if (containers.length > 0) {
      const targetContainer = containers[0];
      if (!creep.pos.isEqualTo(targetContainer.pos)) {
        creep.task = Tasks.goTo(targetContainer, { range: 0 } as any);
      } else {
        // On container - harvest (no task needed, just action)
        creep.harvest(source);
      }
      return;
    }

    // No container - check for construction site
    const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    if (containerSites.length > 0) {
      const site = containerSites[0];
      if (!creep.pos.isEqualTo(site.pos)) {
        creep.task = Tasks.goTo(site, { range: 0 } as any);
      } else {
        creep.harvest(source);
      }
      return;
    }

    // No container or site - harvest next to source
    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.task = Tasks.goTo(source, { range: 1 } as any);
    }
  }

  /**
   * Mobile harvester - task-based with drop mining support
   */
  private static runMobileHarvester(creep: Creep): void {
    const assignedSourceId = creep.memory.assignedSource;
    if (!assignedSourceId) {
      console.log(`[${creep.name}] No assigned source!`);
      return;
    }

    const source = Game.getObjectById(assignedSourceId as Id<Source>);
    if (!source) {
      console.log(`[${creep.name}] Source ${assignedSourceId} not found!`);
      return;
    }

    // If no task or task is invalid, assign harvest task
    if (!creep.task || !creep.task.isValid()) {
      console.log(`[${creep.name}] Assigning harvest task for source ${source.id}`);
      creep.task = Tasks.harvest(source);
    } else {
      console.log(`[${creep.name}] Already has valid task: ${creep.task.name}`);
    }
  }

  /**
   * Drop energy at container or site for haulers
   */
  private static assignDropMiningTask(creep: Creep): void {
    if (!creep.memory.assignedSource) return;

    const source = Game.getObjectById<Source>(creep.memory.assignedSource as any);
    if (!source) return;

    // Find container
    const containers = source.pos.findInRange(FIND_STRUCTURES, 1, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    }) as StructureContainer[];

    if (containers.length > 0) {
      const targetContainer = containers[0];
      if (creep.pos.isEqualTo(targetContainer.pos)) {
        // On container - drop energy (no task, just action)
        creep.drop(RESOURCE_ENERGY);
      } else {
        creep.task = Tasks.goTo(targetContainer, { range: 0 } as any);
      }
      return;
    }

    // Check for construction site
    const containerSites = source.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, {
      filter: s => s.structureType === STRUCTURE_CONTAINER
    });

    if (containerSites.length > 0) {
      const site = containerSites[0];
      if (creep.pos.isEqualTo(site.pos)) {
        creep.drop(RESOURCE_ENERGY);
      } else {
        creep.task = Tasks.goTo(site, { range: 0 } as any);
      }
      return;
    }
  }

  /**
   * Deliver energy to spawn/extensions (legacy behavior)
   */
  private static assignDeliveryTask(creep: Creep): void {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: (structure: any) =>
        (structure.structureType === STRUCTURE_EXTENSION ||
          structure.structureType === STRUCTURE_SPAWN ||
          structure.structureType === STRUCTURE_TOWER) &&
        structure.store &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as StructureExtension | StructureSpawn | StructureTower | null;

    if (target) {
      creep.task = Tasks.transfer(target, RESOURCE_ENERGY);
    }
  }
}
