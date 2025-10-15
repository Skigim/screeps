import { Task } from '../Task';

export type pickupTargetType = Resource;

export class TaskPickup extends Task {
    public static taskName = 'pickup';

    public get target(): pickupTargetType | null {
        return super.target as pickupTargetType | null;
    }

    constructor(target: pickupTargetType, options: TaskOptions = {}) {
        super(TaskPickup.taskName, target, options);
        this.settings.oneShot = true;
    }

    isValidTask(): boolean {
        return this.creep.store.getFreeCapacity() > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.amount > 0);
    }

    work(): number {
        return this.creep.pickup(this.target!);
    }
}
