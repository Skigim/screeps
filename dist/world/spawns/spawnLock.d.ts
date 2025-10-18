/**
 * SPAWN LOCK SYSTEM
 *
 * Locks spawning when critical creeps (core production team) drop below safe TTL.
 * Prevents spawn exhaustion and ensures critical roles are replaced naturally.
 */
/**
 * Check if spawn should be locked based on critical creep TTL
 * Critical creeps: 2 miners + 3 haulers (core production team)
 */
export declare function isSpawnLocked(room: Room): boolean;
/**
 * Get spawn lock status for a room
 */
export declare function getSpawnLockInfo(room: Room): {
    locked: boolean;
    reason?: string;
    minCriticalTTL?: number;
};
//# sourceMappingURL=spawnLock.d.ts.map