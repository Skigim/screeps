/**
 * LEGATUS OF OFICIO - THE TASKMASTER
 *
 * Central command processor for creep management.
 * Stores room context and task queues, relaying commands to creeps.
 * Reduces per-creep memory overhead by centralizing command dispatch.
 *
 * The Legatus receives orders and distributes them to the appropriate creeps,
 * tracking execution state without burdening individual creep memory.
 */
export interface LegaCommand {
    type: 'harvest' | 'deliver' | 'build' | 'upgrade' | 'move' | 'repair' | 'idle';
    target?: string;
    priority?: 'low' | 'normal' | 'high';
    issuedAt: number;
}
interface CreepAssignment {
    creepName: string;
    command: LegaCommand;
    assignedAt: number;
}
/**
 * Issue a command to all creeps of a specific role
 *
 * @param room - Room where the command applies
 * @param role - Role to target (e.g., 'harvester', 'builder')
 * @param command - The command to issue
 */
export declare function issueCommandToRole(room: Room, role: string, command: LegaCommand): number;
/**
 * Issue a command to a specific creep
 *
 * @param creepName - Name of the creep
 * @param roomName - Room name for registry lookup
 * @param command - The command to issue
 */
export declare function issueCommandToCreep(creepName: string, roomName: string, command: LegaCommand): boolean;
/**
 * Get current command for a creep from Legatus
 *
 * @param creep - The creep to get command for
 * @returns The command, or undefined if none
 */
export declare function getCreepCommand(creep: Creep): LegaCommand | undefined;
/**
 * Clear command for a creep
 *
 * @param creepName - Name of creep
 * @param roomName - Room name
 */
export declare function clearCreepCommand(creepName: string, roomName: string): void;
/**
 * Get all current assignments in a room
 *
 * @param roomName - Room to query
 * @returns Array of assignments
 */
export declare function getRoomAssignments(roomName: string): CreepAssignment[];
/**
 * Get assignments for a specific creep
 *
 * @param creepName - Name of creep
 * @param roomName - Room name
 * @returns Assignment if found, undefined otherwise
 */
export declare function getCreepAssignment(creepName: string, roomName: string): CreepAssignment | undefined;
/**
 * Clear all assignments in a room
 *
 * @param roomName - Room to clear
 */
export declare function clearRoomAssignments(roomName: string): void;
/**
 * Get status of Legatus in a room
 */
export declare function getLegaStatus(roomName: string): string;
/**
 * List all assignments in a room (for debugging)
 */
export declare function listLegaAssignments(roomName: string): void;
export {};
//# sourceMappingURL=legatus.d.ts.map