/**
 * Task execution status enumeration
 * Represents the outcome of a task execution attempt
 */
export declare enum TaskStatus {
    /** Task is currently being executed */
    IN_PROGRESS = "IN_PROGRESS",
    /** Task has been completed successfully */
    COMPLETED = "COMPLETED",
    /** Task execution failed */
    FAILED = "FAILED",
    /** Task cannot be executed (e.g., target unreachable) */
    BLOCKED = "BLOCKED"
}
/**
 * Result of a single task execution
 * Returned by TaskExecutor.execute() to indicate what happened
 */
export interface TaskResult {
    /** Current status of the task */
    status: TaskStatus;
    /** Optional message describing the status (e.g., error details) */
    message?: string;
    /** Energy consumed during this execution */
    energyUsed?: number;
    /** Amount of work completed (e.g., energy transferred, building damage) */
    workDone?: number;
}
//# sourceMappingURL=TaskResult.d.ts.map