/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * IdleExecutor - Execute IDLE tasks
 * 
 * Default fallback executor for creeps without assigned tasks
 * Moves to a safe parking position near the controller
 * Returns IN_PROGRESS indefinitely until reassigned
 */
export class IdleExecutor extends TaskExecutor {
  public execute(creep: Creep, _task: Task): TaskResult {
    // Get the controller as a safe parking position
    const controller = creep.room.controller;
    if (!controller) {
      // No controller - just stay put
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Idling (no controller)',
        workDone: 0
      };
    }

    // If already in parking area (adjacent to controller), stay put
    if (creep.pos.inRangeTo(controller, 3)) {
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Parked',
        workDone: 0
      };
    }

    // Move to parking position
    const moveResult = this.moveToTarget(creep, controller);
    if (moveResult === OK) {
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Moving to parking',
        workDone: 0
      };
    } else if (moveResult === ERR_NO_PATH) {
      // Can't reach parking - stay put
      return { 
        status: TaskStatus.BLOCKED, 
        message: 'Parking unreachable',
        workDone: 0
      };
    } else {
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Idling',
        workDone: 0
      };
    }
  }
}
