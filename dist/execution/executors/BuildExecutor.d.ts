import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * BuildExecutor - Execute BUILD tasks
 *
 * Creeps move to construction sites and build structures
 * Returns COMPLETED when construction site is finished or creep is empty
 */
export declare class BuildExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=BuildExecutor.d.ts.map