// TaskDismantle: dismantles a structure
import { Task } from '../Task';

export type dismantleTargetType = Structure;

export class TaskDismantle extends Task {
    public static taskName = 'dismantle';

    public get target(): dismantleTargetType | null {
        return super.target as dismantleTargetType | null;
    }

    constructor(target: dismantleTargetType, options: TaskOptions = {}) {
        super(TaskDismantle.taskName, target, options);
    }

    isValidTask(): boolean {
        return (this.creep.getActiveBodyparts(WORK) > 0);
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.hits > 0);
    }

    work(): number {
        return this.creep.dismantle(this.target!);
    }
}
