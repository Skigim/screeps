import { Task } from '../Task';

export type harvestTargetType = Source | Mineral;

function isSource(obj: any): obj is Source {
    return obj.energy !== undefined;
}

export class TaskHarvest extends Task {
    public static taskName = 'harvest';
    public target: harvestTargetType | null = null;

    constructor(target: harvestTargetType, options: TaskOptions = {}) {
        super(TaskHarvest.taskName, target, options);
    }

    isValidTask(): boolean {
        return _.sum(this.creep.carry) < this.creep.carryCapacity;
    }

    isValidTarget(): boolean {
        // if (this.target && (this.target instanceof Source ? this.target.energy > 0 : this.target.mineralAmount > 0)) {
        // 	// Valid only if there's enough space for harvester to work - prevents doing tons of useless pathfinding
        // 	return this.target.pos.availableNeighbors().length > 0 || this.creep.pos.isNearTo(this.target.pos);
        // }
        // return false;
        if (this.target) {
            if (isSource(this.target)) {
                return this.target.energy > 0;
            } else {
                return this.target.mineralAmount > 0;
            }
        }
        return false;
    }

    work(): number {
        return this.creep.harvest(this.target!);
    }
}
