import { Task } from '../Task';

export type meleeAttackTargetType = Creep | Structure;

export class TaskMeleeAttack extends Task {
    public static taskName = 'meleeAttack';
    public target: meleeAttackTargetType | null = null;

    constructor(target: meleeAttackTargetType, options: TaskOptions = {}) {
        super(TaskMeleeAttack.taskName, target, options);
        // Settings
        this.settings.targetRange = 1;
    }

    isValidTask(): boolean {
        return this.creep.getActiveBodyparts(ATTACK) > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.hits > 0);
    }

    work(): number {
        return this.creep.attack(this.target!);
    }
}
