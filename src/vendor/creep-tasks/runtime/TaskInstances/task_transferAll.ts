import { Task } from '../Task';

export type transferAllTargetType = StructureStorage | StructureTerminal | StructureContainer;

export class TaskTransferAll extends Task {
    public static taskName = 'transferAll';
    public target: transferAllTargetType | null = null;

    constructor(target: transferAllTargetType, skipEnergy = false, options: TaskOptions = {}) {
        super(TaskTransferAll.taskName, target, options);
        this.data.skipEnergy = skipEnergy;
    }

    isValidTask(): boolean {
        for (const resourceType in this.creep.carry) {
            if (this.data.skipEnergy && resourceType === RESOURCE_ENERGY) {
                continue;
            }
            const amountInCarry = (this.creep.carry as any)[resourceType] || 0;
            if (amountInCarry > 0) {
                return true;
            }
        }
        return false;
    }

    isValidTarget(): boolean {
        return !!(this.target && _.sum(this.target.store) < this.target.storeCapacity);
    }

    work(): number {
        for (const resourceType in this.creep.carry) {
            if (this.data.skipEnergy && resourceType === RESOURCE_ENERGY) {
                continue;
            }
            const amountInCarry = (this.creep.carry as any)[resourceType] || 0;
            if (amountInCarry > 0) {
                return this.creep.transfer(this.target!, resourceType as ResourceConstant);
            }
        }
        return -1;
    }
}
