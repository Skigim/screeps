/**
 * HARVESTER BEHAVIOR MODULE
 *
 * The harvester is the backbone of your economy in Screeps.
 * It gathers energy from sources and delivers it to spawn/extensions.
 *
 * RCL1 Strategy:
 * - Harvest from the nearest active source
 * - Deliver energy to spawn first (ensures spawning never stops)
 * - If spawn is full, deliver to extensions (RCL2+)
 * - If all structures are full, help upgrade the controller
 *
 * State Machine:
 * - working: false → Creep is empty, needs to harvest
 * - working: true → Creep is full, needs to deliver energy
 */
/**
 * Main behavior function for harvester role.
 * Called once per game tick for each harvester creep.
 *
 * @param creep - The creep to run harvester behavior on
 *
 * @example
 * ```typescript
 * const harvester = Game.creeps['harvester_12345'];
 * runHarvester(harvester);
 * ```
 */
export declare function runHarvester(creep: Creep): void;
//# sourceMappingURL=harvester.d.ts.map