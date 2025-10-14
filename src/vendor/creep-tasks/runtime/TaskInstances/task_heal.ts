import { Task } from '../Task';

export type healTargetType = Creep;

export class TaskHeal extends Task {
    public static taskName = 'heal';
    public target: healTargetType | null = null;

    constructor(target: healTargetType, options: TaskOptions = {}) {
        super(TaskHeal.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }

    isValidTask(): boolean {
        return (this.creep.getActiveBodyparts(HEAL) > 0);
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.hits < this.target.hitsMax && this.target.my);
    }

    work(): number {
        if (this.creep.pos.isNearTo(this.target!)) {
            return this.creep.heal(this.target!);
        } else {
            this.moveToTarget(1);
        }
        return this.creep.rangedHeal(this.target!);
    }
}
