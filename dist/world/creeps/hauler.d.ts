/**
 * HAULER BEHAVIOR
 *
 * Dedicated transport creep focused on energy movement.
 * Haulers pick up energy from one location and move it to another.
 *
 * Strategy:
 * - Pick up energy from containers, ruins, or dropped resources
 * - Transport it to spawn, extensions, or storage
 * - Minimize wasted movement
 *
 * Best for: Rooms with complex energy flows (multiple sources, distant structures)
 */
/**
 * Main behavior for hauler role.
 * Moves energy from sources to structures.
 *
 * @param creep - The creep to run hauler behavior on
 */
export declare function runHauler(creep: Creep): void;
//# sourceMappingURL=hauler.d.ts.map