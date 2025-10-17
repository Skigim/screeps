/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * TransferExecutor - Execute energy transfer tasks
 * 
 * Handles: REFILL_SPAWN, REFILL_EXTENSION, REFILL_TOWER tasks
 * Creeps move to target structure and transfer energy
 * Returns COMPLETED when creep is empty or structure is full
 */
export class TransferExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No transfer target specified' };
    }

    // Get the target structure
    const target = Game.getObjectById(task.targetId as Id<Structure>);
    if (!target) {
      return { status: TaskStatus.FAILED, message: 'Target structure not found' };
    }

    // Validate target can store energy
    const storableTarget = target as AnyStoreStructure;
    if (!storableTarget.store) {
      return { status: TaskStatus.FAILED, message: 'Target cannot store energy' };
    }

    // Check if creep is empty
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Creep empty',
        workDone: 0
      };
    }

    // Check if target is full
    if (storableTarget.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Target full',
        workDone: 0
      };
    }

    // Check if adjacent to target
    if (!this.isAtTarget(creep, target)) {
      // Move towards target
      const moveResult = this.moveToTarget(creep, target);
      if (moveResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Moving to target',
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

    // Adjacent to target - perform transfer
    const transferResult = creep.transfer(storableTarget, RESOURCE_ENERGY);
    if (transferResult === OK) {
      const energyTransferred = Math.min(
        creep.store.getUsedCapacity(RESOURCE_ENERGY),
        storableTarget.store.getFreeCapacity(RESOURCE_ENERGY)
      );
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Transferring',
        workDone: energyTransferred
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Transfer failed: ${transferResult}`,
        workDone: 0
      };
    }
  }
}
