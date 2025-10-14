// TaskDrop: drops a resource at a position
import { Task } from '../Task';

export type dropTargetType = { pos: RoomPosition } | RoomPosition;

export class TaskDrop extends Task {
    public static taskName = 'drop';

    constructor(target: dropTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}) {
        if (target instanceof RoomPosition) {
            super(TaskDrop.taskName, { ref: '', pos: target }, options);
        } else {
            super(TaskDrop.taskName, { ref: '', pos: target.pos }, options);
        }
        // Settings
        this.settings.oneShot = true;
        this.settings.targetRange = 0;
        // Data
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }

    isValidTask(): boolean {
        const amount = this.data.amount || 1;
        const resourcesInCarry = (this.creep.carry as any)[this.data.resourceType!] || 0;
        return resourcesInCarry >= amount;
    }

    isValidTarget(): boolean {
        return true;
    }

    isValid(): boolean {
        // It's necessary to override task.isValid() for tasks which do not have a RoomObject target
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask) {
            return true;
        } else {
            // Switch to parent task if there is one
            let isValid = false;
            if (this.parent) {
                isValid = this.parent.isValid();
            }
            this.finish();
            return isValid;
        }
    }

    work(): number {
        return this.creep.drop(this.data.resourceType as ResourceConstant, this.data.amount);
    }
}
