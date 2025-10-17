/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * DefendExecutor - Execute DEFEND_ROOM tasks
 * 
 * Creeps move to hostile creeps and attack them
 * Uses melee attack if available, otherwise ranged attack
 * Returns COMPLETED when no hostiles remain
 */
export class DefendExecutor extends TaskExecutor {
  public execute(creep: Creep, task: Task): TaskResult {
    // Get target hostile
    let hostile: Creep | null = null;

    if (task.targetId) {
      // If specific target is assigned, try to use it
      hostile = Game.getObjectById(task.targetId as Id<Creep>);
    }

    // If no target or target is gone, find nearest hostile
    if (!hostile) {
      const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
      if (hostiles.length === 0) {
        return { 
          status: TaskStatus.COMPLETED, 
          message: 'No hostiles',
          workDone: 0
        };
      }
      // Target nearest hostile
      hostile = creep.pos.findClosestByPath(hostiles);
      if (!hostile) {
        hostile = creep.pos.findClosestByRange(hostiles);
      }
    }

    // Validate we have a hostile to attack
    if (!hostile) {
      return { 
        status: TaskStatus.BLOCKED, 
        message: 'Hostile unreachable',
        workDone: 0
      };
    }

    // Check which attack types we have
    const hasAttack = creep.getActiveBodyparts(ATTACK) > 0;
    const hasRangedAttack = creep.getActiveBodyparts(RANGED_ATTACK) > 0;

    // If adjacent to hostile, use melee attack
    if (creep.pos.isNearTo(hostile)) {
      if (hasAttack) {
        const attackResult = creep.attack(hostile);
        if (attackResult === OK) {
          return { 
            status: TaskStatus.IN_PROGRESS, 
            message: 'Attacking',
            workDone: creep.getActiveBodyparts(ATTACK) * ATTACK_POWER
          };
        }
      }
      // Fall through to ranged attack
    }

    // Use ranged attack or move closer
    if (hasRangedAttack && creep.pos.inRangeTo(hostile, 3)) {
      const rangedResult = creep.rangedAttack(hostile);
      if (rangedResult === OK) {
        return { 
          status: TaskStatus.IN_PROGRESS, 
          message: 'Ranged attacking',
          workDone: creep.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER
        };
      }
    }

    // Move towards hostile
    const moveResult = this.moveToTarget(creep, hostile);
    if (moveResult === OK) {
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Moving to hostile',
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
}
