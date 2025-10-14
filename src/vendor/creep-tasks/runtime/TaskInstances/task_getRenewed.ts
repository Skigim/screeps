import { Task } from '../Task';

export type getRenewedTargetType = StructureSpawn;

export class TaskGetRenewed extends Task {
    public static taskName = 'getRenewed';
    public target: getRenewedTargetType | null = null;

    constructor(target: getRenewedTargetType, options: TaskOptions = {}) {
        super(TaskGetRenewed.taskName, target, options);
    }

    isValidTask(): boolean {
        const hasClaimPart = _.filter(this.creep.body, (part: BodyPartDefinition) => part.type === CLAIM).length > 0;
        const lifetime = hasClaimPart ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
        return this.creep.ticksToLive !== undefined && this.creep.ticksToLive < 0.9 * lifetime;
    }

    isValidTarget(): boolean {
        return !!(this.target && this.target.my);
    }

    work(): number {
        return this.target!.renewCreep(this.creep);
    }
}
