import "./runtime";
import type { Task as RuntimeTask } from "./runtime/Task";
import { initializeTask } from "./runtime/utilities/initializer";

type TaskName = "harvest" | "transfer" | "upgrade" | "goTo";

export type TaskMemory = {
	name: TaskName;
	targetId?: Id<any>;
	resourceType?: ResourceConstant;
	amount?: number;
	range?: number;
};

export interface TaskInstance<TTarget = any> {
	readonly name: TaskName;
	readonly proto: TaskMemory;
	assign(creep: Creep): void;
	run(): ScreepsReturnCode;
	isValid(): boolean;
}

type TaskFactory = (proto: TaskMemory) => TaskInstance;

type AnyTaskInstance = TaskInstance | RuntimeTask | ITask;

const isRoomObject = (value: unknown): value is RoomObject => {
	return typeof value === "object" && value !== null && "pos" in (value as Record<string, unknown>);
};

const MOVE_OPTS: MoveToOpts = { reusePath: 5, visualizePathStyle: { stroke: "#ffaa00" } };

const registry = new Map<TaskName, TaskFactory>();

const isRuntimeProto = (value: TaskMemory | protoTask): value is protoTask => {
	return value !== null && typeof value === "object" && "_creep" in value && "_target" in value;
};

const getTargetById = <T extends _HasId>(id?: Id<T>): T | null => {
	if (typeof Game === "undefined" || !id) {
		return null;
	}
	return (Game.getObjectById(id) as T | null) ?? null;
};

const clearTask = (creep: Creep): void => {
	delete (creep.memory as CreepMemory & { task?: TaskMemory | protoTask }).task;
	(creep as Creep & { _task?: AnyTaskInstance | null })._task = null;
};

abstract class BaseTask<TTarget extends RoomObject | RoomPosition> implements TaskInstance<TTarget> {
	protected creep: (Creep & { _task?: AnyTaskInstance | null }) | null = null;

	public constructor(public readonly proto: TaskMemory) {}

	public get name(): TaskName {
		return this.proto.name;
	}

	public assign(creep: Creep): void {
		this.creep = creep as Creep & { _task?: AnyTaskInstance | null };
		this.creep._task = this;
	}

	public run(): ScreepsReturnCode {
		if (!this.creep) {
			return ERR_BUSY;
		}

		const target = this.resolveTarget();
		if (!target) {
			this.onTargetMissing();
			return ERR_INVALID_TARGET;
		}

		if (!this.ensureInRange(target)) {
			return this.creep.moveTo(target, MOVE_OPTS);
		}

		const result = this.perform(target);
		this.afterRun(result, target);
		return result;
	}

	public isValid(): boolean {
		if (!this.creep) {
			return false;
		}

		const target = this.resolveTarget();
		if (!target) {
			this.onTargetMissing();
			return false;
		}

		return true;
	}

	protected get range(): number {
		return this.proto.range ?? 1;
	}

	protected ensureInRange(target: TTarget): boolean {
		if (!this.creep) {
			return false;
		}

		if (target instanceof RoomPosition) {
			return target.isEqualTo(this.creep.pos);
		}

		return this.creep.pos.inRangeTo(target, this.range);
	}

	protected onTargetMissing(): void {
		if (this.creep) {
			clearTask(this.creep);
		}
	}

	protected complete(): void {
		if (this.creep) {
			clearTask(this.creep);
		}
	}

	protected abstract resolveTarget(): TTarget | null;
	protected abstract perform(target: TTarget): ScreepsReturnCode;
	protected afterRun(_result: ScreepsReturnCode, _target: TTarget): void {}
}

class HarvestTask extends BaseTask<Source> {
	public static readonly taskName: TaskName = "harvest";

	public constructor(target: Source);
	public constructor(proto: TaskMemory);
	public constructor(targetOrProto: Source | TaskMemory) {
		super(
			isRoomObject(targetOrProto)
				? { name: HarvestTask.taskName, targetId: (targetOrProto as Source).id, range: 1 }
				: targetOrProto
		);
	}

	protected resolveTarget(): Source | null {
		return getTargetById<Source>(this.proto.targetId as Id<Source> | undefined);
	}

	protected perform(target: Source): ScreepsReturnCode {
		if (!this.creep) {
			return ERR_BUSY;
		}

		if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			this.complete();
			return OK;
		}

		return this.creep.harvest(target);
	}

	protected afterRun(result: ScreepsReturnCode, target: Source): void {
		if (!this.creep) {
			return;
		}

		if (result === OK) {
			if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || target.energy === 0) {
				this.complete();
			}
			return;
		}

		if (
			result === ERR_NOT_ENOUGH_RESOURCES ||
			result === ERR_INVALID_TARGET ||
			result === ERR_NO_BODYPART ||
			result === ERR_TIRED
		) {
			this.complete();
		}
	}
}

class TransferTask extends BaseTask<StructureSpawn | StructureExtension> {
	public static readonly taskName: TaskName = "transfer";

	public constructor(target: StructureSpawn | StructureExtension, resourceType?: ResourceConstant, amount?: number);
	public constructor(proto: TaskMemory);
	public constructor(
		targetOrProto: StructureSpawn | StructureExtension | TaskMemory,
		resourceType: ResourceConstant = RESOURCE_ENERGY,
		amount?: number
	) {
		super(
			isRoomObject(targetOrProto)
				? {
					name: TransferTask.taskName,
					targetId: (targetOrProto as Structure).id,
					range: 1,
					resourceType,
					amount
				 }
				: targetOrProto
		);
	}

	protected resolveTarget(): StructureSpawn | StructureExtension | null {
		const target = getTargetById<Structure>(this.proto.targetId as Id<Structure> | undefined);
		if (!target) {
			return null;
		}
		if (target.structureType === STRUCTURE_SPAWN) {
			return target as StructureSpawn;
		}
		if (target.structureType === STRUCTURE_EXTENSION) {
			return target as StructureExtension;
		}
		return null;
	}

	protected perform(target: StructureSpawn | StructureExtension): ScreepsReturnCode {
		if (!this.creep) {
			return ERR_BUSY;
		}

		const resourceType = this.proto.resourceType ?? RESOURCE_ENERGY;
		if (this.creep.store.getUsedCapacity(resourceType) === 0) {
			this.complete();
			return ERR_NOT_ENOUGH_ENERGY;
		}

		return this.creep.transfer(target as Structure, resourceType, this.proto.amount);
	}

	protected afterRun(result: ScreepsReturnCode, target: Structure): void {
		if (!this.creep) {
			return;
		}

		if (result === OK || result === ERR_FULL || result === ERR_INVALID_TARGET || result === ERR_NOT_ENOUGH_ENERGY) {
			this.complete();
			return;
		}

		if (target instanceof StructureSpawn || target instanceof StructureExtension) {
			const store = target.store as Store<ResourceConstant, false> | undefined;
			if (store && store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
				this.complete();
			}
		}
	}
}

class UpgradeTask extends BaseTask<StructureController> {
	public static readonly taskName: TaskName = "upgrade";

	public constructor(target: StructureController);
	public constructor(proto: TaskMemory);
	public constructor(targetOrProto: StructureController | TaskMemory) {
		super(
			isRoomObject(targetOrProto)
				? { name: UpgradeTask.taskName, targetId: (targetOrProto as StructureController).id, range: 3 }
				: targetOrProto
		);
	}

	protected resolveTarget(): StructureController | null {
		return getTargetById<StructureController>(this.proto.targetId as Id<StructureController> | undefined);
	}

	protected perform(target: StructureController): ScreepsReturnCode {
		if (!this.creep) {
			return ERR_BUSY;
		}

		if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			this.complete();
			return ERR_NOT_ENOUGH_ENERGY;
		}

		return this.creep.upgradeController(target);
	}

	protected afterRun(result: ScreepsReturnCode, _target: StructureController): void {
		if (!this.creep) {
			return;
		}

		if (result === OK && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			this.complete();
			return;
		}

		if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_INVALID_TARGET || result === ERR_NO_BODYPART) {
			this.complete();
		}
	}
}

registry.set(HarvestTask.taskName, proto => new HarvestTask(proto));
registry.set(TransferTask.taskName, proto => new TransferTask(proto));
registry.set(UpgradeTask.taskName, proto => new UpgradeTask(proto));

const instantiateTask = (creep: Creep, proto: TaskMemory): TaskInstance | null => {
	const factory = registry.get(proto.name);
	if (!factory) {
		return null;
	}
	const task = factory(proto);
	task.assign(creep);
	return task;
};

const installPrototypes = (): void => {
	if (typeof Creep === "undefined") {
		return;
	}

	const creepProto = Creep.prototype as Creep & { _task?: AnyTaskInstance | null; runTask?: () => ScreepsReturnCode };
	if (!Object.getOwnPropertyDescriptor(creepProto, "task")) {
		Object.defineProperty(creepProto, "task", {
			get(this: Creep & { _task?: AnyTaskInstance | null }): AnyTaskInstance | null {
				if (this._task) {
					return this._task;
				}
				const stored = (this.memory as CreepMemory & { task?: TaskMemory | protoTask }).task;
				if (!stored) {
					return null;
				}
				if (isRuntimeProto(stored)) {
					const runtimeTask = initializeTask(stored);
					runtimeTask.creep = this;
					this._task = runtimeTask;
					return runtimeTask;
				}
				const task = instantiateTask(this, stored as TaskMemory);
				if (!task) {
					delete (this.memory as CreepMemory & { task?: TaskMemory | protoTask }).task;
					return null;
				}
				return task;
			},
			set(this: Creep & { _task?: AnyTaskInstance | null }, task: AnyTaskInstance | null) {
				if (!task) {
					clearTask(this);
					return;
				}
				if (typeof (task as TaskInstance).assign === "function") {
					(task as TaskInstance).assign(this);
				} else if ((task as RuntimeTask).creep !== this) {
					(task as RuntimeTask).creep = this;
				}
				(this.memory as CreepMemory & { task?: TaskMemory | protoTask }).task = task.proto as TaskMemory | protoTask;
				this._task = task;
			}
		});
	}

	if (typeof creepProto.runTask !== "function") {
		creepProto.runTask = function runTask(this: Creep & { task?: AnyTaskInstance | null }): ScreepsReturnCode {
			const task = this.task;
			if (!task) {
				return ERR_INVALID_TARGET;
			}
			const result = task.run();
			return typeof result === "number" ? (result as ScreepsReturnCode) : OK;
		};
	}
};

installPrototypes();

class TasksFacade {
	public chain(tasks: TaskInstance[] = []): TaskInstance | null {
		return tasks.length > 0 ? tasks[0] : null;
	}

	public harvest(target: Source): TaskInstance {
		return new HarvestTask(target);
	}

	public transfer(
		target: StructureSpawn | StructureExtension,
		resourceType: ResourceConstant = RESOURCE_ENERGY,
		amount?: number
	): TaskInstance {
		return new TransferTask(target, resourceType, amount);
	}

	public upgrade(target: StructureController): TaskInstance {
		return new UpgradeTask(target);
	}
}

const Tasks = new TasksFacade();

export { Tasks };
export default Tasks;
