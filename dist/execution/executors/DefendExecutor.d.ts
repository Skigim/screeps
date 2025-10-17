import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * DefendExecutor - Execute DEFEND_ROOM tasks
 *
 * Creeps move to hostile creeps and attack them
 * Uses melee attack if available, otherwise ranged attack
 * Returns COMPLETED when no hostiles remain
 */
export declare class DefendExecutor extends TaskExecutor {
    execute(creep: Creep, task: Task): TaskResult;
}
//# sourceMappingURL=DefendExecutor.d.ts.map