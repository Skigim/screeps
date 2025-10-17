import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * TransferExecutor - Execute energy transfer tasks
 *
 * Handles: REFILL_SPAWN, REFILL_EXTENSION, REFILL_TOWER tasks
 * Creeps move to target structure and transfer energy
 * Returns COMPLETED when creep is empty or structure is full
 */
export declare class TransferExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=TransferExecutor.d.ts.map