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
export { runRoom } from './rooms';
export { getMode, setMode, displayModeInfo, isCommandMode, isDelegateMode, getTicksSinceModeChange, type EmpireMode } from './empire';
export { getStructureName, getStructureId, scanRoom, lockStructure, unlockStructure, isLocked, getStructuresInRoom, getStructuresByType, renameStructure, getStructureInfo, getLockedStructures, listStructures, updateConstructionSites, type StructureInfo } from './structures';
export { showNames, hideNames, shouldShowNames, renderStructureNames, getVisualStatus, getActiveVisualRooms } from './visuals';
export { issueCommandToRole, issueCommandToCreep, getCreepCommand, clearCreepCommand, getRoomAssignments, getCreepAssignment, clearRoomAssignments, getLegaStatus, listLegaAssignments, type LegaCommand } from './creeps/legatus';
export { runCreep, runHarvester, runUpgrader, runBuilder } from './creeps';
export { getBehaviorConfig, getRoleConfig, getRolesByPriority, rcl1Behavior, rcl2Behavior, type BehaviorConfig, type RoleConfig } from './creeps';
export { getSpawnRequests, getNextSpawnRequest, getSpawnStatus, type SpawnRequest } from './creeps/spawning';
export { manageSpawn, getBody, getSpawnStatus as getSpawnLegacyStatus } from './spawns';
export * from './constants';
//# sourceMappingURL=index.d.ts.map