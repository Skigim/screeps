/**
 * HAULER BEHAVIOR
 *
 * Dedicated transport creep focused on energy movement.
 * Haulers can be task-assigned to specific structures or sources.
 *
 * Strategy:
 * - If assigned to a source: Pick up from nearby dropped energy/containers, haul to spawn/extensions, idle at source
 * - If assigned to a structure: Pick up from that structure and haul to spawn/extensions
 * - If not assigned: Generic hauler that picks up from anywhere and delivers
 *
 * Best for: Rooms with complex energy flows (multiple sources, distant structures)
 */
/**
 * Main behavior for hauler role.
 * Respects task assignments to specific structures or sources.
 *
 * @param creep - The creep to run hauler behavior on
 */
export declare function runHauler(creep: Creep): void;
//# sourceMappingURL=hauler.d.ts.map