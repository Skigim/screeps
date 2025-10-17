import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * PickupExecutor - Execute PICKUP_ENERGY tasks
 *
 * Creeps move to dropped energy and pick it up
 * Returns COMPLETED when creep is full or energy is gone
 */
export declare class PickupExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=PickupExecutor.d.ts.map