import { TaskType } from '../interfaces';
import { TaskExecutor } from './TaskExecutor';
/**
 * Factory for task executors
 *
 * Responsibility: Provide the correct TaskExecutor for any given TaskType
 * Strategy: Registry pattern - executors register themselves by task type
 *
 * This factory maintains a registry of TaskExecutor instances, one per TaskType.
 * Specific executors are registered as they are implemented (Phase IV-B, Phase IV-C, etc.)
 */
export declare class ExecutorFactory {
    /** Registry mapping task types to their executors */
    private static executors;
    /**
     * Get the executor responsible for a specific task type
     *
     * Initializes executor registry on first use
     *
     * @param taskType - The type of task to get an executor for
     * @returns TaskExecutor instance or null if not yet implemented
     */
    static getExecutor(taskType: TaskType): TaskExecutor | null;
    /**
     * Register an executor for a task type
     *
     * Called during executor initialization phases to populate the registry
     * Multiple registrations for the same TaskType will replace the previous executor
     *
     * @param taskType - The task type this executor handles
     * @param executor - The executor instance
     */
    static registerExecutor(taskType: TaskType, executor: TaskExecutor): void;
    /**
     * Initialize the executor registry
     *
     * This is called on first getExecutor() call
     * Specific executors will be registered as they are created in subsequent phases:
     * - Phase IV-B: Agent Secundus creates Harvest, Transfer, Upgrade executors
     * - Phase IV-C: Additional executor implementations
     */
    private static initializeExecutors;
    /**
     * Get count of registered executors (useful for debugging)
     */
    static getExecutorCount(): number;
    /**
     * Get list of registered task types (useful for debugging)
     */
    static getRegisteredTaskTypes(): TaskType[];
}
//# sourceMappingURL=ExecutorFactory.d.ts.map