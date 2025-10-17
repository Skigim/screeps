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

    // Priority 8: Emergency Spawn Withdrawal (when no energy sources available)
    // Only if we have time before needing to spawn replacements
    tasks.push(...this.createEmergencyWithdrawalTasks(report));

    // Sort by priority (highest first)
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  private createDefenseTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];
    
    report.hostiles.forEach(hostile => {
      tasks.push({
        id: `defend_${hostile.id}`, // Stable ID based on hostile
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

    // Pickup dropped energy (highest priority - don't waste energy)
    const room = Game.rooms[this.roomName];
    if (room) {
      const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
        filter: (resource) => resource.resourceType === RESOURCE_ENERGY && resource.amount > 50
      });
      
      droppedResources.forEach(resource => {
        tasks.push({
          id: `pickup_${resource.id}`, // Stable ID based on resource
          type: TaskType.PICKUP_ENERGY,
          priority: 88, // Higher than harvest, lower than refill
          targetId: resource.id,
          targetPos: { x: resource.pos.x, y: resource.pos.y, roomName: this.roomName },
          creepsNeeded: 1,
          assignedCreeps: [],
          metadata: {
            energyAmount: resource.amount
          }
        });
      });
    }

    // Harvest from sources
    report.sources.forEach(source => {
      if (source.energy > 0 && source.harvestersPresent < source.harvestersNeeded) {
        tasks.push({
          id: `harvest_${source.id}`, // Stable ID based on source
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
            id: `refill_spawn_${spawn.id}`, // Stable ID based on spawn
            type: TaskType.REFILL_SPAWN,
            priority: 90, // Higher than harvest - we need energy NOW
            targetId: spawn.id,
            creepsNeeded: 99, // Accept all haulers - proximity will optimize
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
          id: `haul_${container.id}`, // Stable ID based on container
          type: TaskType.HAUL_ENERGY,
          priority: 80,
          targetId: container.id,
          targetPos: { x: container.pos.x, y: container.pos.y, roomName: this.roomName },
          creepsNeeded: 99, // Multiple haulers acceptable - proximity optimizes
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
          id: `refill_tower_${tower.id}`, // Stable ID based on tower
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
        id: `build_${site.id}`, // Stable ID based on construction site
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
        id: `repair_${target.id}`, // Stable ID based on structure
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
    // The controller can handle unlimited upgraders, so set a high limit
    const upgraderShortage = report.controller.upgraderRecommendation - 
                             report.controller.upgraderCount;

    const priority = report.controller.ticksToDowngrade < 5000 ? 90 : 55;
    const creepsNeeded = upgraderShortage > 0 ? upgraderShortage : 99; // Accept all idle creeps with energy
    
    tasks.push({
      id: `upgrade_${report.controller.id}`, // Stable ID based on controller
      type: TaskType.UPGRADE_CONTROLLER,
      priority: priority,
      targetId: report.controller.id,
      creepsNeeded: creepsNeeded, // Controller can handle many upgraders
      assignedCreeps: []
    });

    return tasks;
  }

  private createEmergencyWithdrawalTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];
    const room = Game.rooms[this.roomName];
    if (!room) return tasks;

    // Check if we have enough energy sources available (harvest/pickup tasks)
    // If harvest sources are saturated and no pickup available, allow spawn withdrawal
    const harvestTasksAvailable = report.sources.some(s => s.harvestersPresent < s.harvestersNeeded);
    
    // Check for dropped energy
    const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
      filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });
    const pickupAvailable = droppedResources.length > 0;

    // Only create withdrawal tasks if normal energy sources are saturated
    if (harvestTasksAvailable || pickupAvailable) {
      return tasks; // Normal energy acquisition available, don't use spawn energy
    }

    // Find the shortest TTL among our creeps (for spawn-locking prevention)
    const creeps = room.find(FIND_MY_CREEPS);
    const shortestTTL = creeps.reduce((min, creep) => {
      const ttl = creep.ticksToLive || 1500;
      return Math.min(min, ttl);
    }, 1500);

    // Calculate spawn time needed for replacement (body parts * 3 ticks)
    // Assume worst case: 10 parts = 30 ticks
    const spawnTimeNeeded = 30;
    const safetyBuffer = 50; // Extra buffer for movement/assignment

    // Only allow spawn withdrawal if we have time before needing to spawn
    if (shortestTTL < spawnTimeNeeded + safetyBuffer) {
      // Too close to needing spawn - don't lock it
      return tasks;
    }

    // Safe to withdraw from spawn for emergency energy
    report.spawns.forEach(spawn => {
      if (spawn.energy > 100) { // Only if spawn has energy to spare
        tasks.push({
          id: `withdraw_spawn_${spawn.id}`, // Stable ID based on spawn
          type: TaskType.WITHDRAW_ENERGY,
          priority: 15, // Low priority - only when harvest/pickup unavailable
          targetId: spawn.id,
          creepsNeeded: 2, // Limit to prevent spawn drainage
          assignedCreeps: [],
          metadata: {
            resourceType: RESOURCE_ENERGY,
            emergencyWithdrawal: true
          }
        });
      }
    });

    return tasks;
  }
}
