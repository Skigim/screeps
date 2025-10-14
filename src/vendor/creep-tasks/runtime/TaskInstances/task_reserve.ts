import { Task } from '../Task';

export type reserveTargetType = StructureController;

export class TaskReserve extends Task {
    public static taskName = 'reserve';
    public target: reserveTargetType | null = null;

    constructor(target: reserveTargetType, options: TaskOptions = {}) {
        super(TaskReserve.taskName, target, options);
    }

    isValidTask(): boolean {
        return (this.creep.getActiveBodyparts(CLAIM) > 0);
    }

    isValidTarget(): boolean {
        const target = this.target;
        return !!(target && !target.owner && (!target.reservation || target.reservation.ticksToEnd < 4999));
    }

    work(): number {
        return this.creep.reserveController(this.target!);
    }
}
