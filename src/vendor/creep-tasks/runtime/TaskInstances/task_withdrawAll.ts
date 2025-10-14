import { Task } from '../Task';

export type withdrawAllTargetType = StructureStorage | StructureTerminal | StructureContainer | Tombstone;

export class TaskWithdrawAll extends Task {
    public static taskName = 'withdrawAll';
    public target: withdrawAllTargetType | null = null;

    constructor(target: withdrawAllTargetType, options: TaskOptions = {}) {
        super(TaskWithdrawAll.taskName, target, options);
    }

    isValidTask(): boolean {
        return (_.sum(this.creep.carry) < this.creep.carryCapacity);
    }

    isValidTarget(): boolean {
        return !!(this.target && _.sum(this.target.store) > 0);
    }

    work(): number {
        for (const resourceType in this.target!.store) {
            const amountInStore = (this.target!.store as any)[resourceType] || 0;
            if (amountInStore > 0) {
                return this.creep.withdraw(this.target!, resourceType as ResourceConstant);
            }
        }
        return -1;
    }
}
