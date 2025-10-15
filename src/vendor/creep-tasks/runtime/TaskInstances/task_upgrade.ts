import { Task } from '../Task';

export type upgradeTargetType = StructureController;

export class TaskUpgrade extends Task {
    public static taskName = 'upgrade';

    public get target(): upgradeTargetType | null {
        return super.target as upgradeTargetType | null;
    }

    constructor(target: upgradeTargetType, options: TaskOptions = {}) {
        super(TaskUpgrade.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }

    isValidTask(): boolean {
        if (this.creep.store) {
            return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
        const legacyCarry = (this.creep as Creep & { carry?: { energy?: number } }).carry;
        return (legacyCarry?.energy ?? 0) > 0;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.my);
    }

    work(): number {
        const result = this.creep.upgradeController(this.target!);
        if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_INVALID_TARGET) {
            this.finish();
            return result;
        }
        if (result === OK) {
            const remaining = this.creep.store
                ? this.creep.store.getUsedCapacity(RESOURCE_ENERGY)
                : (this.creep as Creep & { carry?: { energy?: number } }).carry?.energy ?? 0;
            if (!remaining) {
                this.finish();
            }
        }
        return result;
    }
}
