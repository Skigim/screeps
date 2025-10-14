/* eslint-disable @typescript-eslint/no-var-requires */

type TasksConstructor = any;

const createFallback = (): TasksConstructor => {
	const fallback = class StubTasks {
		static chain(tasks: any[] = []): any | null {
			return tasks.length > 0 ? tasks[0] : null;
		}
	} as TasksConstructor;

	const taskMethods = [
		'attack',
		'build',
		'claim',
		'dismantle',
		'drop',
		'fortify',
		'getBoosted',
		'getRenewed',
		'goTo',
		'goToRoom',
		'harvest',
		'heal',
		'meleeAttack',
		'pickup',
		'rangedAttack',
		'repair',
		'reserve',
		'signController',
		'transfer',
		'transferAll',
		'upgrade',
		'withdraw',
		'withdrawAll'
	] as const;

	for (const method of taskMethods) {
		(fallback as any)[method] = (..._args: unknown[]): never => {
			throw new Error(`Tasks.${method} is unavailable`);
		};
	}

	return fallback;
};

const loadTasks = (): TasksConstructor => {
	if (typeof Game === 'undefined') {
		return createFallback();
	}

	try {
		require('./runtime/prototypes');
		const tasksModule = require('./runtime/Tasks');
		return tasksModule.Tasks || tasksModule.default;
	} catch (error) {
		console.log(`[Vendor] creep-tasks offline (${(error as Error).message})`);
		return createFallback();
	}
};

const Tasks = loadTasks();

export { Tasks };
export default Tasks;
