import { Task } from '../Task';

export type goToTargetType = { pos: RoomPosition } | RoomPosition;

function hasPos(obj: any): obj is { pos: RoomPosition } {
    return obj.pos !== undefined;
}

export class TaskGoTo extends Task {
    public static taskName = 'goTo';

    constructor(target: goToTargetType, options: TaskOptions = {}) {
        if (hasPos(target)) {
            super(TaskGoTo.taskName, { ref: '', pos: target.pos }, options);
        } else {
            super(TaskGoTo.taskName, { ref: '', pos: target }, options);
        }
        // Settings
        this.settings.targetRange = 1;
    }

    isValidTask(): boolean {
        return !this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange);
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
        return OK;
    }
}
