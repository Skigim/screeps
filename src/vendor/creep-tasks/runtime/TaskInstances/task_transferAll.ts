import { Task } from '../Task';

export type transferAllTargetType = Structure & {
    store: StoreDefinition | Store<ResourceConstant, false> | Store<ResourceConstant, true>;
    storeCapacity?: number;
};

export class TaskTransferAll extends Task {
    public static taskName = 'transferAll';

    public get target(): transferAllTargetType | null {
        return super.target as transferAllTargetType | null;
    }

    constructor(target: transferAllTargetType, skipEnergy = false, options: TaskOptions = {}) {
        super(TaskTransferAll.taskName, target as any, options);
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
        if (!this.target) {
            return false;
        }
    const store = this.target.store as any;
        if (store && typeof store.getFreeCapacity === 'function') {
            return (store.getFreeCapacity() ?? 0) > 0;
        }
        if (typeof this.target.storeCapacity === 'number') {
            return _.sum(store as any) < this.target.storeCapacity;
        }
        return false;
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
