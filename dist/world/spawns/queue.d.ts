/**
 * SPAWN QUEUE SYSTEM
 *
 * Allows queuing spawn commands that execute when energy becomes available.
 * Useful for planning ahead without manual energy monitoring.
 */
export interface QueuedSpawn {
    id: string;
    role: string;
    body: BodyPartConstant[];
    task?: {
        type: string;
        targetId?: string;
    };
    room: string;
    createdAt: number;
}
/**
 * Initialize spawn queue if not present
 */
export declare function initializeQueue(): void;
/**
 * Add a spawn to the queue
 * @param role - Creep role (miner, hauler, builder, upgrader)
 * @param body - Array of body parts
 * @param room - Room to spawn in
 * @param task - Optional: task to assign after spawning
 * @returns Queue item ID
 */
export declare function queueSpawn(role: string, body: BodyPartConstant[], room: string, task?: {
    type: string;
    targetId?: string;
}): string;
/**
 * Remove a spawn from the queue by ID
 */
export declare function dequeueSpawn(id: string): boolean;
/**
 * Get all queued spawns
 */
export declare function getQueue(): QueuedSpawn[];
/**
 * Get queue items for a specific room
 */
export declare function getQueueForRoom(roomName: string): QueuedSpawn[];
/**
 * Clear entire queue
 */
export declare function clearQueue(): void;
/**
 * Process spawn queue for a room
 * Called once per tick from room orchestrator
 * Spawns queued creeps when energy is available
 */
export declare function processSpawnQueue(room: Room): void;
//# sourceMappingURL=queue.d.ts.map