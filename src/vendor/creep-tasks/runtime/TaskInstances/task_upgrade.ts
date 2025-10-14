import { Task } from '../Task';

export type upgradeTargetType = StructureController;

export class TaskUpgrade extends Task {
    public static taskName = 'upgrade';
    public target: upgradeTargetType | null = null;

    constructor(target: upgradeTargetType, options: TaskOptions = {}) {
        super(TaskUpgrade.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }

    isValidTask(): boolean {
        return (this.creep.carry.energy > 0);
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.my);
    }

    work(): number {
        return this.creep.upgradeController(this.target!);
    }
}
