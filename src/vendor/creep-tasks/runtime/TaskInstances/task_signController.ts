import { Task } from '../Task';

export type signControllerTargetType = StructureController;

export class TaskSignController extends Task {
    public static taskName = 'signController';
    public target: signControllerTargetType | null = null;

    constructor(target: signControllerTargetType, signature = 'Your signature here', options: TaskOptions = {}) {
        super(TaskSignController.taskName, target, options);
        this.data.signature = signature;
    }

    isValidTask(): boolean {
        return true;
    }

    isValidTarget(): boolean {
        const controller = this.target;
        return !!(controller && (!controller.sign || controller.sign.text !== this.data.signature));
    }

    work(): number {
        return this.creep.signController(this.target!, this.data.signature!);
    }
}
