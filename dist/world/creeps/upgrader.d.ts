/**
 * UPGRADER BEHAVIOR MODULE
 *
 * Upgraders maintain and improve your Room Controller Level (RCL).
 * They withdraw energy from spawn/extensions and upgrade the controller.
 *
 * Why upgraders matter:
 * - Prevent controller downgrade (critical at low RCL)
 * - Unlock new structures and capabilities at each RCL
 * - RCL1→2 unlocks extensions (300 energy capacity each)
 * - RCL2→3 unlocks towers, walls, ramparts
 *
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should upgrade
 */
/**
 * Main behavior function for upgrader role.
 * Called once per game tick for each upgrader creep.
 *
 * @param creep - The creep to run upgrader behavior on
 *
 * @example
 * ```typescript
 * const upgrader = Game.creeps['upgrader_12345'];
 * runUpgrader(upgrader);
 * ```
 */
export declare function runUpgrader(creep: Creep): void;
//# sourceMappingURL=upgrader.d.ts.map