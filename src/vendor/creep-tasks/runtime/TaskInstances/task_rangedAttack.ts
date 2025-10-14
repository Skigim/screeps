import { Task } from '../Task';

export type rangedAttackTargetType = Creep | Structure;

export class TaskRangedAttack extends Task {
    public static taskName = 'rangedAttack';
    public target: rangedAttackTargetType | null = null;

    constructor(target: rangedAttackTargetType, options: TaskOptions = {}) {
        super(TaskRangedAttack.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }

    isValidTask(): boolean {
        return this.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.hits > 0);
    }

    work(): number {
        return this.creep.rangedAttack(this.target!);
    }
}
