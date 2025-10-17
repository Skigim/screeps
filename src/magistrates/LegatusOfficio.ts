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
   * Check if economy bootstrap phase is complete
   * Bootstrap = harvesters + haulers established
   */
  private isEconomyBootstrapped(): boolean {
    const room = Game.rooms[this.roomName];
    if (!room) return false;
    
    const creeps = Object.values(Game.creeps).filter(c => c.memory.room === this.roomName);
    const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
    const haulerCount = creeps.filter(c => c.memory.role === 'hauler').length;
    
    const sources = room.find(FIND_SOURCES);
    const harvestersReady = harvesterCount >= sources.length;
    const haulersReady = haulerCount >= 2;
    
    return harvestersReady && haulersReady;
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
          priority: 84, // Just below BUILD - pickup energy to use for construction
          targetId: resource.id,
          targetPos: { x: resource.pos.x, y: resource.pos.y, roomName: this.roomName },
          creepsNeeded: 1,
          assignedCreeps: [],
          requiredParts: [CARRY], // Need CARRY to pick up resources
          metadata: {
            energyAmount: resource.amount
          }
        });
      });
    }

    // Harvest from sources (for dedicated harvesters only)
    // ALWAYS create harvest tasks - harvesters stay permanently assigned
    // Priority: Lower than BUILD - we only harvest to GET energy FOR building
    report.sources.forEach(source => {
      // Create task if source has energy OR if source exists (harvesters wait at empty sources)
      // Don't check harvestersPresent - we need the task to persist for assigned harvesters
      tasks.push({
        id: `harvest_${source.id}`, // Stable ID based on source
        type: TaskType.HARVEST_ENERGY,
        priority: 80, // Below BUILD (85+), ensures dedicated harvesters only
        targetId: source.id,
        targetPos: { x: source.pos.x, y: source.pos.y, roomName: this.roomName },
        creepsNeeded: source.harvestersNeeded, // Total needed, not shortage
        assignedCreeps: [],
        requiredParts: [WORK] // Need WORK to harvest
      });
    });

    // DIRECT TRANSFER to spawns/extensions (early game - no containers yet)
    if (report.energyDeficit > 0) {
      // Find spawns that need energy (check actual spawn capacity, not room capacity)
      report.spawns.forEach(spawn => {
        const spawnObj = Game.getObjectById(spawn.id as Id<StructureSpawn>);
        if (!spawnObj) return;
        
        const freeCapacity = spawnObj.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeCapacity > 0) {
          // BOOTSTRAP MODE: Highest priority during bootstrap - establish supply chain first
          const bootstrapped = this.isEconomyBootstrapped();
          const priority = bootstrapped ? 82 : 98; // CRITICAL during bootstrap
          
          tasks.push({
            id: `refill_spawn_${spawn.id}`, // Stable ID based on spawn
            type: TaskType.REFILL_SPAWN,
            priority: priority, // Below BUILD normally, HIGHEST during bootstrap
            targetId: spawn.id,
            creepsNeeded: Math.ceil(freeCapacity / 50), // 1 creep per 50 energy needed
            assignedCreeps: [],
            requiredParts: [CARRY], // Need CARRY to transfer energy
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
          priority: 83, // Just below BUILD - haul energy for construction
          targetId: container.id,
          targetPos: { x: container.pos.x, y: container.pos.y, roomName: this.roomName },
          creepsNeeded: 99, // Multiple haulers acceptable - proximity optimizes
          assignedCreeps: [],
          requiredParts: [CARRY], // Need CARRY to haul energy
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
          priority: 91, // High priority - tower defense is critical
          targetId: tower.id,
          creepsNeeded: Math.ceil(energyNeeded / 500),
          assignedCreeps: [],
          requiredParts: [CARRY], // Need CARRY to transfer energy
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

    // BOOTSTRAP MODE: No building until economy is established
    if (!this.isEconomyBootstrapped()) {
      return tasks;
    }

    report.constructionSites.forEach(site => {
      // CONSTRUCTION IS TOP PRIORITY - infrastructure expansion is critical
      // Extensions are CRITICAL - they unlock better creeps!
      let priority = 85; // Base: higher than most tasks
      let creepsNeeded = Math.ceil((site.progressTotal - site.progress) / 5000);
      
      // Critical structures get even higher priority and more workers
      if (site.structureType === STRUCTURE_SPAWN) {
        priority = 95;
        creepsNeeded = Math.max(2, creepsNeeded);
      }
      if (site.structureType === STRUCTURE_EXTENSION) {
        priority = 93; // HIGHEST - extensions unlock better economy
        creepsNeeded = Math.max(3, creepsNeeded); // ALL HANDS ON DECK
      }
      if (site.structureType === STRUCTURE_TOWER) {
        priority = 92;
        creepsNeeded = Math.max(2, creepsNeeded);
      }
      // Roads, containers, walls = 85 (still high)

      tasks.push({
        id: `build_${site.id}`, // Stable ID based on construction site
        type: TaskType.BUILD,
        priority: priority,
        targetId: site.id,
        targetPos: { x: site.pos.x, y: site.pos.y, roomName: this.roomName },
        creepsNeeded: creepsNeeded,
        assignedCreeps: [],
        requiredParts: [WORK, CARRY], // Need WORK to build, CARRY to transport energy
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
        requiredParts: [WORK, CARRY], // Need WORK to repair, CARRY to transport energy
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

    // DOWNGRADE PROTECTION: Track time to downgrade and require minimum upgraders
    const ticksToDowngrade = report.controller.ticksToDowngrade;
    const downgradeThreshold = 10000; // Start requiring upgraders below 10k ticks
    const criticalThreshold = 5000;   // Critical priority below 5k ticks
    
    // Priority escalation based on downgrade risk
    let priority = 40; // Normal: LOWEST - construction first
    if (ticksToDowngrade < criticalThreshold) {
      priority = 96; // CRITICAL - higher than all BUILD tasks!
    } else if (ticksToDowngrade < downgradeThreshold) {
      priority = 50; // WARNING - slightly higher than normal
    }
    
    // Guarantee at least 1 upgrader when downgrade timer is below threshold
    let creepsNeeded = upgraderShortage > 0 ? upgraderShortage : 99; // Accept all idle creeps
    if (ticksToDowngrade < downgradeThreshold) {
      creepsNeeded = Math.max(1, creepsNeeded); // REQUIRE at least 1 upgrader
    }
    
    tasks.push({
      id: `upgrade_${report.controller.id}`, // Stable ID based on controller
      type: TaskType.UPGRADE_CONTROLLER,
      priority: priority,
      targetId: report.controller.id,
      creepsNeeded: creepsNeeded, // Controller can handle many upgraders
      assignedCreeps: [],
      requiredParts: [WORK, CARRY], // Need WORK to upgrade, CARRY to transport energy
      metadata: {
        ticksToDowngrade: ticksToDowngrade,
        downgradeRisk: ticksToDowngrade < downgradeThreshold ? 'WARNING' : 'SAFE'
      }
    });

    return tasks;
  }

  private createEmergencyWithdrawalTasks(report: ArchivistReport): Task[] {
    const tasks: Task[] = [];
    const room = Game.rooms[this.roomName];
    if (!room) return tasks;

    // BOOTSTRAP MODE: No spawn withdrawal until economy is established
    if (!this.isEconomyBootstrapped()) {
      return tasks;
    }

    // Check for dropped energy first - always prefer pickup over anything
    const droppedResources = room.find(FIND_DROPPED_RESOURCES, {
      filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
    });
    const pickupAvailable = droppedResources.length > 0;
    if (pickupAvailable) {
      return tasks; // Pickup available, use that first
    }

    // Check if spawn is full and not spawning - if so, prioritize withdrawal over harvest
    const spawnFull = report.spawns.every(s => {
      const spawn = Game.getObjectById(s.id as Id<StructureSpawn>);
      return spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) === 0;
    });
    const notSpawning = !report.spawns.some(s => s.spawning);
    const spawnEnergyWasted = spawnFull && notSpawning && report.energyDeficit === 0;

    // If spawn is full and not being used, allow withdrawal even if harvest available
    // Otherwise, only withdraw if harvest is saturated
    const harvestTasksAvailable = report.sources.some(s => s.harvestersPresent < s.harvestersNeeded);
    if (harvestTasksAvailable && !spawnEnergyWasted) {
      return tasks; // Harvest available and spawn needs energy, use harvest
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
    // Priority depends on whether spawn energy is being wasted
    const withdrawPriority = spawnEnergyWasted ? 87 : 15; // Higher than harvest if spawn full
    
    report.spawns.forEach(spawn => {
      if (spawn.energy > 100) { // Only if spawn has energy to spare
        tasks.push({
          id: `withdraw_spawn_${spawn.id}`, // Stable ID based on spawn
          type: TaskType.WITHDRAW_ENERGY,
          priority: withdrawPriority,
          targetId: spawn.id,
          creepsNeeded: 2, // Limit to prevent spawn drainage
          assignedCreeps: [],
          requiredParts: [CARRY], // Need CARRY to withdraw energy
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
