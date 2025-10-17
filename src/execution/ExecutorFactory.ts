import { TaskType } from '../interfaces';
import { TaskExecutor } from './TaskExecutor';
import { HarvestExecutor } from './executors/HarvestExecutor';
import { PickupExecutor } from './executors/PickupExecutor';
import { TransferExecutor } from './executors/TransferExecutor';
import { UpgradeExecutor } from './executors/UpgradeExecutor';
import { BuildExecutor } from './executors/BuildExecutor';
import { RepairExecutor } from './executors/RepairExecutor';
import { WithdrawExecutor } from './executors/WithdrawExecutor';
import { DefendExecutor } from './executors/DefendExecutor';
import { IdleExecutor } from './executors/IdleExecutor';

/**
 * Factory for task executors
 * 
 * Responsibility: Provide the correct TaskExecutor for any given TaskType
 * Strategy: Registry pattern - executors register themselves by task type
 * 
 * This factory maintains a registry of TaskExecutor instances, one per TaskType.
 * Specific executors are registered as they are implemented (Phase IV-B, Phase IV-C, etc.)
 */
export class ExecutorFactory {
  /** Registry mapping task types to their executors */
  private static executors: Map<TaskType, TaskExecutor> = new Map();

  /**
   * Get the executor responsible for a specific task type
   * 
   * Initializes executor registry on first use
   * 
   * @param taskType - The type of task to get an executor for
   * @returns TaskExecutor instance or null if not yet implemented
   */
  public static getExecutor(taskType: TaskType): TaskExecutor | null {
    // Initialize executors on first use
    if (this.executors.size === 0) {
      this.initializeExecutors();
    }

    return this.executors.get(taskType) || null;
  }

  /**
   * Register an executor for a task type
   * 
   * Called during executor initialization phases to populate the registry
   * Multiple registrations for the same TaskType will replace the previous executor
   * 
   * @param taskType - The task type this executor handles
   * @param executor - The executor instance
   */
  public static registerExecutor(taskType: TaskType, executor: TaskExecutor): void {
    this.executors.set(taskType, executor);
  }

  /**
   * Initialize the executor registry
   * 
   * This is called on first getExecutor() call
   * Specific executors will be registered as they are created in subsequent phases:
   * - Phase IV-B: Agent Secundus creates Harvest, Transfer, Upgrade executors
   * - Phase IV-C: Additional executor implementations
   */
  private static initializeExecutors(): void {
    // Create executor instances
    const harvestExecutor = new HarvestExecutor();
    const pickupExecutor = new PickupExecutor();
    const transferExecutor = new TransferExecutor();
    const upgradeExecutor = new UpgradeExecutor();
    const buildExecutor = new BuildExecutor();
    const repairExecutor = new RepairExecutor();
    const withdrawExecutor = new WithdrawExecutor();
    const defendExecutor = new DefendExecutor();
    const idleExecutor = new IdleExecutor();

    // Register energy management executors
    this.registerExecutor(TaskType.HARVEST_ENERGY, harvestExecutor);
    this.registerExecutor(TaskType.PICKUP_ENERGY, pickupExecutor);
    this.registerExecutor(TaskType.WITHDRAW_ENERGY, withdrawExecutor);
    this.registerExecutor(TaskType.HAUL_ENERGY, transferExecutor); // Same logic as transfer

    // Register construction & repair executors
    this.registerExecutor(TaskType.BUILD, buildExecutor);
    this.registerExecutor(TaskType.REPAIR, repairExecutor);

    // Register controller operations
    this.registerExecutor(TaskType.UPGRADE_CONTROLLER, upgradeExecutor);

    // Register logistics executors (all use transfer logic)
    this.registerExecutor(TaskType.REFILL_SPAWN, transferExecutor);
    this.registerExecutor(TaskType.REFILL_EXTENSION, transferExecutor);
    this.registerExecutor(TaskType.REFILL_TOWER, transferExecutor);

    // Register defense executor
    this.registerExecutor(TaskType.DEFEND_ROOM, defendExecutor);
    this.registerExecutor(TaskType.TOWER_DEFENSE, defendExecutor);

    // Register special operations
    this.registerExecutor(TaskType.CLAIM_CONTROLLER, upgradeExecutor); // Temporary - will be updated
    this.registerExecutor(TaskType.RESERVE_CONTROLLER, upgradeExecutor); // Temporary - will be updated
    this.registerExecutor(TaskType.SCOUT_ROOM, idleExecutor); // Temporary - will be updated

    // Register default idle
    this.registerExecutor(TaskType.IDLE, idleExecutor);

    console.log(`✅ ExecutorFactory initialized with ${this.executors.size} executors`);
  }

  /**
   * Get count of registered executors (useful for debugging)
   */
  public static getExecutorCount(): number {
    return this.executors.size;
  }

  /**
   * Get list of registered task types (useful for debugging)
   */
  public static getRegisteredTaskTypes(): TaskType[] {
    return Array.from(this.executors.keys());
  }
}
