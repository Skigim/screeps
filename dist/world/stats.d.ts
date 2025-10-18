/**
 * SILENT STATISTICS TRACKING
 *
 * Tracks RCL progression, creep composition, energy metrics, and performance data
 * completely silently in memory. Never logs to console.
 *
 * Data available at: Memory.stats
 */
/**
 * Initialize stats tracking if not already present
 */
export declare function initializeStats(): void;
/**
 * Update stats for current tick
 * Called once per tick from main game loop
 */
export declare function updateStats(room: Room): void;
/**
 * Get current stats object
 * @returns Current stats from Memory
 */
export declare function getStats(): any;
/**
 * Get RCL history (for analysis after completing RCL)
 * @returns Array of completed RCL data
 */
export declare function getRclHistory(): any[];
/**
 * Clear all stats (useful for starting fresh run)
 */
export declare function clearStats(): void;
//# sourceMappingURL=stats.d.ts.map