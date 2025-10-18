/**
 * CREEP SPAWNING LOGIC BASED ON BEHAVIOR CONFIG
 *
 * This module uses the behavior configuration system to:
 * - Determine which roles should be spawned
 * - Check if we're below target counts
 * - Generate appropriate bodies based on config
 */
/**
 * Spawn request with priority and role info
 */
export interface SpawnRequest {
    role: string;
    body: BodyPartConstant[];
    priority: number;
    reason: string;
}
/**
 * Get all roles that need spawning (below target count)
 *
 * @param room - The room to check
 * @returns Array of SpawnRequests sorted by priority (highest first)
 *
 * @example
 * ```typescript
 * const requests = getSpawnRequests(room);
 * const topPriority = requests[0];
 * console.log(`Should spawn ${topPriority.role} (priority ${topPriority.priority})`);
 * ```
 */
export declare function getSpawnRequests(room: Room): SpawnRequest[];
/**
 * Get a human-readable summary of current vs target creep composition
 *
 * @param room - The room to analyze
 * @returns Formatted status string
 *
 * @example
 * ```
 * Harvesters: 2/2 ✓ | Upgraders: 1/1 ✓ | Builders: 0/1 ⚠️
 * ```
 */
export declare function getSpawnStatus(room: Room): string;
/**
 * Get the next role that should be spawned (if any)
 *
 * @param room - The room to check
 * @returns SpawnRequest for the highest priority role that needs spawning, or undefined
 */
export declare function getNextSpawnRequest(room: Room): SpawnRequest | undefined;
//# sourceMappingURL=spawning.d.ts.map