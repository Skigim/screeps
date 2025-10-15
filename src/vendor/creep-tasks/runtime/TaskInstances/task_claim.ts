// TaskClaim: claims a new controller
import { Task } from '../Task';

export type claimTargetType = StructureController;

export class TaskClaim extends Task {
    public static taskName = 'claim';

    public get target(): claimTargetType | null {
        return super.target as claimTargetType | null;
    }

    constructor(target: claimTargetType, options: TaskOptions = {}) {
        super(TaskClaim.taskName, target, options);
        // Settings
    }

    isValidTask(): boolean {
        return (this.creep.getActiveBodyparts(CLAIM) > 0);
    }

    isValidTarget(): boolean {
        return !!(this.target && (!this.target.room || !this.target.owner));
    }

    work(): number {
        return this.creep.claimController(this.target!);
    }
}
