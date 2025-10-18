/**
 * WORLD MODULE - Main Entry Point
 * 
 * This is the unified entry point for the world subsystem.
 * It re-exports key functions from submodules for convenient importing.
 * 
 * Usage in main.ts:
 * ```typescript
 * import { runRoom } from './world';
 * 
 * export const loop = () => {
 *   for (const roomName in Game.rooms) {
 *     const room = Game.rooms[roomName];
 *     if (room.controller && room.controller.my) {
 *       runRoom(room);
 *     }
 *   }
 * };
 * ```
 * 
 * Architecture:
 * - world/rooms - Room-level orchestration
 * - world/creeps - Creep role behaviors
 * - world/spawns - Spawn management and body design
 * - world/types - Type definitions (if needed)
 * - world/constants - Shared constants
 */

// Export room orchestration (main entry point for room logic)
export { runRoom } from './rooms';

// Export empire management
export {
  getMode,
  setMode,
  displayModeInfo,
  isCommandMode,
  isDelegateMode,
  getTicksSinceModeChange,
  type EmpireMode
} from './empire';

// Export structure registry and naming
export {
  getStructureName,
  getStructureId,
  scanRoom,
  lockStructure,
  unlockStructure,
  isLocked,
  getStructuresInRoom,
  getStructuresByType,
  renameStructure,
  getStructureInfo,
  getLockedStructures,
  listStructures,
  updateConstructionSites,
  type StructureInfo
} from './structures';

// Export room visual display system
export {
  showNames,
  hideNames,
  shouldShowNames,
  renderStructureNames,
  getVisualStatus,
  getActiveVisualRooms
} from './visuals';

// Export LegatusOficio (Taskmaster) system
export {
  issueCommandToRole,
  issueCommandToCreep,
  getCreepCommand,
  clearCreepCommand,
  getRoomAssignments,
  getCreepAssignment,
  clearRoomAssignments,
  getLegaStatus,
  listLegaAssignments,
  type LegaCommand
} from './creeps/legatus';

// Export creep dispatcher and individual role behaviors
export { runCreep, runHarvester, runUpgrader, runBuilder } from './creeps';

// Export behavior configuration system
export {
  getBehaviorConfig,
  getRoleConfig,
  getRolesByPriority,
  rcl1Behavior,
  rcl2Behavior,
  type BehaviorConfig,
  type RoleConfig
} from './creeps';

// Export spawn request utilities
export {
  getSpawnRequests,
  getNextSpawnRequest,
  getSpawnStatus,
  type SpawnRequest
} from './creeps/spawning';

// Export spawn management functions
export { manageSpawn, getBody, getSpawnStatus as getSpawnLegacyStatus } from './spawns';

// Export constants
export * from './constants';
