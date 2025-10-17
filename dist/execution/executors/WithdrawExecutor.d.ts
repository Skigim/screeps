import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * WithdrawExecutor - Execute WITHDRAW_ENERGY tasks
 *
 * Creeps move to containers/storage and withdraw energy
 * Returns COMPLETED when creep is full or structure is empty
 */
export declare class WithdrawExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=WithdrawExecutor.d.ts.map