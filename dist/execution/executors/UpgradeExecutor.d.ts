import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * UpgradeExecutor - Execute UPGRADE_CONTROLLER tasks
 *
 * Creeps move to the room controller and upgrade it
 * Returns COMPLETED when creep is empty of energy
 */
export declare class UpgradeExecutor extends TaskExecutor {
    execute(creep: Creep, _task: Task): TaskResult;
}
//# sourceMappingURL=UpgradeExecutor.d.ts.map