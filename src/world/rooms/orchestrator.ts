/**
 * ROOM ORCHESTRATOR MODULE
 * 
 * Coordinates all activities within a single room.
 * This is the "conductor" that brings together spawning, creep behaviors,
 * and room-level strategy.
 * 
 * Responsibilities:
 * - Run spawn manager to maintain creep population
 * - Dispatch creep behaviors based on role
 * - Report room statistics for debugging
 * - Handle room-level optimizations (future: tower management, link logic, etc.)
 * 
 * RCL1 Focus:
 * - Simple priority-based spawning
 * - Role-based creep behaviors
 * - Energy flow optimization
 */

import { manageSpawn } from '../spawns/manager';
import { runCreep } from '../creeps';
import { renderStructureNames } from '../visuals';
import { updateConstructionSites } from '../structures';
import { isCommandMode } from '../empire';

/**
 * Runs all logic for a single owned room.
 * Called once per tick for each room under your control.
 * 
 * This is the main orchestration function that:
 * 1. Counts creeps by role
 * 2. Manages spawning via spawn manager
 * 3. Runs behavior for each creep
 * 4. Reports statistics
 * 
 * @param room - The room to orchestrate
 * 
 * @remarks
 * This function should only be called for rooms with a controller
 * that you own (room.controller.my === true).
 * 
 * @example
 * ```typescript
 * for (const roomName in Game.rooms) {
 *   const room = Game.rooms[roomName];
 *   if (room.controller && room.controller.my) {
 *     runRoom(room);
 *   }
 * }
 * ```
 */
export function runRoom(room: Room): void {
  // Find the primary spawn in this room
  const spawn = room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) {
    // No spawn in this room, can't do much yet
    return;
  }

  // Update construction sites each tick (rename completed ones)
  updateConstructionSites(room);

  // Get all creeps in this room
  const creeps = room.find(FIND_MY_CREEPS);
  
  // Count creeps by role for spawn manager
  const roleCounts = countCreepsByRole(creeps);
  const { minerCount, upgraderCount, builderCount } = roleCounts;

  // Log room statistics for debugging (every 100 ticks to reduce console spam)
  if (Game.time % 100 === 0) {
    logRoomStats(room, roleCounts);
  }

  // Manage spawning based on current population
  // SKIP automatic spawning in COMMAND mode - user has full manual control
  // In DELEGATE mode, AI automatically spawns creeps based on priorities
  if (!isCommandMode()) {
    manageSpawn(spawn, room, minerCount, upgraderCount, builderCount);
  }

  // Run behavior for each creep in the room
  runCreeps(creeps);

  // Render structure name visuals if enabled
  renderStructureNames(room);
}

/**
 * Counts creeps by their role.
 * 
 * @param creeps - Array of creeps to count
 * @returns Object with counts for each role
 * 
 * @remarks
 * This is more efficient than filtering multiple times,
 * and makes it easy to add new roles in the future.
 */
function countCreepsByRole(creeps: Creep[]): {
  minerCount: number;
  upgraderCount: number;
  builderCount: number;
} {
  const miners = creeps.filter(c => c.memory.role === 'miner');
  const upgraders = creeps.filter(c => c.memory.role === 'upgrader');
  const builders = creeps.filter(c => c.memory.role === 'builder');

  return {
    minerCount: miners.length,
    upgraderCount: upgraders.length,
    builderCount: builders.length
  };
}

/**
 * Logs room statistics to console for debugging.
 * 
 * Shows:
 * - Room name
 * - Creep counts by role (H=harvesters, U=upgraders, B=builders)
 * - Current RCL (Room Controller Level)
 * 
 * @param room - The room to log stats for
 * @param roleCounts - Counts of creeps by role
 * 
 * @remarks
 * This is useful for debugging and monitoring room performance.
 * In production, you might want to reduce console spam by logging
 * only every N ticks or when values change.
 */
function logRoomStats(
  room: Room,
  roleCounts: { minerCount: number; upgraderCount: number; builderCount: number }
): void {
  const { minerCount, upgraderCount, builderCount } = roleCounts;
  const rcl = room.controller ? room.controller.level : 0;
  
  console.log(
    `📊 ${room.name}: M=${minerCount}, U=${upgraderCount}, B=${builderCount}, RCL=${rcl}`
  );
}

/**
 * Runs behavior for all creeps in the room.
 * 
 * Dispatches each creep to its role-specific behavior function
 * via the unified creep dispatcher.
 * 
 * @param creeps - Array of creeps to run
 * 
 * @remarks
 * The actual role logic is in src/world/creeps/*.ts files.
 * This function just iterates and dispatches to the right handler.
 */
function runCreeps(creeps: Creep[]): void {
  creeps.forEach(creep => {
    runCreep(creep);
  });
}
