/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * RepairExecutor - Execute REPAIR tasks
 * 
 * Creeps move to damaged structures and repair them
 * Returns COMPLETED when structure is fully repaired or creep is empty
 */
export class RepairExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target structure
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No repair target specified' };
    }

    // Get the structure to repair
    const structure = Game.getObjectById(task.targetId as Id<Structure>);
    if (!structure) {
      return { status: TaskStatus.FAILED, message: 'Target structure not found' };
    }

    // Check if structure is already fully repaired
    if (structure.hits >= structure.hitsMax) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Structure repaired',
        workDone: 0
      };
    }

    // If creep has no energy, acquire energy first (following priority: pickup > harvest)
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      // Priority 1: Look for dropped energy first (don't waste it)
      const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
        filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
      });

      if (droppedEnergy) {
        if (!creep.pos.isNearTo(droppedEnergy)) {
          creep.moveTo(droppedEnergy, { visualizePathStyle: { stroke: '#ffaa00' } });
          return { 
            status: TaskStatus.IN_PROGRESS, 
            message: 'Moving to pickup energy',
            workDone: 0
          };
        }

        const pickupResult = creep.pickup(droppedEnergy);
        if (pickupResult === OK) {
          return { 
            status: TaskStatus.IN_PROGRESS, 
            message: 'Picking up energy for repair',
            workDone: 0
          };
        }
      }

      // Priority 2: Harvest from source
      const sources = creep.room.find(FIND_SOURCES_ACTIVE);
      if (sources.length === 0) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Waiting for energy sources to regenerate',
          workDone: 0
        };
      }

      const nearestSource = creep.pos.findClosestByPath(sources);
      if (!nearestSource) {
        return { 
          status: TaskStatus.FAILED, 
          message: 'Cannot path to energy source',
          workDone: 0
        };
      }

      if (!creep.pos.isNearTo(nearestSource)) {
        creep.moveTo(nearestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Moving to harvest energy',
          workDone: 0
        };
      }

      const harvestResult = creep.harvest(nearestSource);
      if (harvestResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Harvesting energy for repair',
          workDone: 0
        };
      } else {
        return { 
          status: TaskStatus.FAILED, 
          message: `Harvest failed: ${harvestResult}`,
          workDone: 0
        };
      }
    }

    // Check if adjacent to structure
    if (!this.isAtTarget(creep, structure)) {
      // Move towards structure
      const moveResult = this.moveToTarget(creep, structure);
      if (moveResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Moving to repair target',
          workDone: 0
        };
      } else {
        return { 
          status: TaskStatus.FAILED, 
          message: `Failed to move: ${moveResult}`,
          workDone: 0
        };
      }
    }

    // Adjacent to structure - perform repair
    const repairResult = creep.repair(structure);
    if (repairResult === OK) {
      const workParts = creep.getActiveBodyparts(WORK);
      const workDone = workParts * REPAIR_POWER;
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Repairing',
        workDone: workDone
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Repair failed: ${repairResult}`,
        workDone: 0
      };
    }
  }
}
