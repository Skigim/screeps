import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * RepairExecutor - Execute REPAIR tasks
 *
 * Creeps move to damaged structures and repair them
 * Returns COMPLETED when structure is fully repaired or creep is empty
 */
export declare class RepairExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=RepairExecutor.d.ts.map