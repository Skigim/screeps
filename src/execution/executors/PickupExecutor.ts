/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * PickupExecutor - Execute PICKUP_ENERGY tasks
 * 
 * Creeps move to dropped energy and pick it up
 * Returns COMPLETED when creep is full or energy is gone
 */
export class PickupExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No pickup target specified' };
    }

    // Get the dropped resource
    const resource = Game.getObjectById(task.targetId as Id<Resource>);
    if (!resource) {
      return { status: TaskStatus.FAILED, message: 'Dropped resource not found' };
    }

    // Check if creep is full
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Creep full',
        workDone: 0
      };
    }

    // Check if resource still exists and has energy
    if (resource.amount === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Resource depleted',
        workDone: 0
      };
    }

    // Check if in range to pickup (must be adjacent)
    if (!this.isAtTarget(creep, resource)) {
      // Move towards resource
      const moveResult = this.moveToTarget(creep, resource);
      
      // Movement errors are usually not fatal
      if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
        return { 
          status: TaskStatus.FAILED, 
          message: `Failed to move: ${moveResult}`,
          workDone: 0
        };
      }
      
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Moving to resource',
        workDone: 0
      };
    }

    // Adjacent to resource - perform pickup
    const pickupResult = creep.pickup(resource);
    if (pickupResult === OK) {
      const amountPickedUp = Math.min(
        resource.amount,
        creep.store.getFreeCapacity(RESOURCE_ENERGY)
      );
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Picking up energy',
        workDone: amountPickedUp
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Pickup failed: ${pickupResult}`,
        workDone: 0
      };
    }
  }
}
