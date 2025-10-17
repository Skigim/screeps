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

    // If creep has no energy, acquire energy first
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      // Check if economy is bootstrapped (harvesters + haulers ready)
      const creeps = Object.values(Game.creeps).filter(c => c.memory.room === creep.room.name);
      const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
      const haulerCount = creeps.filter(c => c.memory.role === 'hauler').length;
      const sources = creep.room.find(FIND_SOURCES);
      const economyBootstrapped = harvesterCount >= sources.length && haulerCount >= 2;
      
      // Priority 1: Withdraw from spawn (if economy bootstrapped and spawn has excess)
      // This frees haulers to focus on hauling
      if (economyBootstrapped) {
        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > 100) {
          if (!creep.pos.isNearTo(spawn)) {
            creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
            return { 
              status: TaskStatus.IN_PROGRESS, 
              message: 'Moving to withdraw from spawn',
              workDone: 0
            };
          }

          const withdrawResult = creep.withdraw(spawn, RESOURCE_ENERGY);
          if (withdrawResult === OK) {
            return { 
              status: TaskStatus.IN_PROGRESS, 
              message: 'Withdrawing energy for repair',
              workDone: 0
            };
          }
        }
      }
      
      // Priority 2: Look for dropped energy (fallback or during bootstrap)
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

      // No energy available - wait for haulers to provide
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Waiting for energy delivery',
        workDone: 0
      };
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
