import { Task } from '../Task';

export type repairTargetType = Structure;

export class TaskRepair extends Task {
    public static taskName = 'repair';

    public get target(): repairTargetType | null {
        return super.target as repairTargetType | null;
    }

    constructor(target: repairTargetType, options: TaskOptions = {}) {
        super(TaskRepair.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }

    isValidTask(): boolean {
        return this.creep.carry.energy > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.hits < this.target.hitsMax);
    }

    work(): number {
        const result = this.creep.repair(this.target!);
        if (this.target!.structureType === STRUCTURE_ROAD) {
            // prevents workers from idling for a tick before moving to next target
            const newHits = this.target!.hits + this.creep.getActiveBodyparts(WORK) * REPAIR_POWER;
            if (newHits > this.target!.hitsMax) {
                this.finish();
            }
        }
        return result;
    }
}
