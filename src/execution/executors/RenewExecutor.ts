/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * RenewExecutor - Handles RENEW_CREEP tasks
 * 
 * Responsibility: Keep creeps alive by renewing them at spawns
 * Philosophy: Use excess spawn energy to extend creep lifespan
 * 
 * When there are no urgent tasks, idle creeps should renew themselves
 * to avoid dying and wasting the energy that was used to spawn them.
 */
export class RenewExecutor extends TaskExecutor {
  /**
   * Execute renewal for a creep
   */
  public execute(creep: Creep, task: Task): TaskResult {
    // Get the spawn from the task
    const spawn = Game.getObjectById(task.targetId as Id<StructureSpawn>);
    
    if (!spawn) {
      return {
        status: TaskStatus.FAILED,
        message: 'Spawn not found'
      };
    }

    // Don't renew if creep is still very young (TTL > 1300 = ~65% life)
    if (creep.ticksToLive && creep.ticksToLive > 1300) {
      return {
        status: TaskStatus.COMPLETED,
        message: 'Creep still young, no renewal needed'
      };
    }

    // Check if spawn is spawning (can't renew while spawning)
    if (spawn.spawning) {
      return {
        status: TaskStatus.IN_PROGRESS,
        message: 'Waiting for spawn to finish spawning'
      };
    }

    // Check if spawn has enough energy to renew (costs energy)
    const renewCost = Math.ceil(this.calculateRenewCost(creep) * 0.1); // Estimate 10% of body cost
    if (spawn.store.getUsedCapacity(RESOURCE_ENERGY) < renewCost) {
      return {
        status: TaskStatus.FAILED,
        message: 'Spawn lacks energy for renewal'
      };
    }

    // Move to spawn if not adjacent
    if (!creep.pos.isNearTo(spawn)) {
      const moveResult = creep.moveTo(spawn, {
        visualizePathStyle: { stroke: '#00ff00' }
      });

      if (moveResult === OK) {
        return {
          status: TaskStatus.IN_PROGRESS,
          message: 'Moving to spawn'
        };
      } else {
        return {
          status: TaskStatus.FAILED,
          message: `Movement failed: ${moveResult}`
        };
      }
    }

    // Renew the creep
    const renewResult = spawn.renewCreep(creep);

    switch (renewResult) {
      case OK:
        return {
          status: TaskStatus.IN_PROGRESS,
          message: `Renewing (TTL: ${creep.ticksToLive})`
        };

      case ERR_NOT_ENOUGH_ENERGY:
        return {
          status: TaskStatus.FAILED,
          message: 'Spawn out of energy'
        };

      case ERR_FULL:
        // Creep is fully renewed
        return {
          status: TaskStatus.COMPLETED,
          message: 'Fully renewed'
        };

      case ERR_BUSY:
        return {
          status: TaskStatus.IN_PROGRESS,
          message: 'Spawn busy, waiting'
        };

      default:
        return {
          status: TaskStatus.FAILED,
          message: `Renewal failed: ${renewResult}`
        };
    }
  }

  /**
   * Calculate approximate renewal cost based on body parts
   */
  private calculateRenewCost(creep: Creep): number {
    const costs: { [key: string]: number } = {
      [MOVE]: 50,
      [WORK]: 100,
      [CARRY]: 50,
      [ATTACK]: 80,
      [RANGED_ATTACK]: 150,
      [HEAL]: 250,
      [TOUGH]: 10,
      [CLAIM]: 600
    };

    return creep.body.reduce((sum, part) => sum + (costs[part.type] || 0), 0);
  }
}
