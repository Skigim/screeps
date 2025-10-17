/// <reference types="screeps" />

import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult, TaskStatus } from '../TaskResult';

/**
 * UpgradeExecutor - Execute UPGRADE_CONTROLLER tasks
 * 
 * Creeps move to the room controller and upgrade it
 * Returns COMPLETED when creep is empty of energy
 */
export class UpgradeExecutor extends TaskExecutor {
  public execute(creep: Creep, _task: Task): TaskResult {
    // Get the controller
    const controller = creep.room.controller;
    if (!controller) {
      return { status: TaskStatus.FAILED, message: 'No controller in room' };
    }

    const energyAmount = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    const distance = creep.pos.getRangeTo(controller);
    
    // Debug logging
    console.log(`🔧 ${creep.name}: Energy=${energyAmount}, Distance=${distance}, Pos=${creep.pos}`);

    // Check if creep is out of energy
    if (energyAmount === 0) {
      return { 
        status: TaskStatus.COMPLETED, 
        message: 'No energy',
        workDone: 0
      };
    }

    // Check if in range of controller (3 squares)
    if (!creep.pos.inRangeTo(controller, 3)) {
      // Move towards controller
      console.log(`🚶 ${creep.name}: Moving to controller at ${controller.pos}`);
      const moveResult = this.moveToTarget(creep, controller);
      console.log(`📍 ${creep.name}: moveTo result = ${moveResult}`);
      
      // Movement errors are usually not fatal - creep just needs to keep trying
      if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
        return { 
          status: TaskStatus.FAILED, 
          message: `Failed to move: ${moveResult}`,
          workDone: 0
        };
      }
      
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: `Moving to controller`,
        workDone: 0
      };
    }

    // In range - perform upgrade
    const upgradeResult = creep.upgradeController(controller);
    if (upgradeResult === OK) {
      const workParts = creep.getActiveBodyparts(WORK);
      const workDone = workParts * UPGRADE_CONTROLLER_POWER;
      return { 
        status: TaskStatus.IN_PROGRESS, 
        message: 'Upgrading',
        workDone: workDone
      };
    } else {
      return { 
        status: TaskStatus.FAILED, 
        message: `Upgrade failed: ${upgradeResult}`,
        workDone: 0
      };
    }
  }
}
