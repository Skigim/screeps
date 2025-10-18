/**
 * STATIONARY HARVESTER BEHAVIOR
 *
 * Stationary harvesters stay in one place and harvest from a single source.
 * They're optimized for maximum work output, not mobility.
 *
 * Strategy:
 * - Pick one energy source and stay there
 * - Harvest continuously from that source
 * - Deliver energy to containers/storage nearby
 * - Minimize movement to maximize harvest rate
 *
 * Best for: Small rooms with sources close to spawn
 */
/**
 * Main behavior for stationary harvester role.
 * Stays at assigned source and harvests continuously.
 *
 * @param creep - The creep to run stationary harvester behavior on
 */
export declare function runStationaryHarvester(creep: Creep): void;
//# sourceMappingURL=harvester-stationary.d.ts.map