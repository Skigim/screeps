/* This is the withdrawal task for non-energy resources. */
import { Task } from '../Task';
import { isStoreStructure, isEnergyStructure } from '../utilities/helpers';

export type withdrawTargetType = Structure | Tombstone;

export class TaskWithdraw extends Task {
    public static taskName = 'withdraw';
    public target: withdrawTargetType | null = null;

    constructor(target: withdrawTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}) {
        super(TaskWithdraw.taskName, target, options);
        // Settings
        this.settings.oneShot = true;
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }

    isValidTask(): boolean {
        const amount = this.data.amount || 1;
        return (_.sum(this.creep.carry) <= this.creep.carryCapacity - amount);
    }

    isValidTarget(): boolean {
        const amount = this.data.amount || 1;
        const target = this.target;
        if (!target) return false;

        if (target instanceof Tombstone || isStoreStructure(target)) {
            return ((target.store as any)[this.data.resourceType!] || 0) >= amount;
        } else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
            return target.energy >= amount;
        } else {
            if (target instanceof StructureLab) {
                return this.data.resourceType === target.mineralType && target.mineralAmount >= amount;
            } else if (target instanceof StructureNuker) {
                return this.data.resourceType === RESOURCE_GHODIUM && target.ghodium >= amount;
            } else if (target instanceof StructurePowerSpawn) {
                return this.data.resourceType === RESOURCE_POWER && target.power >= amount;
            }
        }
        return false;
    }

    work(): number {
        return this.creep.withdraw(this.target!, this.data.resourceType as ResourceConstant, this.data.amount);
    }
}
