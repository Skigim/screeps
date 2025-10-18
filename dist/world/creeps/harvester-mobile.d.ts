/**
 * MOBILE HARVESTER BEHAVIOR
 *
 * Mobile harvesters roam between multiple sources and harvest from them.
 * They're optimized for flexibility, working multiple sources efficiently.
 *
 * Strategy:
 * - Find the nearest active source
 * - Harvest from it while it has energy
 * - When source runs out, move to next nearest source
 * - Deliver energy to any nearby spawn/extension/container
 * - Continuously rotate through available sources
 *
 * Best for: Larger rooms with distant sources or variable source availability
 */
/**
 * Main behavior for mobile harvester role.
 * Roams between sources and harvests from multiple locations.
 *
 * @param creep - The creep to run mobile harvester behavior on
 */
export declare function runMobileHarvester(creep: Creep): void;
//# sourceMappingURL=harvester-mobile.d.ts.map