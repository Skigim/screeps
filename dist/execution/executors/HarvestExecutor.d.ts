import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * HarvestExecutor - Execute HARVEST_ENERGY tasks
 *
 * Creeps move to energy sources and harvest energy
 * Returns COMPLETED when creep is full or source is empty
 */
export declare class HarvestExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=HarvestExecutor.d.ts.map