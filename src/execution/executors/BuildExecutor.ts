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

    // If creep has no energy, acquire energy first (pickup > withdraw from spawn)
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
            message: 'Picking up energy for build',
            workDone: 0
          };
        }
      }

      // Priority 2: Withdraw from spawn (if spawn has excess energy)
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
            message: 'Withdrawing energy for build',
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
