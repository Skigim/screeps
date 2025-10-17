import { Task } from '../interfaces';
/**
 * Legatus Genetor - The Broodmother
 *
 * Responsibility: Design and spawn creeps optimized for tasks
 * Philosophy: The right tool for the right job
 *
 * The Broodmother looks at the task queue and determines if a new creep
 * is needed. If so, it designs the perfect body for that task.
 */
export declare class LegatusGenetor {
    private roomName;
    constructor(roomName: string);
    /**
     * Analyze tasks and spawn creeps as needed
     */
    run(tasks: Task[]): void;
    private designCreep;
    private designHarvester;
    private designHauler;
    private designBuilder;
    private designRepairer;
    private designUpgrader;
    private designDefender;
    private designWorker;
    private calculateBodyCost;
    private spawnCreep;
}
//# sourceMappingURL=LegatusGenetor.d.ts.map