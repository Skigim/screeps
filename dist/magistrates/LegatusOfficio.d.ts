import { ArchivistReport, Task } from '../interfaces';
/**
 * Legatus Officio - The Taskmaster
 *
 * Responsibility: Transform observations into actionable tasks
 * Philosophy: Every problem is a task waiting to be solved
 *
 * The Taskmaster reads the Archivist's report and creates a prioritized
 * work queue. It doesn't care WHO does the work - just WHAT needs doing.
 */
export declare class LegatusOfficio {
    private roomName;
    constructor(roomName: string);
    /**
     * Analyze the room report and generate prioritized tasks
     */
    run(report: ArchivistReport): Task[];
    private createDefenseTasks;
    private createEnergyTasks;
    private createTowerRefillTasks;
    private createConstructionTasks;
    private createRepairTasks;
    private createUpgradeTasks;
    private createEmergencyWithdrawalTasks;
}
//# sourceMappingURL=LegatusOfficio.d.ts.map