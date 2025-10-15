// TaskBuild: builds a construction site until creep has no energy or site is complete
import { Task } from '../Task';

export type buildTargetType = ConstructionSite;

export class TaskBuild extends Task {
    public static taskName = 'build';

    public get target(): buildTargetType | null {
        return super.target as buildTargetType | null;
    }

    constructor(target: buildTargetType, options: TaskOptions = {}) {
        super(TaskBuild.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }

    isValidTask(): boolean {
        return this.creep.carry.energy > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.my && this.target.progress < this.target.progressTotal);
    }

    work(): number {
        return this.creep.build(this.target!);
    }
}
