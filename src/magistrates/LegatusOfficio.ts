import { ArchivistReport, Task, TaskType } from '../interfaces';

/**
 * Legatus Officio - The Taskmaster
 * 
 * Responsibility: Transform observations into actionable tasks
 * Philosophy: Every problem is a task waiting to be solved
 * 
 * The Taskmaster reads the Archivist's report and creates a prioritized
 * work queue. It doesn't care WHO does the work - just WHAT needs doing.
 */
export class LegatusOfficio {
  private roomName: string;
  private taskIdCounter: number = 0;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  /**
   * Analyze the room report and generate prioritized tasks
   */
  public run(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // Priority 1: Emergency Defense
    if (report.hostileThreatLevel > 0) {
      tasks.push(...this.createDefenseTasks(report));
    }

    // Priority 2: Spawn Energy (can't do anything without energy)
    if (report.energyDeficit > 0) {
      tasks.push(...this.createEnergyTasks(report));
    }

    // Priority 3: Tower Maintenance
    if (report.towers.some(t => t.needsRefill)) {
      tasks.push(...this.createTowerRefillTasks(report));
    }

    // Priority 4: Construction
    if (report.constructionSites.length > 0) {
      tasks.push(...this.createConstructionTasks(report));
    }

    // Priority 5: Critical Repairs
    const criticalRepairs = report.repairTargets.filter(r => r.priority > 70);
    if (criticalRepairs.length > 0) {
      tasks.push(...this.createRepairTasks(criticalRepairs));
    }

    // Priority 6: Controller Upgrade
    tasks.push(...this.createUpgradeTasks(report));

    // Priority 7: Non-Critical Repairs
    const minorRepairs = report.repairTargets.filter(r => r.priority <= 70);
    if (minorRepairs.length > 0) {
      tasks.push(...this.createRepairTasks(minorRepairs));
    }

    // Sort by priority (highest first)
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  private createDefenseTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];
    
    report.hostiles.forEach(hostile => {
      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.DEFEND_ROOM,
        priority: 95 + report.hostileThreatLevel,
        targetId: hostile.id,
        targetPos: { x: hostile.pos.x, y: hostile.pos.y, roomName: this.roomName },
        creepsNeeded: Math.ceil(hostile.threatLevel / 10),
        assignedCreeps: []
      });
    });

    return tasks;
  }

  private createEnergyTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // Harvest from sources
    report.sources.forEach(source => {
      if (source.energy > 0 && source.harvestersPresent < source.harvestersNeeded) {
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.HARVEST_ENERGY,
          priority: 85,
          targetId: source.id,
          targetPos: { x: source.pos.x, y: source.pos.y, roomName: this.roomName },
          creepsNeeded: source.harvestersNeeded - source.harvestersPresent,
          assignedCreeps: []
        });
      }
    });

    // DIRECT TRANSFER to spawns/extensions (early game - no containers yet)
    if (report.energyDeficit > 0) {
      // Find spawns and extensions that need energy
      report.spawns.forEach(spawn => {
        const freeCapacity = spawn.energyCapacity - spawn.energy;
        if (freeCapacity > 0) {
          tasks.push({
            id: this.generateTaskId(),
            type: TaskType.REFILL_SPAWN,
            priority: 90, // Higher than harvest - we need energy NOW
            targetId: spawn.id,
            creepsNeeded: 1,
            assignedCreeps: [],
            metadata: {
              energyNeeded: freeCapacity
            }
          });
        }
      });

      // TODO: Add REFILL_EXTENSION tasks when we have extensions
    }

    // Haul energy from containers to spawns/extensions (mid-game onwards)
    report.containers.forEach(container => {
      if (container.store.energy > 100 && report.energyDeficit > 0) {
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.HAUL_ENERGY,
          priority: 80,
          targetId: container.id,
          targetPos: { x: container.pos.x, y: container.pos.y, roomName: this.roomName },
          creepsNeeded: 1,
          assignedCreeps: [],
          metadata: {
            energyAvailable: container.store.energy
          }
        });
      }
    });

    return tasks;
  }

  private createTowerRefillTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    report.towers.forEach(tower => {
      if (tower.needsRefill) {
        const energyNeeded = tower.energyCapacity - tower.energy;
        tasks.push({
          id: this.generateTaskId(),
          type: TaskType.REFILL_TOWER,
          priority: 75,
          targetId: tower.id,
          creepsNeeded: Math.ceil(energyNeeded / 500),
          assignedCreeps: [],
          metadata: {
            energyRequired: energyNeeded
          }
        });
      }
    });

    return tasks;
  }

  private createConstructionTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    report.constructionSites.forEach(site => {
      // Prioritize spawns and towers
      let priority = 60;
      if (site.structureType === STRUCTURE_SPAWN) priority = 85;
      if (site.structureType === STRUCTURE_TOWER) priority = 80;
      if (site.structureType === STRUCTURE_EXTENSION) priority = 70;

      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.BUILD,
        priority: priority,
        targetId: site.id,
        targetPos: { x: site.pos.x, y: site.pos.y, roomName: this.roomName },
        creepsNeeded: Math.ceil((site.progressTotal - site.progress) / 5000),
        assignedCreeps: [],
        metadata: {
          structureType: site.structureType,
          remainingWork: site.progressTotal - site.progress
        }
      });
    });

    return tasks;
  }

  private createRepairTasks(repairTargets: any[]): Task[] {
    const tasks: Task[] = [];

    repairTargets.forEach(target => {
      tasks.push({
        id: this.generateTaskId(),
        type: TaskType.REPAIR,
        priority: target.priority,
        targetId: target.id,
        targetPos: { x: target.pos.x, y: target.pos.y, roomName: this.roomName },
        creepsNeeded: 1,
        assignedCreeps: [],
        metadata: {
          structureType: target.structureType,
          hitsNeeded: target.hitsMax - target.hits
        }
      });
    });

    return tasks;
  }

  private createUpgradeTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];

    // ALWAYS create upgrade tasks - upgrading is core gameplay
    const upgraderShortage = report.controller.upgraderRecommendation - 
                             report.controller.upgraderCount;

    const priority = report.controller.ticksToDowngrade < 5000 ? 90 : 55;
    const creepsNeeded = upgraderShortage > 0 ? upgraderShortage : 1;
    
    tasks.push({
      id: this.generateTaskId(),
      type: TaskType.UPGRADE_CONTROLLER,
      priority: priority,
      targetId: report.controller.id,
      creepsNeeded: creepsNeeded,
      assignedCreeps: []
    });

    return tasks;
  }

  private generateTaskId(): string {
    return `task_${this.roomName}_${Game.time}_${this.taskIdCounter++}`;
  }
}
