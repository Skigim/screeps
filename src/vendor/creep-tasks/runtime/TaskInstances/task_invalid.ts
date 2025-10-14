// Invalid task assigned if instantiation fails.
import { Task } from '../Task';

export class TaskInvalid extends Task {
    public static taskName = 'invalid';

    constructor(target: any, options: TaskOptions = {}) {
        super('INVALID', target, options);
    }

    isValidTask(): boolean {
        return false;
    }

    isValidTarget(): boolean {
        return false;
    }

    work(): number {
        return OK;
    }
}
