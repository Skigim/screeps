/**
 * CREEP DISPATCHER MODULE
 * 
 * Central dispatcher for all creep role behaviors.
 * This module imports role-specific behaviors and routes each creep
 * to the correct handler based on its role.
 * 
 * Architecture:
 * - Each role has its own file (harvester.ts, upgrader.ts, builder.ts)
 * - behaviors.ts defines RCL-specific configurations
 * - This index exports a unified `runCreep` function
 * - Main loop calls `runCreep` for each creep
 * 
 * Adding new roles:
 * 1. Create new file (e.g., src/world/creeps/repairer.ts)
 * 2. Import it here: import { runRepairer } from './repairer';
 * 3. Add case to switch statement below
 * 4. Add role to appropriate RCL config in behaviors.ts
 */

import { runHarvester } from './harvester';
import { runUpgrader } from './upgrader';
import { runBuilder } from './builder';

/**
 * Dispatches a creep to its role-specific behavior.
 * 
 * This is the single entry point for running creep behaviors.
 * It reads the creep's role from memory and calls the appropriate function.
 * 
 * @param creep - The creep to run behavior for
 * 
 * @remarks
 * If a creep has an unknown role, a warning is logged but no error is thrown.
 * This prevents one bad creep from crashing the entire game loop.
 * 
 * @example
 * ```typescript
 * const creeps = room.find(FIND_MY_CREEPS);
 * creeps.forEach(creep => runCreep(creep));
 * ```
 */
export function runCreep(creep: Creep): void {
  // Dispatch based on role stored in creep memory
  switch (creep.memory.role) {
    case 'harvester':
      runHarvester(creep);
      break;
    
    case 'upgrader':
      runUpgrader(creep);
      break;
    
    case 'builder':
      runBuilder(creep);
      break;
    
    default:
      // Unknown role - log warning but don't crash
      console.log(`⚠️ Unknown role '${creep.memory.role}' for creep ${creep.name}`);
      break;
  }
}

/**
 * Re-export individual role functions for advanced use cases.
 * Most code should use `runCreep`, but these are available if needed.
 */
export { runHarvester } from './harvester';
export { runUpgrader } from './upgrader';
export { runBuilder } from './builder';

// Export behavior configuration system
export {
  getBehaviorConfig,
  getRoleConfig,
  getRolesByPriority,
  rcl1Behavior,
  rcl2Behavior,
  type BehaviorConfig,
  type RoleConfig
} from './behaviors';

// Export spawn request utilities
export {
  getSpawnRequests,
  getNextSpawnRequest,
  getSpawnStatus,
  type SpawnRequest
} from './spawning';

// Export task system
export {
  getTask,
  assignTask,
  clearTask,
  executeTask,
  createHarvestTask,
  createDeliverTask,
  createBuildTask,
  createUpgradeTask,
  createMoveTask,
  createRepairTask,
  createIdleTask,
  getTaskDescription,
  type Task,
  type TaskType
} from './tasks';
