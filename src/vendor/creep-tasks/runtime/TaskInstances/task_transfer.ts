import { Task } from '../Task';
import { isStoreStructure, isEnergyStructure } from '../utilities/helpers';

export type transferTargetType = Structure | Creep;

export class TaskTransfer extends Task {
    public static taskName = 'transfer';

    public get target(): transferTargetType | null {
        return super.target as transferTargetType | null;
    }

    constructor(target: transferTargetType, resourceType: ResourceConstant = RESOURCE_ENERGY, amount: number | undefined = undefined, options: TaskOptions = {}) {
        super(TaskTransfer.taskName, target, options);
        // Settings
        this.settings.oneShot = true;
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }

    isValidTask(): boolean {
        const amount = this.data.amount || 1;
        const resourcesInCarry = (this.creep.carry as any)[this.data.resourceType!] || 0;
        return resourcesInCarry >= amount;
    }

    isValidTarget(): boolean {
        const amount = this.data.amount || 1;
        const target = this.target;
        if (!target) return false;

        if (target instanceof Creep) {
            const freeCapacity = target.store.getFreeCapacity(this.data.resourceType as ResourceConstant);
            return (freeCapacity ?? 0) >= amount;
        } else if (isStoreStructure(target)) {
            const freeCapacity = target.store.getFreeCapacity(this.data.resourceType as ResourceConstant);
            return (freeCapacity ?? 0) >= amount;
        } else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
            return target.energy <= target.energyCapacity - amount;
        } else {
            if (target instanceof StructureLab) {
                return (target.mineralType === this.data.resourceType || !target.mineralType) &&
                    target.mineralAmount <= target.mineralCapacity - amount;
            } else if (target instanceof StructureNuker) {
                return this.data.resourceType === RESOURCE_GHODIUM &&
                    target.ghodium <= target.ghodiumCapacity - amount;
            } else if (target instanceof StructurePowerSpawn) {
                return this.data.resourceType === RESOURCE_POWER &&
                    target.power <= target.powerCapacity - amount;
            }
        }
        return false;
    }

    work(): number {
        return this.creep.transfer(this.target!, this.data.resourceType as ResourceConstant, this.data.amount);
    }
}
