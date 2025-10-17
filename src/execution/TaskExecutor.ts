import { Task } from '../interfaces';
import { TaskResult } from './TaskResult';

/**
 * Base class for task execution
 * 
 * Responsibility: Execute specific task types with creeps
 * Strategy: Each TaskType has a corresponding executor subclass
 * 
 * This abstract class defines the interface that all task executors must implement,
 * providing utility methods for common operations like movement and positioning checks.
 */
export abstract class TaskExecutor {
  /**
   * Execute the given task with the specified creep
   * 
   * Each subclass must implement specific execution logic for its TaskType
   * 
   * @param creep - The creep performing the task
   * @param task - The task to execute
   * @returns TaskResult indicating the outcome and progress
   */
  abstract execute(creep: Creep, task: Task): TaskResult;

  /**
   * Check if a creep is at or adjacent to the target position
   * 
   * @param creep - The creep to check
   * @param target - The target position or object
   * @returns true if creep is near target, false otherwise
   */
  protected isAtTarget(creep: Creep, target: RoomPosition | RoomObject): boolean {
    return creep.pos.isNearTo(target);
  }

  /**
   * Move a creep to the target position with standard pathfinding
   * 
   * Uses visualized paths and path reuse for efficiency
   * 
   * @param creep - The creep to move
   * @param target - The target position or object
   * @returns Screeps return code (OK, ERR_NO_PATH, etc.)
   */
  protected moveToTarget(creep: Creep, target: RoomPosition | RoomObject): ScreepsReturnCode {
    return creep.moveTo(target, {
      visualizePathStyle: { stroke: '#ffffff' },
      reusePath: 10
    });
  }
}
