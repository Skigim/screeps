/**
 * BUILDER BEHAVIOR MODULE
 *
 * Builders construct structures from construction sites.
 * They withdraw energy and build roads, extensions, towers, etc.
 *
 * RCL1 Strategy:
 * - Only spawn builders when construction sites exist
 * - Withdraw energy from spawn/extensions
 * - Build the nearest construction site
 * - If no sites exist, help upgrade controller (don't idle)
 *
 * Construction priorities (managed externally):
 * - Extensions (increase spawn energy capacity)
 * - Roads (reduce creep fatigue, increase efficiency)
 * - Containers (energy storage near sources)
 *
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should build
 */
/**
 * Main behavior function for builder role.
 * Called once per game tick for each builder creep.
 *
 * @param creep - The creep to run builder behavior on
 *
 * @example
 * ```typescript
 * const builder = Game.creeps['builder_12345'];
 * runBuilder(builder);
 * ```
 */
export declare function runBuilder(creep: Creep): void;
//# sourceMappingURL=builder.d.ts.map