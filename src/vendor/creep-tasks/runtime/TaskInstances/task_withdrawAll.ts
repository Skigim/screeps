import { Task } from '../Task';

export type withdrawAllTargetType =
        | (Structure & {
                store: StoreDefinition | Store<ResourceConstant, false> | Store<ResourceConstant, true>;
            })
        | Tombstone
        | Ruin;

export class TaskWithdrawAll extends Task {
    public static taskName = 'withdrawAll';

    public get target(): withdrawAllTargetType | null {
        return super.target as withdrawAllTargetType | null;
    }

    constructor(target: withdrawAllTargetType, options: TaskOptions = {}) {
        super(TaskWithdrawAll.taskName, target as any, options);
    }

    isValidTask(): boolean {
        if (typeof this.creep.store?.getFreeCapacity === 'function') {
            return (this.creep.store.getFreeCapacity() ?? 0) > 0;
        }
        return _.sum((this.creep.carry as any)) < this.creep.carryCapacity;
    }

    isValidTarget(): boolean {
        const target = this.target;
        if (!target) {
            return false;
        }
        const store = (target as any).store;
        if (!store) {
            return false;
        }
        if (typeof store.getUsedCapacity === 'function') {
            return (store.getUsedCapacity() ?? 0) > 0;
        }
        return _.sum(store as any) > 0;
    }

    work(): number {
        const target = this.target!;
        const store = (target as any).store;
        if (!store) {
            return -1;
        }
        if (typeof store.getUsedCapacity === 'function') {
            for (const resource of Object.keys(store) as ResourceConstant[]) {
                const amount = store.getUsedCapacity(resource as ResourceConstant);
                if (typeof amount === 'number' && amount > 0) {
                    return this.creep.withdraw(target as any, resource as ResourceConstant);
                }
            }
            const total = store.getUsedCapacity();
            if (typeof total === 'number' && total > 0) {
                const resource = (Object.keys(store) as ResourceConstant[]).find(key =>
                    (store.getUsedCapacity(key) ?? 0) > 0
                );
                if (resource) {
                    return this.creep.withdraw(target as any, resource);
                }
            }
        } else {
            for (const resourceType in store) {
                const amountInStore = store[resourceType] || 0;
                if (amountInStore > 0) {
                    return this.creep.withdraw(target as any, resourceType as ResourceConstant);
                }
            }
        }
        return -1;
    }
}
