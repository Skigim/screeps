/**
 * CREEP TASK SYSTEM
 * 
 * Allows assigning simple tasks to creeps via console.
 * Tasks override normal role behavior when active.
 * 
 * Example tasks:
 * - harvest(sourceId)
 * - deliver(structureId)
 * - build(siteId)
 * - upgrade()
 * - move(x, y, roomName)
 */

export type TaskType = 'harvest' | 'deliver' | 'build' | 'upgrade' | 'move' | 'repair' | 'dismantle' | 'idle';

/**
 * A task assigned to a creep
 */
export interface Task {
  type: TaskType;
  targetId?: string;           // For harvest, deliver, build, repair, dismantle
  targetPos?: { x: number; y: number; roomName: string };  // For move
  priority: 'low' | 'normal' | 'high';
  assignedAt: number;
  expiresAt?: number;          // Optional: task expires after N ticks
  status: 'pending' | 'active' | 'completed' | 'failed';
}

/**
 * Get task assigned to a creep
 * 
 * @param creep - The creep to check
 * @returns The current task, or undefined
 */
export function getTask(creep: Creep): Task | undefined {
  if (!creep.memory.task) {
    return undefined;
  }
  return creep.memory.task as Task;
}

/**
 * Assign a task to a creep
 * 
 * @param creep - The creep to assign to
 * @param task - The task to assign
 */
export function assignTask(creep: Creep, task: Task): void {
  task.assignedAt = Game.time;
  task.status = 'pending';
  creep.memory.task = task;
}

/**
 * Clear task from a creep
 * 
 * @param creep - The creep to clear
 */
export function clearTask(creep: Creep): void {
  creep.memory.task = undefined;
}

/**
 * Create a harvest task
 * 
 * @param sourceId - The source's id
 * @returns Task object
 */
export function createHarvestTask(sourceId: string): Task {
  return {
    type: 'harvest',
    targetId: sourceId,
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create a deliver task
 * 
 * @param structureId - The structure's id (spawn, extension, container, etc.)
 * @returns Task object
 */
export function createDeliverTask(structureId: string): Task {
  return {
    type: 'deliver',
    targetId: structureId,
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create a build task
 * 
 * @param siteId - The construction site's id
 * @returns Task object
 */
export function createBuildTask(siteId: string): Task {
  return {
    type: 'build',
    targetId: siteId,
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create an upgrade task
 * 
 * @returns Task object
 */
export function createUpgradeTask(): Task {
  return {
    type: 'upgrade',
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create a move task
 * 
 * @param x - Target X coordinate
 * @param y - Target Y coordinate
 * @param roomName - Target room
 * @returns Task object
 */
export function createMoveTask(x: number, y: number, roomName: string): Task {
  return {
    type: 'move',
    targetPos: { x, y, roomName },
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create a repair task
 * 
 * @param structureId - The structure's id
 * @returns Task object
 */
export function createRepairTask(structureId: string): Task {
  return {
    type: 'repair',
    targetId: structureId,
    priority: 'normal',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Create an idle task (do nothing)
 * 
 * @returns Task object
 */
export function createIdleTask(): Task {
  return {
    type: 'idle',
    priority: 'low',
    assignedAt: Game.time,
    status: 'pending'
  };
}

/**
 * Execute a task for a creep
 * 
 * @param creep - The creep executing the task
 * @param task - The task to execute
 * @returns true if task is completed, false if still active
 */
export function executeTask(creep: Creep, task: Task): boolean {
  // Check if task has expired
  if (task.expiresAt && Game.time > task.expiresAt) {
    return true; // Task expired, mark as done
  }

  task.status = 'active';

  switch (task.type) {
    case 'harvest': {
      if (!task.targetId) return true;
      const source = Game.getObjectById(task.targetId as Id<Source>);
      if (!source) return true;

      const result = creep.harvest(source);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(source);
      } else if (result === OK) {
        // Harvesting...
      }
      return false;
    }

    case 'deliver': {
      if (!task.targetId) return true;
      const target = Game.getObjectById(task.targetId as Id<AnyStoreStructure>);
      if (!target) return true;

      const result = creep.transfer(target, RESOURCE_ENERGY);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(target);
      } else if (result === OK) {
        // Delivered
      }
      return false;
    }

    case 'build': {
      if (!task.targetId) return true;
      const site = Game.getObjectById(task.targetId as Id<ConstructionSite>);
      if (!site) return true;

      const result = creep.build(site);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(site);
      } else if (result === OK) {
        // Building
      }
      return false;
    }

    case 'upgrade': {
      const controller = creep.room.controller;
      if (!controller) return true;

      const result = creep.upgradeController(controller);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(controller);
      } else if (result === OK) {
        // Upgrading
      }
      return false;
    }

    case 'move': {
      if (!task.targetPos) return true;
      const pos = new RoomPosition(task.targetPos.x, task.targetPos.y, task.targetPos.roomName);
      const range = creep.pos.getRangeTo(pos);

      if (range > 0) {
        creep.travelTo(pos);
      }
      return range === 0; // Complete when arrived
    }

    case 'repair': {
      if (!task.targetId) return true;
      const structure = Game.getObjectById(task.targetId as Id<Structure>);
      if (!structure) return true;

      const result = creep.repair(structure);
      if (result === ERR_NOT_IN_RANGE) {
        creep.travelTo(structure);
      } else if (result === OK) {
        // Repairing
      }
      return false;
    }

    case 'idle': {
      // Do nothing, task never completes automatically
      return false;
    }

    default:
      return true;
  }
}

/**
 * Get task status as a human-readable string
 */
export function getTaskDescription(task: Task): string {
  switch (task.type) {
    case 'harvest': {
      const source = Game.getObjectById(task.targetId as Id<Source>);
      return `Harvest from ${source ? source.pos : task.targetId}`;
    }
    case 'deliver': {
      const target = Game.getObjectById(task.targetId as Id<AnyStoreStructure>);
      return `Deliver to ${target ? target.pos : task.targetId}`;
    }
    case 'build': {
      const site = Game.getObjectById(task.targetId as Id<ConstructionSite>);
      return `Build ${site ? site.pos : task.targetId}`;
    }
    case 'upgrade':
      return 'Upgrade controller';
    case 'move':
      return `Move to ${task.targetPos?.x},${task.targetPos?.y}`;
    case 'repair': {
      const structure = Game.getObjectById(task.targetId as Id<Structure>);
      return `Repair ${structure ? structure.pos : task.targetId}`;
    }
    case 'idle':
      return 'Idle (do nothing)';
    default:
      return 'Unknown task';
  }
}
