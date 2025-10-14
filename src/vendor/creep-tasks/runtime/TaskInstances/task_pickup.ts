import { Task } from '../Task';

export type pickupTargetType = Resource;

export class TaskPickup extends Task {
    public static taskName = 'pickup';
    public target: pickupTargetType | null = null;

    constructor(target: pickupTargetType, options: TaskOptions = {}) {
        super(TaskPickup.taskName, target, options);
        this.settings.oneShot = true;
    }

    isValidTask(): boolean {
        return _.sum(this.creep.carry) < this.creep.carryCapacity;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.amount > 0);
    }

    work(): number {
        return this.creep.pickup(this.target!);
    }
}
