/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * WithdrawExecutor - Execute WITHDRAW_ENERGY tasks
 * 
 * Creeps move to containers/storage and withdraw energy
 * Returns COMPLETED when creep is full or structure is empty
 */
export class WithdrawExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No withdraw target specified' };
    }

    // Get the target structure
    const target = Game.getObjectById(task.targetId as Id<Structure>);
    if (!target) {
      return { status: TaskStatus.FAILED, message: 'Target structure not found' };
    }

    // Validate target has a store
    const storableTarget = target as AnyStoreStructure;
    if (!storableTarget.store) {
      return { status: TaskStatus.FAILED, message: 'Target has no store' };
    }

    // Check if creep is full
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Creep full',
        workDone: 0
      };
    }

    // Check if target is empty
    if (storableTarget.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.BLOCKED, 
        message: 'Target empty',
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

    // Adjacent to target - perform withdraw
    const withdrawResult = creep.withdraw(storableTarget, RESOURCE_ENERGY);
    if (withdrawResult === OK) {
      const energyWithdrawn = Math.min(
        creep.store.getFreeCapacity(RESOURCE_ENERGY),
        storableTarget.store.getUsedCapacity(RESOURCE_ENERGY)
      );
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Withdrawing',
        workDone: energyWithdrawn
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Withdraw failed: ${withdrawResult}`,
        workDone: 0
      };
    }
  }
}
