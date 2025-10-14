import { Task } from '../Task';

export type fortifyTargetType = StructureWall | StructureRampart;

export class TaskFortify extends Task {
    public static taskName = 'fortify';
    public target: fortifyTargetType | null = null;

    constructor(target: fortifyTargetType, options: TaskOptions = {}) {
        super(TaskFortify.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }

    isValidTask(): boolean {
        return (this.creep.carry.energy > 0);
    }

    isValidTarget(): boolean {
        const target = this.target;
        return !!(target && target.hits < target.hitsMax); // over-fortify to minimize extra trips
    }

    work(): number {
        return this.creep.repair(this.target!);
    }
}
