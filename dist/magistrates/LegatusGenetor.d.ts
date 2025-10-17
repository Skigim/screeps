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
     * Spawn a specific creep type with appropriate body design
     */
    private spawnCreepByType;
    /**
     * Design a creep body based on type and available energy
     */
    private designCreepBody;
    /**
     * Design a dedicated harvester: Target 5 WORK parts, 1 MOVE, NO CARRY
     * These creeps ONLY harvest and drop energy, haulers pick it up
     */
    private designHarvester;
    /**
     * Design a general-purpose worker: WORK + CARRY + MOVE
     * Can harvest, build, upgrade, repair, and transfer
     */
    private designWorker;
    /**
     * Design a specialized hauler: Maximize CARRY, no WORK parts
     * Pure logistics - pickup, transfer, refill only
     */
    private designHauler;
    private designDefender;
    private calculateBodyCost;
}
//# sourceMappingURL=LegatusGenetor.d.ts.map