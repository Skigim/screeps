/**
 * MINER BEHAVIOR MODULE
 *
 * The miner is the backbone of your economy in Screeps.
 * It gathers energy from sources and delivers it to spawn/extensions.
 *
 * RCL1 Strategy:
 * - Mine from the nearest active source
 * - Deliver energy to spawn first (ensures spawning never stops)
 * - If spawn is full, deliver to extensions (RCL2+)
 * - If all structures are full, help upgrade the controller
 *
 * State Machine:
 * - working: false → Creep is empty, needs to mine
 * - working: true → Creep is full, needs to deliver energy
 */
/**
 * Main behavior function for miner role.
 * Called once per game tick for each miner creep.
 *
 * @param creep - The creep to run miner behavior on
 *
 * @example
 * ```typescript
 * const miner = Game.creeps['miner_12345'];
 * runMiner(miner);
 * ```
 */
export declare function runMiner(creep: Creep): void;
//# sourceMappingURL=miner.d.ts.map