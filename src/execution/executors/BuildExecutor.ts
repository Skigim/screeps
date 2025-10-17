/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * BuildExecutor - Execute BUILD tasks
 * 
 * Creeps move to construction sites and build structures
 * Returns COMPLETED when construction site is finished or creep is empty
 */
export class BuildExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Validate task has a target construction site
    if (!task.targetId) {
      return { status: TaskStatus.FAILED, message: 'No construction site specified' };
    }

    // Get the construction site
    const site = Game.getObjectById(task.targetId as Id<ConstructionSite>);
    if (!site) {
      return { status: TaskStatus.FAILED, message: 'Construction site not found' };
    }

    // If creep has no energy, go harvest first
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      // Find nearest source with energy
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

      // Move to source and harvest
      if (!creep.pos.isNearTo(nearestSource)) {
        creep.moveTo(nearestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Moving to harvest energy',
          workDone: 0
        };
      }

      // Harvest
      const harvestResult = creep.harvest(nearestSource);
      if (harvestResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Harvesting energy for build',
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

    // Check if adjacent to construction site
    if (!this.isAtTarget(creep, site)) {
      // Move towards site
      const moveResult = this.moveToTarget(creep, site);
      if (moveResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Moving to construction site',
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

    // Adjacent to site - perform build
    const buildResult = creep.build(site);
    if (buildResult === OK) {
      const workParts = creep.getActiveBodyparts(WORK);
      const workDone = workParts * BUILD_POWER;
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Building',
        workDone: workDone
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Build failed: ${buildResult}`,
        workDone: 0
      };
    }
  }
}
