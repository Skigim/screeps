import { Task } from '../interfaces';
/**
 * Legatus Genetor - The Broodmother
 *
 * Responsibility: Maintain optimal creep population with intelligent body designs
 * Philosophy: Spawn versatile workers, let tasks find them
 *
 * The Broodmother analyzes room needs and spawns creeps with appropriate
 * body configurations. Creeps are assigned tasks based on their capabilities.
 */
export declare class LegatusGenetor {
    private roomName;
    constructor(roomName: string);
    /**
     * Analyze room population and spawn creeps as needed
     */
    run(tasks: Task[]): void;
    /**
     * Determine what type of creep the room needs most
     */
    private determineNeededCreepType;
    /**
     * Design a creep body based on type and available energy
     */
    private designCreepBody;
    /**
     * Design a general-purpose worker: WORK + CARRY + MOVE
     * Can harvest, build, upgrade, repair, and transfer
     */
    private designWorker;
    /**
     * Design a specialized hauler: Mostly CARRY + MOVE
     * Fast energy transport
     */
    private designHauler;
    private designDefender;
    private calculateBodyCost;
    private spawnCreep;
}
//# sourceMappingURL=LegatusGenetor.d.ts.map