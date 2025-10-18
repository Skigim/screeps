/**
 * CREEP TASK SYSTEM
 *
 * Allows assigning simple tasks to creeps via console.
 * Tasks override normal role behavior when active.
 *
 * Example tasks:
 * - harvest(sourceId)
 * - deliver(structureId)
 * - build(siteId)
 * - upgrade()
 * - move(x, y, roomName)
 */
export type TaskType = 'harvest' | 'deliver' | 'build' | 'upgrade' | 'move' | 'repair' | 'dismantle' | 'idle';
/**
 * A task assigned to a creep
 */
export interface Task {
    type: TaskType;
    targetId?: string;
    targetPos?: {
        x: number;
        y: number;
        roomName: string;
    };
    priority: 'low' | 'normal' | 'high';
    assignedAt: number;
    expiresAt?: number;
    status: 'pending' | 'active' | 'completed' | 'failed';
}
/**
 * Get task assigned to a creep
 *
 * @param creep - The creep to check
 * @returns The current task, or undefined
 */
export declare function getTask(creep: Creep): Task | undefined;
/**
 * Assign a task to a creep
 *
 * @param creep - The creep to assign to
 * @param task - The task to assign
 */
export declare function assignTask(creep: Creep, task: Task): void;
/**
 * Clear task from a creep
 *
 * @param creep - The creep to clear
 */
export declare function clearTask(creep: Creep): void;
/**
 * Create a harvest task
 *
 * @param sourceId - The source's id
 * @returns Task object
 */
export declare function createHarvestTask(sourceId: string): Task;
/**
 * Create a deliver task
 *
 * @param structureId - The structure's id (spawn, extension, container, etc.)
 * @returns Task object
 */
export declare function createDeliverTask(structureId: string): Task;
/**
 * Create a build task
 *
 * @param siteId - The construction site's id
 * @returns Task object
 */
export declare function createBuildTask(siteId: string): Task;
/**
 * Create an upgrade task
 *
 * @returns Task object
 */
export declare function createUpgradeTask(): Task;
/**
 * Create a move task
 *
 * @param x - Target X coordinate
 * @param y - Target Y coordinate
 * @param roomName - Target room
 * @returns Task object
 */
export declare function createMoveTask(x: number, y: number, roomName: string): Task;
/**
 * Create a repair task
 *
 * @param structureId - The structure's id
 * @returns Task object
 */
export declare function createRepairTask(structureId: string): Task;
/**
 * Create an idle task (do nothing)
 *
 * @returns Task object
 */
export declare function createIdleTask(): Task;
/**
 * Execute a task for a creep
 *
 * @param creep - The creep executing the task
 * @param task - The task to execute
 * @returns true if task is completed, false if still active
 */
export declare function executeTask(creep: Creep, task: Task): boolean;
/**
 * Get task status as a human-readable string
 */
export declare function getTaskDescription(task: Task): string;
//# sourceMappingURL=tasks.d.ts.map