import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * IdleExecutor - Execute IDLE tasks
 *
 * Default fallback executor for creeps without assigned tasks
 * Moves to a safe parking position near the controller
 * Returns IN_PROGRESS indefinitely until reassigned
 */
export declare class IdleExecutor extends TaskExecutor {
    execute(creep: Creep, _task: Task): TaskResult;
}
//# sourceMappingURL=IdleExecutor.d.ts.map