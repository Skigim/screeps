/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * HarvestExecutor - Execute HARVEST_ENERGY tasks
 * 
 * Creeps move to energy sources and harvest energy
 * Returns COMPLETED when creep is full or source is empty
 */
export class HarvestExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target source
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No harvest target specified' };
    }

    // Get the source
    const source = Game.getObjectById(task.targetId as Id<Source>);
    if (!source) {
      return { status: TaskStatus.FAILED, message: 'Source not found' };
    }

    // Check if creep is full
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'Creep full',
        workDone: 0
      };
    }

    // Check if source is depleted
    if (source.energy === 0) {
      return { 
        status: TaskStatus.BLOCKED, 
        message: 'Source empty',
        workDone: 0
      };
    }

    // Check if already adjacent to source
    if (!this.isAtTarget(creep, source)) {
      // Move towards source
      const moveResult = this.moveToTarget(creep, source);
      
      // Movement errors are usually not fatal - creep just needs to keep trying
      // Only fail on critical errors like ERR_NO_BODYPART
      if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
        return { 
          status: TaskStatus.FAILED, 
          message: `Failed to move: ${moveResult}`,
          workDone: 0
        };
      }
      
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Moving to source',
        workDone: 0
      };
    }

    // Adjacent to source - perform harvest
    const harvestResult = creep.harvest(source);
    if (harvestResult === OK) {
      const workParts = creep.getActiveBodyparts(WORK);
      const energyHarvested = Math.min(source.energy, workParts * HARVEST_POWER);
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Harvesting',
        workDone: energyHarvested
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Harvest failed: ${harvestResult}`,
        workDone: 0
      };
    }
  }
}
