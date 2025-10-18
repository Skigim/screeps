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
export declare function runRoom(room: Room): void;
//# sourceMappingURL=orchestrator.d.ts.map