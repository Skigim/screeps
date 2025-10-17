import { TaskExecutor } from '../TaskExecutor';
import { Task } from '../../interfaces';
import { TaskResult } from '../TaskResult';
/**
 * RenewExecutor - Handles RENEW_CREEP tasks
 *
 * Responsibility: Keep creeps alive by renewing them at spawns
 * Philosophy: Use excess spawn energy to extend creep lifespan
 *
 * When there are no urgent tasks, idle creeps should renew themselves
 * to avoid dying and wasting the energy that was used to spawn them.
 */
export declare class RenewExecutor extends TaskExecutor {
    /**
     * Execute renewal for a creep
     */
    execute(creep: Creep, task: Task): TaskResult;
    /**
     * Calculate approximate renewal cost based on body parts
     */
    private calculateRenewCost;
}
//# sourceMappingURL=RenewExecutor.d.ts.map