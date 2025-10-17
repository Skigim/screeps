import { Task } from '../interfaces';
/**
 * Legatus Legionum - The Legion Commander
 *
 * Responsibility: Execute tasks assigned to creeps
 * Philosophy: Every creep is a soldier executing orders
 *
 * The Legion Commander ensures each creep executes its assigned task.
 * It coordinates with ExecutorFactory to delegate task execution to
 * specialized executors, then handles the results (completion, failure, etc.)
 */
export declare class LegatusLegionum {
    private roomName;
    constructor(roomName: string);
    /**
     * Execute tasks for all creeps in the room
     *
     * For each creep:
     * 1. Check if it has an assigned task
     * 2. If no task, try to assign one from available tasks
     * 3. If it has a task, execute it using the appropriate executor
     * 4. Handle the result (mark complete, reassign, etc.)
     */
    run(tasks: Task[]): void;
    /**
     * Execute the assigned task for a specific creep
     *
     * @param creep - The creep to execute a task for
     * @param tasks - Available tasks in the room
     */
    private executeCreepTask;
    /**
     * Assign a task to an idle creep
     *
     * Finds the highest priority task that:
     * 1. Needs more creeps assigned
     * 2. The creep is capable of performing (based on body parts and state)
     *
     * @param creep - The creep to assign a task to
     * @param tasks - Available tasks
     */
    private assignTask;
    /**
     * Check if this creep can displace a weaker harvester from a task
     */
    private canDisplaceHarvester;
    /**
     * Displace the weakest harvester and assign this creep instead
     */
    private displaceWeakestHarvester;
    /**
     * Handle the result of a task execution
     *
     * @param creep - The creep that executed the task
     * @param task - The task that was executed
     * @param result - The result of the execution
     */
    private handleTaskResult;
}
//# sourceMappingURL=LegatusLegionum.d.ts.map