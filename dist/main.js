'use strict';

/// <reference types="screeps" />
/**
 * Legatus Archivus - The Archivist
 *
 * Responsibility: Observe and report on room state
 * Philosophy: No decisions, no opinions - only data
 *
 * The Archivist is the eyes and ears of the Magistrates.
 * It produces a clean, structured report that other modules consume.
 */
class LegatusArchivus {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Generate a comprehensive report on the room's current state
     */
    run(room) {
        var _a, _b;
        return {
            roomName: room.name,
            rcl: ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0,
            energyAvailable: room.energyAvailable,
            energyCapacityAvailable: room.energyCapacityAvailable,
            energyDeficit: room.energyCapacityAvailable - room.energyAvailable,
            sources: this.analyzeSources(room),
            spawns: this.analyzeSpawns(room),
            extensions: room.find(FIND_MY_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_EXTENSION
            }).length,
            towers: this.analyzeTowers(room),
            containers: this.analyzeContainers(room),
            storageAvailable: room.storage !== undefined,
            storageEnergy: ((_b = room.storage) === null || _b === void 0 ? void 0 : _b.store[RESOURCE_ENERGY]) || 0,
            constructionSites: this.analyzeConstructionSites(room),
            repairTargets: this.analyzeRepairTargets(room),
            controller: this.analyzeController(room),
            hostiles: this.analyzeHostiles(room),
            hostileThreatLevel: this.calculateThreatLevel(room),
            creepsByRole: this.countCreepsByRole(room),
            totalCreeps: this.countTotalCreeps(room),
            highTrafficPositions: [] // TODO: Implement traffic analysis
        };
    }
    /**
     * Analyze all energy sources in the room
     */
    analyzeSources(room) {
        const sources = room.find(FIND_SOURCES);
        return sources.map(source => {
            const harvesters = room.find(FIND_MY_CREEPS, {
                filter: (c) => c.memory.role === 'harvester' &&
                    c.memory.targetId === source.id
            });
            // Calculate available harvesting positions around source
            const availableSpaces = this.countAvailableSpaces(room, source.pos);
            return {
                id: source.id,
                pos: { x: source.pos.x, y: source.pos.y },
                energy: source.energy,
                energyCapacity: source.energyCapacity,
                harvestersPresent: harvesters.length,
                harvestersNeeded: availableSpaces // Use actual terrain-based capacity
            };
        });
    }
    /**
     * Count walkable spaces adjacent to a position
     * This determines how many creeps can actually harvest from a source
     */
    countAvailableSpaces(room, pos) {
        const terrain = room.getTerrain();
        let spaces = 0;
        // Check all 8 adjacent tiles
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0)
                    continue; // Skip the center (source itself)
                const x = pos.x + dx;
                const y = pos.y + dy;
                // Check bounds
                if (x < 0 || x > 49 || y < 0 || y > 49)
                    continue;
                // Check terrain
                const terrainType = terrain.get(x, y);
                if (terrainType !== TERRAIN_MASK_WALL) {
                    spaces++;
                }
            }
        }
        return spaces;
    }
    /**
     * Analyze all spawn structures in the room
     */
    analyzeSpawns(room) {
        const spawns = room.find(FIND_MY_SPAWNS);
        return spawns.map(spawn => ({
            id: spawn.id,
            spawning: spawn.spawning !== null,
            energy: spawn.store[RESOURCE_ENERGY],
            energyCapacity: spawn.store.getCapacity(RESOURCE_ENERGY)
        }));
    }
    /**
     * Analyze all tower structures in the room
     */
    analyzeTowers(room) {
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER
        });
        return towers.map(tower => ({
            id: tower.id,
            energy: tower.store[RESOURCE_ENERGY],
            energyCapacity: tower.store.getCapacity(RESOURCE_ENERGY),
            needsRefill: tower.store[RESOURCE_ENERGY] < tower.store.getCapacity(RESOURCE_ENERGY) * 0.5
        }));
    }
    /**
     * Analyze all container structures in the room
     */
    analyzeContainers(room) {
        const containers = room.find(FIND_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_CONTAINER
        });
        return containers.map(container => ({
            id: container.id,
            pos: { x: container.pos.x, y: container.pos.y },
            store: { energy: container.store[RESOURCE_ENERGY] },
            storeCapacity: container.store.getCapacity(RESOURCE_ENERGY)
        }));
    }
    /**
     * Analyze all construction sites in the room
     */
    analyzeConstructionSites(room) {
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        return sites.map(site => ({
            id: site.id,
            structureType: site.structureType,
            progress: site.progress,
            progressTotal: site.progressTotal,
            pos: { x: site.pos.x, y: site.pos.y }
        }));
    }
    /**
     * Analyze all structures that need repair
     */
    analyzeRepairTargets(room) {
        const structures = room.find(FIND_STRUCTURES, {
            filter: (s) => s.hits < s.hitsMax && s.structureType !== STRUCTURE_WALL
        });
        return structures.map(structure => ({
            id: structure.id,
            structureType: structure.structureType,
            hits: structure.hits,
            hitsMax: structure.hitsMax,
            priority: this.calculateRepairPriority(structure),
            pos: { x: structure.pos.x, y: structure.pos.y }
        }));
    }
    /**
     * Calculate repair priority for a structure based on type and condition
     */
    calculateRepairPriority(structure) {
        const hitPercent = structure.hits / structure.hitsMax;
        // Critical structures get higher priority
        const criticalStructures = [
            STRUCTURE_SPAWN,
            STRUCTURE_TOWER,
            STRUCTURE_STORAGE,
            STRUCTURE_TERMINAL
        ];
        if (criticalStructures.includes(structure.structureType)) {
            return hitPercent < 0.5 ? 90 : 70;
        }
        return hitPercent < 0.3 ? 50 : 30;
    }
    /**
     * Analyze the room controller status
     */
    analyzeController(room) {
        const controller = room.controller;
        return {
            id: controller.id,
            level: controller.level,
            progress: controller.progress,
            progressTotal: controller.progressTotal,
            ticksToDowngrade: controller.ticksToDowngrade || 0,
            upgraderCount: this.countUpgraders(room),
            upgraderRecommendation: this.recommendUpgraders(controller)
        };
    }
    /**
     * Count how many upgrader creeps are currently active
     */
    countUpgraders(room) {
        return room.find(FIND_MY_CREEPS, {
            filter: (c) => c.memory.role === 'upgrader'
        }).length;
    }
    /**
     * Recommend optimal number of upgraders based on controller level
     */
    recommendUpgraders(controller) {
        // Simple logic: more upgraders for higher RCL
        if (controller.level < 3)
            return 1;
        if (controller.level < 5)
            return 2;
        return 3;
    }
    /**
     * Analyze all hostile creeps in the room
     */
    analyzeHostiles(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        return hostiles.map(hostile => ({
            id: hostile.id,
            pos: { x: hostile.pos.x, y: hostile.pos.y },
            owner: hostile.owner.username,
            body: hostile.body.map(part => part.type),
            threatLevel: this.calculateCreepThreat(hostile)
        }));
    }
    /**
     * Calculate threat level of a creep based on body composition
     */
    calculateCreepThreat(creep) {
        let threat = 0;
        creep.body.forEach(part => {
            if (part.type === ATTACK)
                threat += 3;
            if (part.type === RANGED_ATTACK)
                threat += 2;
            if (part.type === HEAL)
                threat += 2;
            if (part.type === TOUGH)
                threat += 1;
        });
        return threat;
    }
    /**
     * Calculate overall threat level for the room (0-10 scale)
     */
    calculateThreatLevel(room) {
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length === 0)
            return 0;
        const totalThreat = hostiles.reduce((sum, h) => sum + this.calculateCreepThreat(h), 0);
        return Math.min(10, Math.ceil(totalThreat / 5));
    }
    /**
     * Count creeps by role
     */
    countCreepsByRole(room) {
        const creeps = room.find(FIND_MY_CREEPS);
        const counts = new Map();
        creeps.forEach(creep => {
            const role = creep.memory.role || 'unknown';
            counts.set(role, (counts.get(role) || 0) + 1);
        });
        return counts;
    }
    /**
     * Count total creeps in the room
     */
    countTotalCreeps(room) {
        return room.find(FIND_MY_CREEPS).length;
    }
}

/**
 * All possible task types in the Empire
 * These represent the fundamental actions a creep can be assigned
 */
var TaskType;
(function (TaskType) {
    // Energy Management
    TaskType["HARVEST_ENERGY"] = "HARVEST_ENERGY";
    TaskType["PICKUP_ENERGY"] = "PICKUP_ENERGY";
    TaskType["HAUL_ENERGY"] = "HAUL_ENERGY";
    TaskType["WITHDRAW_ENERGY"] = "WITHDRAW_ENERGY";
    // Construction & Repair
    TaskType["BUILD"] = "BUILD";
    TaskType["REPAIR"] = "REPAIR";
    // Controller Operations
    TaskType["UPGRADE_CONTROLLER"] = "UPGRADE_CONTROLLER";
    // Defense
    TaskType["DEFEND_ROOM"] = "DEFEND_ROOM";
    TaskType["TOWER_DEFENSE"] = "TOWER_DEFENSE";
    // Logistics
    TaskType["REFILL_SPAWN"] = "REFILL_SPAWN";
    TaskType["REFILL_EXTENSION"] = "REFILL_EXTENSION";
    TaskType["REFILL_TOWER"] = "REFILL_TOWER";
    // Special Operations
    TaskType["CLAIM_CONTROLLER"] = "CLAIM_CONTROLLER";
    TaskType["RESERVE_CONTROLLER"] = "RESERVE_CONTROLLER";
    TaskType["SCOUT_ROOM"] = "SCOUT_ROOM";
    TaskType["RENEW_CREEP"] = "RENEW_CREEP";
    // Idle/Default
    TaskType["IDLE"] = "IDLE";
})(TaskType || (TaskType = {}));

/**
 * Legatus Officio - The Taskmaster
 *
 * Responsibility: Transform observations into actionable tasks
 * Philosophy: Every problem is a task waiting to be solved
 *
 * The Taskmaster reads the Archivist's report and creates a prioritized
 * work queue. It doesn't care WHO does the work - just WHAT needs doing.
 */
class LegatusOfficio {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze the room report and generate prioritized tasks
     */
    run(report) {
        const tasks = [];
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
    createDefenseTasks(report) {
        const tasks = [];
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
    createEnergyTasks(report) {
        const tasks = [];
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
            // Find spawns that need energy (check actual spawn capacity, not room capacity)
            report.spawns.forEach(spawn => {
                const spawnObj = Game.getObjectById(spawn.id);
                if (!spawnObj)
                    return;
                const freeCapacity = spawnObj.store.getFreeCapacity(RESOURCE_ENERGY);
                if (freeCapacity > 0) {
                    tasks.push({
                        id: `refill_spawn_${spawn.id}`, // Stable ID based on spawn
                        type: TaskType.REFILL_SPAWN,
                        priority: 90, // Higher than harvest - we need energy NOW
                        targetId: spawn.id,
                        creepsNeeded: Math.ceil(freeCapacity / 50), // 1 creep per 50 energy needed
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
    createTowerRefillTasks(report) {
        const tasks = [];
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
    createConstructionTasks(report) {
        const tasks = [];
        report.constructionSites.forEach(site => {
            // Prioritize spawns and towers
            let priority = 60;
            if (site.structureType === STRUCTURE_SPAWN)
                priority = 85;
            if (site.structureType === STRUCTURE_TOWER)
                priority = 80;
            if (site.structureType === STRUCTURE_EXTENSION)
                priority = 70;
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
    createRepairTasks(repairTargets) {
        const tasks = [];
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
    createUpgradeTasks(report) {
        const tasks = [];
        // ALWAYS create upgrade tasks - upgrading is core gameplay
        // The controller can handle unlimited upgraders, so set a high limit
        const upgraderShortage = report.controller.upgraderRecommendation -
            report.controller.upgraderCount;
        // Priority: 90 if downgrade imminent, 45 otherwise (below all construction)
        // Building infrastructure should take priority over upgrading
        const priority = report.controller.ticksToDowngrade < 5000 ? 90 : 45;
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
    createEmergencyWithdrawalTasks(report) {
        const tasks = [];
        const room = Game.rooms[this.roomName];
        if (!room)
            return tasks;
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
            const spawn = Game.getObjectById(s.id);
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

/**
 * Legatus Genetor - The Broodmother
 *
 * Responsibility: Maintain optimal creep population with intelligent body designs
 * Philosophy: Spawn versatile workers, let tasks find them
 *
 * The Broodmother analyzes room needs and spawns creeps with appropriate
 * body configurations. Creeps are assigned tasks based on their capabilities.
 */
class LegatusGenetor {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze room population and spawn creeps as needed
     */
    run(tasks) {
        const room = Game.rooms[this.roomName];
        if (!room)
            return;
        // Find available spawns
        const spawns = room.find(FIND_MY_SPAWNS, {
            filter: (s) => !s.spawning
        });
        if (spawns.length === 0)
            return;
        // Get current creep census by role
        const creeps = Object.values(Game.creeps).filter(c => c.memory.room === this.roomName);
        const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
        const haulerCount = creeps.filter(c => c.memory.role === 'hauler').length;
        const defenderCount = creeps.filter(c => c.memory.role === 'defender').length;
        const totalCreeps = creeps.length;
        const minCreeps = 6;
        const maxCreeps = 15;
        if (totalCreeps >= maxCreeps)
            return;
        // DON'T SPAWN if there are no available tasks (workers would just idle)
        const availableTasks = tasks.filter(task => {
            const openSlots = task.creepsNeeded - task.assignedCreeps.length;
            return openSlots > 0;
        });
        if (availableTasks.length === 0 && totalCreeps >= minCreeps) {
            return; // No tasks available, don't spawn
        }
        const energy = room.energyAvailable;
        const minEnergyToSpawn = totalCreeps < minCreeps ? 200 : 300;
        if (energy < minEnergyToSpawn)
            return;
        // PRIORITY SPAWN ORDER:
        // 1. Defenders (if hostiles present)
        // 2. Harvesters (1 per source, target 5 WORK parts)
        // 3. Haulers (2-3 for logistics)
        // 4. Workers (versatile, fill remaining slots)
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0 && defenderCount < 2) {
            this.spawnCreepByType('defender', spawns[0], energy, totalCreeps < minCreeps);
            return;
        }
        // Count sources in room
        const sources = room.find(FIND_SOURCES);
        const targetHarvesters = sources.length; // 1 dedicated harvester per source
        if (harvesterCount < targetHarvesters) {
            this.spawnCreepByType('harvester', spawns[0], energy, totalCreeps < minCreeps);
            return;
        }
        // Target 2-3 haulers for efficient logistics
        const targetHaulers = Math.min(3, sources.length * 2);
        if (haulerCount < targetHaulers) {
            this.spawnCreepByType('hauler', spawns[0], energy, totalCreeps < minCreeps);
            return;
        }
        // Fill remaining slots with versatile workers
        this.spawnCreepByType('worker', spawns[0], energy, totalCreeps < minCreeps);
    }
    /**
     * Spawn a specific creep type with appropriate body design
     */
    spawnCreepByType(type, spawn, energy, isEmergency) {
        const body = this.designCreepBody(type, energy);
        if (body.length === 0)
            return;
        const cost = this.calculateBodyCost(body);
        const name = `${type}_${Game.time}`;
        const request = {
            body: body,
            memory: {
                role: type,
                room: this.roomName
            }};
        const result = spawn.spawnCreep(request.body, name, { memory: request.memory });
        if (result === OK) {
            console.log(`🏛️ Spawning ${type}: ${name} (${cost} energy, ${body.length} parts)`);
        }
        else if (result !== ERR_NOT_ENOUGH_ENERGY) {
            console.log(`⚠️ Failed to spawn ${type}: ${result}`);
        }
    }
    /**
     * Design a creep body based on type and available energy
     */
    designCreepBody(type, energy) {
        switch (type) {
            case 'harvester':
                return this.designHarvester(energy);
            case 'hauler':
                return this.designHauler(energy);
            case 'worker':
                return this.designWorker(energy);
            case 'defender':
                return this.designDefender(energy);
            default:
                return this.designWorker(energy);
        }
    }
    /**
     * Design a dedicated harvester: Target 5 WORK parts, minimal CARRY, MOVE for speed
     * These creeps ONLY harvest, haulers will pick up the energy
     */
    designHarvester(energy) {
        const parts = [];
        // Target: 5 WORK parts for maximum harvest efficiency (10 energy/tick)
        // Formula: [WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE]
        // Cost: 550 energy (ideal)
        // Scale down if low energy:
        // 550+ = 5 WORK (ideal)
        // 400-549 = 4 WORK
        // 300-399 = 3 WORK  
        // 200-299 = 2 WORK
        // <200 = 1 WORK (emergency)
        let workParts = 1;
        if (energy >= 550)
            workParts = 5;
        else if (energy >= 450)
            workParts = 4;
        else if (energy >= 350)
            workParts = 3;
        else if (energy >= 250)
            workParts = 2;
        // Add WORK parts
        for (let i = 0; i < workParts; i++) {
            parts.push(WORK);
        }
        // Add 1 CARRY (to hold harvested energy temporarily)
        parts.push(CARRY);
        // Add MOVE parts (1 per 2 body parts for unburdened speed)
        const moveParts = Math.ceil(parts.length / 2);
        for (let i = 0; i < moveParts; i++) {
            parts.push(MOVE);
        }
        return parts;
    }
    /**
     * Design a general-purpose worker: WORK + CARRY + MOVE
     * Can harvest, build, upgrade, repair, and transfer
     */
    designWorker(energy) {
        // Worker: Balanced WORK, CARRY, MOVE (versatile, can do anything)
        const parts = [];
        while (energy >= 200) {
            parts.push(WORK); // 100
            parts.push(CARRY); // 50
            parts.push(MOVE); // 50 = 200 total
            energy -= 200;
        }
        return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
    }
    /**
     * Design a specialized hauler: Maximize CARRY, no WORK parts
     * Pure logistics - pickup, transfer, refill only
     */
    designHauler(energy) {
        const parts = [];
        // NO WORK PARTS - haulers are pure logistics
        // Formula: [CARRY, CARRY, MOVE, MOVE] repeating
        // Each pair costs 100 energy and gives 100 capacity
        while (energy >= 100 && parts.length < 16) { // Cap at 16 parts (8 CARRY + 8 MOVE)
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 100;
        }
        // Minimum: 2 CARRY + 2 MOVE
        if (parts.length === 0) {
            parts.push(CARRY, MOVE);
        }
        return parts;
    }
    designDefender(energy) {
        // Defender: ATTACK, MOVE, some TOUGH
        const parts = [];
        // Add tough armor first
        if (energy >= 10) {
            parts.push(TOUGH);
            energy -= 10;
        }
        // Add attack and move
        while (energy >= 130) {
            parts.push(ATTACK);
            parts.push(MOVE);
            energy -= 130;
        }
        return parts.length > 0 ? parts : [ATTACK, MOVE];
    }
    calculateBodyCost(body) {
        const costs = {
            [MOVE]: 50,
            [WORK]: 100,
            [CARRY]: 50,
            [ATTACK]: 80,
            [RANGED_ATTACK]: 150,
            [HEAL]: 250,
            [TOUGH]: 10,
            [CLAIM]: 600
        };
        return body.reduce((sum, part) => sum + (costs[part] || 0), 0);
    }
}

/**
 * Legatus Fabrum - The Architect
 *
 * Responsibility: Place construction sites according to room blueprints
 * Philosophy: Every room should be a masterpiece of efficiency
 *
 * The Architect plans and places structures to optimize room layout.
 * Currently implements RCL 1-3 infrastructure.
 */
class LegatusFabrum {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze room and place construction sites based on RCL
     */
    run() {
        const room = Game.rooms[this.roomName];
        if (!room || !room.controller || !room.controller.my)
            return;
        const rcl = room.controller.level;
        // Place structures based on RCL progression
        if (rcl >= 2) {
            this.placeExtensions(room);
        }
        if (rcl >= 3) {
            this.placeTower(room);
            this.placeContainers(room);
        }
        // Future: Roads, ramparts, walls, storage, etc.
    }
    /**
     * Place extensions near spawn
     * RCL 2: 5 extensions, RCL 3: 10 extensions, etc.
     * Strategy: Place ONE at a time, evenly distributed in rings
     */
    placeExtensions(room) {
        const rcl = room.controller.level;
        // Extension limits by RCL
        const extensionLimits = {
            2: 5,
            3: 10,
            4: 20,
            5: 30,
            6: 40,
            7: 50,
            8: 60
        };
        const maxExtensions = extensionLimits[rcl] || 0;
        // Count existing extensions and construction sites
        const existingExtensions = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION
        }).length;
        const extensionSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (s) => s.structureType === STRUCTURE_EXTENSION
        }).length;
        const totalExtensions = existingExtensions + extensionSites;
        if (totalExtensions >= maxExtensions)
            return; // Already have enough
        // ONLY place ONE construction site at a time
        if (extensionSites > 0)
            return; // Wait for current site to be built
        // Find spawn to build near
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn)
            return;
        // Place extensions evenly distributed in rings
        // Use a deterministic pattern to ensure even spacing
        const extensionsNeeded = 1; // ONE AT A TIME
        let placed = 0;
        // Search in expanding rings around spawn
        for (let range = 2; range <= 5 && placed < extensionsNeeded; range++) {
            const positions = this.getEvenlyDistributedPositions(spawn.pos, range);
            for (const pos of positions) {
                if (placed >= extensionsNeeded)
                    break;
                // Check if position is valid for extension
                if (this.canPlaceStructure(room, pos)) {
                    const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_EXTENSION);
                    if (result === OK) {
                        placed++;
                        console.log(`🏗️ Architect: Placed EXTENSION at ${pos.x},${pos.y} (${totalExtensions + 1}/${maxExtensions})`);
                    }
                }
            }
        }
    }
    /**
     * Place tower for defense (RCL 3+)
     */
    placeTower(room) {
        // Check if we already have a tower or construction site
        const existingTowers = room.find(FIND_MY_STRUCTURES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER
        }).length;
        const towerSites = room.find(FIND_MY_CONSTRUCTION_SITES, {
            filter: (s) => s.structureType === STRUCTURE_TOWER
        }).length;
        if (existingTowers + towerSites > 0)
            return;
        // Place tower near controller for defense
        const controller = room.controller;
        const positions = this.getPositionsInRange(controller.pos, 3);
        for (const pos of positions) {
            if (this.canPlaceStructure(room, pos)) {
                const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_TOWER);
                if (result === OK) {
                    console.log(`🏗️ Architect: Placed TOWER at ${pos.x},${pos.y}`);
                    return;
                }
            }
        }
    }
    /**
     * Place containers near sources (RCL 3+)
     */
    placeContainers(room) {
        const sources = room.find(FIND_SOURCES);
        sources.forEach(source => {
            // Check if source already has container or site
            const existingContainer = room.find(FIND_STRUCTURES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                    s.pos.inRangeTo(source.pos, 1)
            }).length;
            const containerSite = room.find(FIND_CONSTRUCTION_SITES, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER &&
                    s.pos.inRangeTo(source.pos, 1)
            }).length;
            if (existingContainer + containerSite > 0)
                return;
            // Place container adjacent to source
            const positions = this.getPositionsInRange(source.pos, 1);
            for (const pos of positions) {
                if (this.canPlaceStructure(room, pos)) {
                    const result = room.createConstructionSite(pos.x, pos.y, STRUCTURE_CONTAINER);
                    if (result === OK) {
                        console.log(`🏗️ Architect: Placed CONTAINER near source at ${pos.x},${pos.y}`);
                        return;
                    }
                }
            }
        });
    }
    /**
     * Get all positions in a specific range (ring) around a position
     */
    getPositionsInRange(pos, range) {
        const positions = [];
        for (let x = pos.x - range; x <= pos.x + range; x++) {
            for (let y = pos.y - range; y <= pos.y + range; y++) {
                // Only positions at exactly this range (ring, not filled circle)
                const dx = Math.abs(x - pos.x);
                const dy = Math.abs(y - pos.y);
                if (Math.max(dx, dy) !== range)
                    continue;
                if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                    positions.push(new RoomPosition(x, y, pos.roomName));
                }
            }
        }
        return positions;
    }
    /**
     * Get evenly distributed positions around a point
     * Prioritizes cardinal directions and diagonals for balanced spacing
     */
    getEvenlyDistributedPositions(pos, range) {
        const positions = [];
        // For each ring, prioritize 8 main directions (N, NE, E, SE, S, SW, W, NW)
        // This creates balanced, cross-pattern distribution
        const directions = [
            { dx: 0, dy: -1 }, // North
            { dx: 1, dy: -1 }, // Northeast
            { dx: 1, dy: 0 }, // East
            { dx: 1, dy: 1 }, // Southeast
            { dx: 0, dy: 1 }, // South
            { dx: -1, dy: 1 }, // Southwest
            { dx: -1, dy: 0 }, // West
            { dx: -1, dy: -1 } // Northwest
        ];
        // Add primary 8 directions at this range
        for (const dir of directions) {
            const x = pos.x + (dir.dx * range);
            const y = pos.y + (dir.dy * range);
            if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                positions.push(new RoomPosition(x, y, pos.roomName));
            }
        }
        // Add remaining positions in the ring (fills gaps between cardinal/diagonal)
        for (let x = pos.x - range; x <= pos.x + range; x++) {
            for (let y = pos.y - range; y <= pos.y + range; y++) {
                const dx = Math.abs(x - pos.x);
                const dy = Math.abs(y - pos.y);
                if (Math.max(dx, dy) !== range)
                    continue;
                // Skip if already added (cardinal/diagonal)
                const alreadyAdded = positions.some(p => p.x === x && p.y === y);
                if (alreadyAdded)
                    continue;
                if (x >= 0 && x <= 49 && y >= 0 && y <= 49) {
                    positions.push(new RoomPosition(x, y, pos.roomName));
                }
            }
        }
        return positions;
    }
    /**
     * Check if a structure can be placed at this position
     */
    canPlaceStructure(room, pos) {
        // Check terrain
        const terrain = room.getTerrain();
        if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL)
            return false;
        // Check for existing structures
        const structures = pos.lookFor(LOOK_STRUCTURES);
        if (structures.length > 0)
            return false;
        // Check for construction sites
        const sites = pos.lookFor(LOOK_CONSTRUCTION_SITES);
        if (sites.length > 0)
            return false;
        // Don't build on source or controller
        const sources = pos.lookFor(LOOK_SOURCES);
        if (sources.length > 0)
            return false;
        // Check controller
        if (room.controller && pos.isEqualTo(room.controller.pos))
            return false;
        return true;
    }
}

/**
 * Legatus Viae - The Trailblazer
 *
 * Responsibility: Analyze traffic and build roads
 * Philosophy: The shortest path between two points is a Roman road
 *
 * The Trailblazer monitors creep movement patterns and builds roads
 * in high-traffic areas to improve efficiency.
 */
class LegatusViae {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze traffic patterns and place road construction sites
     * TODO: Implement traffic analysis and road planning
     */
    run() {
        // STUB: Traffic analysis logic will be implemented later
        // This will include:
        // - Tracking creep movement patterns
        // - Identifying high-traffic positions
        // - Placing road construction sites
        // - Optimizing paths between key structures
        // Suppress unused variable warning - will be used in future implementation
        void this.roomName;
    }
}

/**
 * Task execution status enumeration
 * Represents the outcome of a task execution attempt
 */
var TaskStatus;
(function (TaskStatus) {
    /** Task is currently being executed */
    TaskStatus["IN_PROGRESS"] = "IN_PROGRESS";
    /** Task has been completed successfully */
    TaskStatus["COMPLETED"] = "COMPLETED";
    /** Task execution failed */
    TaskStatus["FAILED"] = "FAILED";
    /** Task cannot be executed (e.g., target unreachable) */
    TaskStatus["BLOCKED"] = "BLOCKED";
})(TaskStatus || (TaskStatus = {}));

/**
 * Base class for task execution
 *
 * Responsibility: Execute specific task types with creeps
 * Strategy: Each TaskType has a corresponding executor subclass
 *
 * This abstract class defines the interface that all task executors must implement,
 * providing utility methods for common operations like movement and positioning checks.
 */
class TaskExecutor {
    /**
     * Check if a creep is at or adjacent to the target position
     *
     * @param creep - The creep to check
     * @param target - The target position or object
     * @returns true if creep is near target, false otherwise
     */
    isAtTarget(creep, target) {
        return creep.pos.isNearTo(target);
    }
    /**
     * Move a creep to the target position with standard pathfinding
     *
     * Uses visualized paths and path reuse for efficiency
     *
     * @param creep - The creep to move
     * @param target - The target position or object
     * @returns Screeps return code (OK, ERR_NO_PATH, etc.)
     */
    moveToTarget(creep, target) {
        return creep.moveTo(target, {
            visualizePathStyle: { stroke: '#ffffff' },
            reusePath: 10
        });
    }
}

/// <reference types="screeps" />
/**
 * HarvestExecutor - Execute HARVEST_ENERGY tasks
 *
 * Creeps move to energy sources and harvest energy
 * Returns COMPLETED when creep is full or source is empty
 */
class HarvestExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target source
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No harvest target specified' };
        }
        // Get the source
        const source = Game.getObjectById(task.targetId);
        if (!source) {
            return { status: TaskStatus.FAILED, message: 'Source not found' };
        }
        // Check if creep is full
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Creep full',
                workDone: 0
            };
        }
        // Check if source is depleted
        if (source.energy === 0) {
            return {
                status: TaskStatus.BLOCKED,
                message: 'Source empty',
                workDone: 0
            };
        }
        // Check if already adjacent to source
        if (!this.isAtTarget(creep, source)) {
            // Move towards source
            const moveResult = this.moveToTarget(creep, source);
            // Movement errors are usually not fatal - creep just needs to keep trying
            // Only fail on critical errors like ERR_NO_BODYPART
            if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Moving to source',
                workDone: 0
            };
        }
        // Adjacent to source - perform harvest
        const harvestResult = creep.harvest(source);
        if (harvestResult === OK) {
            const workParts = creep.getActiveBodyparts(WORK);
            const energyHarvested = Math.min(source.energy, workParts * HARVEST_POWER);
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Harvesting',
                workDone: energyHarvested
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Harvest failed: ${harvestResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * PickupExecutor - Execute PICKUP_ENERGY tasks
 *
 * Creeps move to dropped energy and pick it up
 * Returns COMPLETED when creep is full or energy is gone
 */
class PickupExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No pickup target specified' };
        }
        // Get the dropped resource
        const resource = Game.getObjectById(task.targetId);
        if (!resource) {
            return { status: TaskStatus.FAILED, message: 'Dropped resource not found' };
        }
        // Check if creep is full
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Creep full',
                workDone: 0
            };
        }
        // Check if resource still exists and has energy
        if (resource.amount === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Resource depleted',
                workDone: 0
            };
        }
        // Check if in range to pickup (must be adjacent)
        if (!this.isAtTarget(creep, resource)) {
            // Move towards resource
            const moveResult = this.moveToTarget(creep, resource);
            // Movement errors are usually not fatal
            if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Moving to resource',
                workDone: 0
            };
        }
        // Adjacent to resource - perform pickup
        const pickupResult = creep.pickup(resource);
        if (pickupResult === OK) {
            const amountPickedUp = Math.min(resource.amount, creep.store.getFreeCapacity(RESOURCE_ENERGY));
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Picking up energy',
                workDone: amountPickedUp
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Pickup failed: ${pickupResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * TransferExecutor - Execute energy transfer tasks
 *
 * Handles: REFILL_SPAWN, REFILL_EXTENSION, REFILL_TOWER tasks
 * Creeps move to target structure and transfer energy
 * Returns COMPLETED when creep is empty or structure is full
 */
class TransferExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No transfer target specified' };
        }
        // Get the target structure
        const target = Game.getObjectById(task.targetId);
        if (!target) {
            return { status: TaskStatus.FAILED, message: 'Target structure not found' };
        }
        // Validate target can store energy
        const storableTarget = target;
        if (!storableTarget.store) {
            return { status: TaskStatus.FAILED, message: 'Target cannot store energy' };
        }
        // Check if creep is empty
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Creep empty',
                workDone: 0
            };
        }
        // Check if target is full
        if (storableTarget.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Target full',
                workDone: 0
            };
        }
        // Check if adjacent to target
        if (!this.isAtTarget(creep, target)) {
            // Move towards target
            const moveResult = this.moveToTarget(creep, target);
            // Movement errors are usually not fatal - creep just needs to keep trying
            if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Moving to target',
                workDone: 0
            };
        }
        // Adjacent to target - perform transfer
        const transferResult = creep.transfer(storableTarget, RESOURCE_ENERGY);
        if (transferResult === OK) {
            const energyTransferred = Math.min(creep.store.getUsedCapacity(RESOURCE_ENERGY), storableTarget.store.getFreeCapacity(RESOURCE_ENERGY));
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Transferring',
                workDone: energyTransferred
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Transfer failed: ${transferResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * UpgradeExecutor - Execute UPGRADE_CONTROLLER tasks
 *
 * Creeps move to the room controller and upgrade it
 * Returns COMPLETED when creep is empty of energy
 */
class UpgradeExecutor extends TaskExecutor {
    execute(creep, _task) {
        // Get the controller
        const controller = creep.room.controller;
        if (!controller) {
            return { status: TaskStatus.FAILED, message: 'No controller in room' };
        }
        const energyAmount = creep.store.getUsedCapacity(RESOURCE_ENERGY);
        const distance = creep.pos.getRangeTo(controller);
        // Debug logging
        console.log(`🔧 ${creep.name}: Energy=${energyAmount}, Distance=${distance}, Pos=${creep.pos}`);
        // Check if creep is out of energy
        if (energyAmount === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'No energy',
                workDone: 0
            };
        }
        // Check if in range of controller (3 squares)
        if (!creep.pos.inRangeTo(controller, 3)) {
            // Move towards controller
            console.log(`🚶 ${creep.name}: Moving to controller at ${controller.pos}`);
            const moveResult = this.moveToTarget(creep, controller);
            console.log(`📍 ${creep.name}: moveTo result = ${moveResult}`);
            // Movement errors are usually not fatal - creep just needs to keep trying
            if (moveResult !== OK && moveResult !== ERR_TIRED && moveResult !== ERR_BUSY) {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
            return {
                status: TaskStatus.IN_PROGRESS,
                message: `Moving to controller`,
                workDone: 0
            };
        }
        // In range - perform upgrade
        const upgradeResult = creep.upgradeController(controller);
        if (upgradeResult === OK) {
            const workParts = creep.getActiveBodyparts(WORK);
            const workDone = workParts * UPGRADE_CONTROLLER_POWER;
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Upgrading',
                workDone: workDone
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Upgrade failed: ${upgradeResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * BuildExecutor - Execute BUILD tasks
 *
 * Creeps move to construction sites and build structures
 * Returns COMPLETED when construction site is finished or creep is empty
 */
class BuildExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target construction site
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No construction site specified' };
        }
        // Get the construction site
        const site = Game.getObjectById(task.targetId);
        if (!site) {
            return { status: TaskStatus.FAILED, message: 'Construction site not found' };
        }
        // If creep has no energy, acquire energy first (following priority: pickup > harvest)
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            // Priority 1: Look for dropped energy first (don't waste it)
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
            });
            if (droppedEnergy) {
                if (!creep.pos.isNearTo(droppedEnergy)) {
                    creep.moveTo(droppedEnergy, { visualizePathStyle: { stroke: '#ffaa00' } });
                    return {
                        status: TaskStatus.IN_PROGRESS,
                        message: 'Moving to pickup energy',
                        workDone: 0
                    };
                }
                const pickupResult = creep.pickup(droppedEnergy);
                if (pickupResult === OK) {
                    return {
                        status: TaskStatus.IN_PROGRESS,
                        message: 'Picking up energy for build',
                        workDone: 0
                    };
                }
            }
            // Priority 2: Harvest from source
            const sources = creep.room.find(FIND_SOURCES_ACTIVE);
            if (sources.length === 0) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Waiting for energy sources to regenerate',
                    workDone: 0
                };
            }
            const nearestSource = creep.pos.findClosestByPath(sources);
            if (!nearestSource) {
                return {
                    status: TaskStatus.FAILED,
                    message: 'Cannot path to energy source',
                    workDone: 0
                };
            }
            // Move to source and harvest
            if (!creep.pos.isNearTo(nearestSource)) {
                creep.moveTo(nearestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to harvest energy',
                    workDone: 0
                };
            }
            // Harvest
            const harvestResult = creep.harvest(nearestSource);
            if (harvestResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Harvesting energy for build',
                    workDone: 0
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Harvest failed: ${harvestResult}`,
                    workDone: 0
                };
            }
        }
        // Check if adjacent to construction site
        if (!this.isAtTarget(creep, site)) {
            // Move towards site
            const moveResult = this.moveToTarget(creep, site);
            if (moveResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to construction site',
                    workDone: 0
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
        }
        // Adjacent to site - perform build
        const buildResult = creep.build(site);
        if (buildResult === OK) {
            const workParts = creep.getActiveBodyparts(WORK);
            const workDone = workParts * BUILD_POWER;
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Building',
                workDone: workDone
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Build failed: ${buildResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * RepairExecutor - Execute REPAIR tasks
 *
 * Creeps move to damaged structures and repair them
 * Returns COMPLETED when structure is fully repaired or creep is empty
 */
class RepairExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target structure
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No repair target specified' };
        }
        // Get the structure to repair
        const structure = Game.getObjectById(task.targetId);
        if (!structure) {
            return { status: TaskStatus.FAILED, message: 'Target structure not found' };
        }
        // Check if structure is already fully repaired
        if (structure.hits >= structure.hitsMax) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Structure repaired',
                workDone: 0
            };
        }
        // If creep has no energy, acquire energy first (following priority: pickup > harvest)
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            // Priority 1: Look for dropped energy first (don't waste it)
            const droppedEnergy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
                filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > 50
            });
            if (droppedEnergy) {
                if (!creep.pos.isNearTo(droppedEnergy)) {
                    creep.moveTo(droppedEnergy, { visualizePathStyle: { stroke: '#ffaa00' } });
                    return {
                        status: TaskStatus.IN_PROGRESS,
                        message: 'Moving to pickup energy',
                        workDone: 0
                    };
                }
                const pickupResult = creep.pickup(droppedEnergy);
                if (pickupResult === OK) {
                    return {
                        status: TaskStatus.IN_PROGRESS,
                        message: 'Picking up energy for repair',
                        workDone: 0
                    };
                }
            }
            // Priority 2: Harvest from source
            const sources = creep.room.find(FIND_SOURCES_ACTIVE);
            if (sources.length === 0) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Waiting for energy sources to regenerate',
                    workDone: 0
                };
            }
            const nearestSource = creep.pos.findClosestByPath(sources);
            if (!nearestSource) {
                return {
                    status: TaskStatus.FAILED,
                    message: 'Cannot path to energy source',
                    workDone: 0
                };
            }
            if (!creep.pos.isNearTo(nearestSource)) {
                creep.moveTo(nearestSource, { visualizePathStyle: { stroke: '#ffaa00' } });
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to harvest energy',
                    workDone: 0
                };
            }
            const harvestResult = creep.harvest(nearestSource);
            if (harvestResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Harvesting energy for repair',
                    workDone: 0
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Harvest failed: ${harvestResult}`,
                    workDone: 0
                };
            }
        }
        // Check if adjacent to structure
        if (!this.isAtTarget(creep, structure)) {
            // Move towards structure
            const moveResult = this.moveToTarget(creep, structure);
            if (moveResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to repair target',
                    workDone: 0
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
        }
        // Adjacent to structure - perform repair
        const repairResult = creep.repair(structure);
        if (repairResult === OK) {
            const workParts = creep.getActiveBodyparts(WORK);
            const workDone = workParts * REPAIR_POWER;
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Repairing',
                workDone: workDone
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Repair failed: ${repairResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * WithdrawExecutor - Execute WITHDRAW_ENERGY tasks
 *
 * Creeps move to containers/storage and withdraw energy
 * Returns COMPLETED when creep is full or structure is empty
 */
class WithdrawExecutor extends TaskExecutor {
    execute(creep, task) {
        // Validate task has a target
        if (!task.targetId) {
            return { status: TaskStatus.FAILED, message: 'No withdraw target specified' };
        }
        // Get the target structure
        const target = Game.getObjectById(task.targetId);
        if (!target) {
            return { status: TaskStatus.FAILED, message: 'Target structure not found' };
        }
        // Validate target has a store
        const storableTarget = target;
        if (!storableTarget.store) {
            return { status: TaskStatus.FAILED, message: 'Target has no store' };
        }
        // Check if creep is full
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Creep full',
                workDone: 0
            };
        }
        // Check if target is empty
        if (storableTarget.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.BLOCKED,
                message: 'Target empty',
                workDone: 0
            };
        }
        // Check if adjacent to target
        if (!this.isAtTarget(creep, target)) {
            // Move towards target
            const moveResult = this.moveToTarget(creep, target);
            if (moveResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to target',
                    workDone: 0
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Failed to move: ${moveResult}`,
                    workDone: 0
                };
            }
        }
        // Adjacent to target - perform withdraw
        const withdrawResult = creep.withdraw(storableTarget, RESOURCE_ENERGY);
        if (withdrawResult === OK) {
            const energyWithdrawn = Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), storableTarget.store.getUsedCapacity(RESOURCE_ENERGY));
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Withdrawing',
                workDone: energyWithdrawn
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Withdraw failed: ${withdrawResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * DefendExecutor - Execute DEFEND_ROOM tasks
 *
 * Creeps move to hostile creeps and attack them
 * Uses melee attack if available, otherwise ranged attack
 * Returns COMPLETED when no hostiles remain
 */
class DefendExecutor extends TaskExecutor {
    execute(creep, task) {
        // Get target hostile
        let hostile = null;
        if (task.targetId) {
            // If specific target is assigned, try to use it
            hostile = Game.getObjectById(task.targetId);
        }
        // If no target or target is gone, find nearest hostile
        if (!hostile) {
            const hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
            if (hostiles.length === 0) {
                return {
                    status: TaskStatus.COMPLETED,
                    message: 'No hostiles',
                    workDone: 0
                };
            }
            // Target nearest hostile
            hostile = creep.pos.findClosestByPath(hostiles);
            if (!hostile) {
                hostile = creep.pos.findClosestByRange(hostiles);
            }
        }
        // Validate we have a hostile to attack
        if (!hostile) {
            return {
                status: TaskStatus.BLOCKED,
                message: 'Hostile unreachable',
                workDone: 0
            };
        }
        // Check which attack types we have
        const hasAttack = creep.getActiveBodyparts(ATTACK) > 0;
        const hasRangedAttack = creep.getActiveBodyparts(RANGED_ATTACK) > 0;
        // If adjacent to hostile, use melee attack
        if (creep.pos.isNearTo(hostile)) {
            if (hasAttack) {
                const attackResult = creep.attack(hostile);
                if (attackResult === OK) {
                    return {
                        status: TaskStatus.IN_PROGRESS,
                        message: 'Attacking',
                        workDone: creep.getActiveBodyparts(ATTACK) * ATTACK_POWER
                    };
                }
            }
            // Fall through to ranged attack
        }
        // Use ranged attack or move closer
        if (hasRangedAttack && creep.pos.inRangeTo(hostile, 3)) {
            const rangedResult = creep.rangedAttack(hostile);
            if (rangedResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Ranged attacking',
                    workDone: creep.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER
                };
            }
        }
        // Move towards hostile
        const moveResult = this.moveToTarget(creep, hostile);
        if (moveResult === OK) {
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Moving to hostile',
                workDone: 0
            };
        }
        else {
            return {
                status: TaskStatus.FAILED,
                message: `Failed to move: ${moveResult}`,
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * IdleExecutor - Execute IDLE tasks
 *
 * Default fallback executor for creeps without assigned tasks
 * Moves to a safe parking position near the controller
 * Returns IN_PROGRESS indefinitely until reassigned
 */
class IdleExecutor extends TaskExecutor {
    execute(creep, _task) {
        // Get the controller as a safe parking position
        const controller = creep.room.controller;
        if (!controller) {
            // No controller - just stay put
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Idling (no controller)',
                workDone: 0
            };
        }
        // If already in parking area (adjacent to controller), stay put
        if (creep.pos.inRangeTo(controller, 3)) {
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Parked',
                workDone: 0
            };
        }
        // Move to parking position
        const moveResult = this.moveToTarget(creep, controller);
        if (moveResult === OK) {
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Moving to parking',
                workDone: 0
            };
        }
        else if (moveResult === ERR_NO_PATH) {
            // Can't reach parking - stay put
            return {
                status: TaskStatus.BLOCKED,
                message: 'Parking unreachable',
                workDone: 0
            };
        }
        else {
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Idling',
                workDone: 0
            };
        }
    }
}

/// <reference types="screeps" />
/**
 * RenewExecutor - Handles RENEW_CREEP tasks
 *
 * Responsibility: Keep creeps alive by renewing them at spawns
 * Philosophy: Use excess spawn energy to extend creep lifespan
 *
 * When there are no urgent tasks, idle creeps should renew themselves
 * to avoid dying and wasting the energy that was used to spawn them.
 */
class RenewExecutor extends TaskExecutor {
    /**
     * Execute renewal for a creep
     */
    execute(creep, task) {
        // Get the spawn from the task
        const spawn = Game.getObjectById(task.targetId);
        if (!spawn) {
            return {
                status: TaskStatus.FAILED,
                message: 'Spawn not found'
            };
        }
        // Don't renew if creep is still very young (TTL > 1300 = ~65% life)
        if (creep.ticksToLive && creep.ticksToLive > 1300) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'Creep still young, no renewal needed'
            };
        }
        // Check if spawn is spawning (can't renew while spawning)
        if (spawn.spawning) {
            return {
                status: TaskStatus.IN_PROGRESS,
                message: 'Waiting for spawn to finish spawning'
            };
        }
        // Check if spawn has enough energy to renew (costs energy)
        const renewCost = Math.ceil(this.calculateRenewCost(creep) * 0.1); // Estimate 10% of body cost
        if (spawn.store.getUsedCapacity(RESOURCE_ENERGY) < renewCost) {
            return {
                status: TaskStatus.FAILED,
                message: 'Spawn lacks energy for renewal'
            };
        }
        // Move to spawn if not adjacent
        if (!creep.pos.isNearTo(spawn)) {
            const moveResult = creep.moveTo(spawn, {
                visualizePathStyle: { stroke: '#00ff00' }
            });
            if (moveResult === OK) {
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Moving to spawn'
                };
            }
            else {
                return {
                    status: TaskStatus.FAILED,
                    message: `Movement failed: ${moveResult}`
                };
            }
        }
        // Renew the creep
        const renewResult = spawn.renewCreep(creep);
        switch (renewResult) {
            case OK:
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: `Renewing (TTL: ${creep.ticksToLive})`
                };
            case ERR_NOT_ENOUGH_ENERGY:
                return {
                    status: TaskStatus.FAILED,
                    message: 'Spawn out of energy'
                };
            case ERR_FULL:
                // Creep is fully renewed
                return {
                    status: TaskStatus.COMPLETED,
                    message: 'Fully renewed'
                };
            case ERR_BUSY:
                return {
                    status: TaskStatus.IN_PROGRESS,
                    message: 'Spawn busy, waiting'
                };
            default:
                return {
                    status: TaskStatus.FAILED,
                    message: `Renewal failed: ${renewResult}`
                };
        }
    }
    /**
     * Calculate approximate renewal cost based on body parts
     */
    calculateRenewCost(creep) {
        const costs = {
            [MOVE]: 50,
            [WORK]: 100,
            [CARRY]: 50,
            [ATTACK]: 80,
            [RANGED_ATTACK]: 150,
            [HEAL]: 250,
            [TOUGH]: 10,
            [CLAIM]: 600
        };
        return creep.body.reduce((sum, part) => sum + (costs[part.type] || 0), 0);
    }
}

/**
 * Factory for task executors
 *
 * Responsibility: Provide the correct TaskExecutor for any given TaskType
 * Strategy: Registry pattern - executors register themselves by task type
 *
 * This factory maintains a registry of TaskExecutor instances, one per TaskType.
 * Specific executors are registered as they are implemented (Phase IV-B, Phase IV-C, etc.)
 */
class ExecutorFactory {
    /**
     * Get the executor responsible for a specific task type
     *
     * Initializes executor registry on first use
     *
     * @param taskType - The type of task to get an executor for
     * @returns TaskExecutor instance or null if not yet implemented
     */
    static getExecutor(taskType) {
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
    static registerExecutor(taskType, executor) {
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
    static initializeExecutors() {
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
        const renewExecutor = new RenewExecutor();
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
        this.registerExecutor(TaskType.RENEW_CREEP, renewExecutor);
        // Register default idle
        this.registerExecutor(TaskType.IDLE, idleExecutor);
        console.log(`✅ ExecutorFactory initialized with ${this.executors.size} executors`);
    }
    /**
     * Get count of registered executors (useful for debugging)
     */
    static getExecutorCount() {
        return this.executors.size;
    }
    /**
     * Get list of registered task types (useful for debugging)
     */
    static getRegisteredTaskTypes() {
        return Array.from(this.executors.keys());
    }
}
/** Registry mapping task types to their executors */
ExecutorFactory.executors = new Map();

/**
 * Legatus Legionum - The Legion Commander
 *
 * Responsibility: Execute tasks assigned to creeps
 * Philosophy: Every creep is a soldier executing orders
 *
 * The Legion Commander ensures each creep executes its assigned task.
 * It coordinates with ExecutorFactory to delegate task execution to
 * specialized executors, then handles the results (completion, failure, etc.)
 */
class LegatusLegionum {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Execute tasks for all creeps in the room
     *
     * For each creep:
     * 1. Check if it has an assigned task
     * 2. If no task, try to assign one from available tasks
     * 3. If it has a task, execute it using the appropriate executor
     * 4. Handle the result (mark complete, reassign, etc.)
     */
    run(tasks) {
        const room = Game.rooms[this.roomName];
        if (!room)
            return;
        const creeps = room.find(FIND_MY_CREEPS);
        creeps.forEach(creep => {
            this.executeCreepTask(creep, tasks);
        });
    }
    /**
     * Execute the assigned task for a specific creep
     *
     * @param creep - The creep to execute a task for
     * @param tasks - Available tasks in the room
     */
    executeCreepTask(creep, tasks) {
        // Get creep's assigned task
        const taskId = creep.memory.task;
        if (!taskId) {
            // Creep has no task - assign one
            this.assignTask(creep, tasks);
            return;
        }
        const task = tasks.find(t => t.id === taskId);
        if (!task) {
            // Task no longer exists - clear and reassign
            console.log(`⚠️ ${creep.name}: Task ${taskId} not found, reassigning`);
            creep.memory.task = undefined;
            this.assignTask(creep, tasks);
            return;
        }
        // Get executor for this task type
        const executor = ExecutorFactory.getExecutor(task.type);
        if (!executor) {
            console.log(`⚠️ ${creep.name}: No executor for task type ${task.type}`);
            return;
        }
        // Execute the task
        console.log(`⚙️ ${creep.name}: Executing ${task.type} (${task.id})`);
        const result = executor.execute(creep, task);
        console.log(`📊 ${creep.name}: Result = ${result.status}, ${result.message}`);
        // Handle result
        this.handleTaskResult(creep, task, result);
    }
    /**
     * Assign a task to an idle creep
     *
     * Finds the highest priority task that:
     * 1. Needs more creeps assigned
     * 2. The creep is capable of performing (based on body parts and state)
     *
     * @param creep - The creep to assign a task to
     * @param tasks - Available tasks
     */
    assignTask(creep, tasks) {
        // Analyze creep body composition
        const workParts = creep.body.filter(p => p.type === WORK).length;
        const carryParts = creep.body.filter(p => p.type === CARRY).length;
        const attackParts = creep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
        // Check creep role for specialized filtering
        const role = creep.memory.role || 'worker';
        // Check if creep can do this task based on energy state
        const hasEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        const hasSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        // Filter tasks based on creep capabilities and state
        const suitableTasks = tasks.filter(t => {
            // Check if already assigned to this task
            if (t.assignedCreeps.includes(creep.name))
                return false;
            // SPECIALIZED ROLE FILTERING:
            // Harvesters ONLY harvest (never haul, build, upgrade, etc.)
            if (role === 'harvester' && t.type !== 'HARVEST_ENERGY') {
                return false;
            }
            // Haulers NEVER harvest (only pickup, haul, refill, withdraw)
            if (role === 'hauler' && t.type === 'HARVEST_ENERGY') {
                return false;
            }
            // Check if task is full - if so, can we displace someone less suitable?
            if (t.assignedCreeps.length >= t.creepsNeeded) {
                const myScore = this.calculateTaskSuitability(creep, t, workParts, carryParts, attackParts);
                const canDisplace = this.canDisplaceForTask(creep, t, myScore);
                if (!canDisplace)
                    return false;
            }
            // Energy transfer tasks require energy
            if (t.type === 'REFILL_SPAWN' || t.type === 'REFILL_EXTENSION' ||
                t.type === 'REFILL_TOWER' || t.type === 'HAUL_ENERGY' || t.type === 'PICKUP_ENERGY') {
                if (!hasEnergy && t.type === 'PICKUP_ENERGY')
                    return true; // Pickup needs space, not energy
                if (t.type !== 'PICKUP_ENERGY' && !hasEnergy)
                    return false;
            }
            // Harvest and pickup tasks require space
            if (t.type === 'HARVEST_ENERGY' || t.type === 'PICKUP_ENERGY' || t.type === 'WITHDRAW_ENERGY') {
                if (!hasSpace)
                    return false;
            }
            // Upgrade/build/repair - DON'T filter by energy, let executor handle getting energy
            // (Creeps can be assigned while empty, then go harvest, then execute the task)
            // Only UPGRADE requires energy (it's low priority and only for already-loaded creeps)
            if (t.type === 'UPGRADE_CONTROLLER') {
                if (!hasEnergy)
                    return false;
            }
            // Defense tasks require attack parts
            if (t.type === 'DEFEND_ROOM' && attackParts === 0)
                return false;
            return true;
        });
        // Debug: Log why no tasks available
        if (suitableTasks.length === 0) {
            console.log(`🔍 ${creep.name} - NO SUITABLE TASKS`);
            console.log(`  Energy: ${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity(RESOURCE_ENERGY)} (hasEnergy:${hasEnergy}, hasSpace:${hasSpace})`);
            console.log(`  Body: WORK:${workParts} CARRY:${carryParts} ATTACK:${attackParts}`);
            console.log(`  Total tasks: ${tasks.length}`);
            tasks.forEach(t => {
                const reason = [];
                if (t.assignedCreeps.length >= t.creepsNeeded)
                    reason.push('FULL');
                if (t.assignedCreeps.includes(creep.name))
                    reason.push('ALREADY_ASSIGNED');
                if (['REFILL_SPAWN', 'REFILL_EXTENSION', 'REFILL_TOWER', 'HAUL_ENERGY'].includes(t.type) && !hasEnergy)
                    reason.push('NEEDS_ENERGY');
                if (['HARVEST_ENERGY', 'PICKUP_ENERGY', 'WITHDRAW_ENERGY'].includes(t.type) && !hasSpace)
                    reason.push('NEEDS_SPACE');
                if (t.type === 'UPGRADE_CONTROLLER' && !hasEnergy)
                    reason.push('NEEDS_ENERGY');
                console.log(`    ${t.type} [${t.priority}] ${t.assignedCreeps.length}/${t.creepsNeeded} - ❌ ${reason.join(', ')}`);
            });
        }
        // Sort by priority (highest first)
        suitableTasks.sort((a, b) => b.priority - a.priority);
        const availableTask = suitableTasks[0];
        if (availableTask) {
            // Check if task is full and we need to displace someone
            if (availableTask.assignedCreeps.length >= availableTask.creepsNeeded) {
                const myScore = this.calculateTaskSuitability(creep, availableTask, workParts, carryParts, attackParts);
                this.displaceWeakestForTask(creep, availableTask, myScore);
            }
            else {
                // Normal assignment
                creep.memory.task = availableTask.id;
                creep.memory.targetId = availableTask.targetId;
                availableTask.assignedCreeps.push(creep.name);
                console.log(`📋 ${creep.name} assigned to ${availableTask.type} (target: ${availableTask.targetId})`);
            }
        }
        else {
            // No tasks available - assign idle task
            creep.memory.task = 'idle';
            creep.memory.targetId = undefined;
            console.log(`💤 ${creep.name} idle - no tasks available`);
        }
    }
    /**
     * Calculate how suitable a creep is for a specific task type
     * Higher score = better fit
     */
    calculateTaskSuitability(_creep, task, workParts, carryParts, attackParts) {
        let score = 0;
        switch (task.type) {
            case 'HARVEST_ENERGY':
                // Harvesters: WORK parts are king
                score = workParts * 10;
                break;
            case 'PICKUP_ENERGY':
            case 'REFILL_SPAWN':
            case 'REFILL_EXTENSION':
            case 'REFILL_TOWER':
            case 'HAUL_ENERGY':
                // Haulers: CARRY parts matter most, penalize WORK parts
                score = carryParts * 10 - workParts * 5;
                break;
            case 'UPGRADE_CONTROLLER':
                // Upgraders: WORK parts for speed
                score = workParts * 8;
                break;
            case 'BUILD':
            case 'REPAIR':
                // Builders: WORK and CARRY both useful
                score = workParts * 6 + carryParts * 4;
                break;
            case 'DEFEND_ROOM':
                // Defenders: ATTACK parts essential
                score = attackParts * 10;
                break;
            default:
                // Generic tasks: balanced creeps preferred
                score = workParts + carryParts;
        }
        return score;
    }
    /**
     * Check if this creep can displace someone less suitable for the task
     */
    canDisplaceForTask(_creep, task, myScore) {
        // Find least suitable assigned creep
        for (const assignedName of task.assignedCreeps) {
            const assignedCreep = Game.creeps[assignedName];
            if (!assignedCreep)
                continue;
            const workParts = assignedCreep.body.filter(p => p.type === WORK).length;
            const carryParts = assignedCreep.body.filter(p => p.type === CARRY).length;
            const attackParts = assignedCreep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
            const theirScore = this.calculateTaskSuitability(assignedCreep, task, workParts, carryParts, attackParts);
            if (myScore > theirScore) {
                return true; // We can displace at least one less suitable creep
            }
        }
        return false;
    }
    /**
     * Displace the least suitable creep and assign this one instead
     */
    displaceWeakestForTask(creep, task, myScore) {
        let weakestCreep = null;
        let weakestScore = myScore;
        // Find the least suitable assigned creep
        for (const assignedName of task.assignedCreeps) {
            const assignedCreep = Game.creeps[assignedName];
            if (!assignedCreep)
                continue;
            const workParts = assignedCreep.body.filter(p => p.type === WORK).length;
            const carryParts = assignedCreep.body.filter(p => p.type === CARRY).length;
            const attackParts = assignedCreep.body.filter(p => p.type === ATTACK || p.type === RANGED_ATTACK).length;
            const theirScore = this.calculateTaskSuitability(assignedCreep, task, workParts, carryParts, attackParts);
            if (theirScore < weakestScore) {
                weakestCreep = assignedCreep;
                weakestScore = theirScore;
            }
        }
        if (weakestCreep) {
            // Remove less suitable creep from task
            const index = task.assignedCreeps.indexOf(weakestCreep.name);
            if (index > -1) {
                task.assignedCreeps.splice(index, 1);
            }
            weakestCreep.memory.task = undefined;
            weakestCreep.memory.targetId = undefined;
            // Assign better suited creep
            creep.memory.task = task.id;
            creep.memory.targetId = task.targetId;
            task.assignedCreeps.push(creep.name);
            console.log(`⚔️ ${creep.name} (score:${myScore}) displaced ${weakestCreep.name} (score:${weakestScore}) from ${task.type}`);
        }
    }
    /**
     * Handle the result of a task execution
     *
     * @param creep - The creep that executed the task
     * @param task - The task that was executed
     * @param result - The result of the execution
     */
    handleTaskResult(creep, task, result) {
        if (result.status === TaskStatus.COMPLETED) {
            // Task complete - clear assignment
            creep.memory.task = undefined;
            creep.memory.targetId = undefined;
            const index = task.assignedCreeps.indexOf(creep.name);
            if (index > -1) {
                task.assignedCreeps.splice(index, 1);
            }
            console.log(`✅ ${creep.name} completed ${task.type}`);
        }
        else if (result.status === TaskStatus.FAILED) {
            // Task failed - log and clear
            console.log(`❌ ${creep.name} failed ${task.type}: ${result.message || 'Unknown error'}`);
            creep.memory.task = undefined;
            creep.memory.targetId = undefined;
            const index = task.assignedCreeps.indexOf(creep.name);
            if (index > -1) {
                task.assignedCreeps.splice(index, 1);
            }
        }
        else if (result.status === TaskStatus.BLOCKED) {
            // Task blocked - log and clear for reassignment
            console.log(`🚫 ${creep.name} blocked on ${task.type}: ${result.message || 'Task blocked'}`);
            creep.memory.task = undefined;
            const index = task.assignedCreeps.indexOf(creep.name);
            if (index > -1) {
                task.assignedCreeps.splice(index, 1);
            }
        }
        // IN_PROGRESS: Continue normally next tick
    }
}

/**
 * The Empire - The Principate
 *
 * The highest authority in Project Imperium. Orchestrates all subordinate systems
 * and executes the grand strategy each tick.
 *
 * Responsibilities:
 * - Initialize all Magistrate instances per room
 * - Execute the main decision cycle each tick
 * - Handle empire-wide state management
 * - Maintain the magistrate execution chain
 */
class Empire {
    constructor() {
        this.isInitialized = false;
        this.magistratesByRoom = new Map();
        console.log('🏛️ The Empire awakens...');
    }
    /**
     * Main execution function - called every game tick
     */
    run() {
        if (!this.isInitialized) {
            this.initialize();
        }
        // TODO: This will be expanded after Magistrate classes are built
        this.executeImperialStrategy();
    }
    initialize() {
        console.log('⚔️ Ave Imperator! Project Imperium initializing...');
        // TODO: Initialize Consuls (after they are created)
        // TODO: Initialize Magistrates for each room
        this.isInitialized = true;
    }
    executeImperialStrategy() {
        // High-level empire logic - coordinate all rooms
        // Each room has its own magistrate council
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            // Only manage rooms we control
            if (room.controller && room.controller.my) {
                this.manageColonia(room);
            }
        }
    }
    /**
     * Manage a single colony (room) through its magistrate council
     * Executes the full decision and execution chain
     */
    manageColonia(room) {
        // Get or create magistrates for this room
        if (!this.magistratesByRoom.has(room.name)) {
            this.magistratesByRoom.set(room.name, {
                archivist: new LegatusArchivus(room.name),
                taskmaster: new LegatusOfficio(room.name),
                broodmother: new LegatusGenetor(room.name),
                architect: new LegatusFabrum(room.name),
                trailblazer: new LegatusViae(room.name),
                legionCommander: new LegatusLegionum(room.name)
            });
        }
        const magistrates = this.magistratesByRoom.get(room.name);
        // Initialize room memory for tasks if needed
        if (!room.memory.tasks) {
            room.memory.tasks = [];
        }
        // Execute the Magistrate chain in order
        // 1. Archivist observes the room state
        const report = magistrates.archivist.run(room);
        console.log(`📊 ${room.name} Report: energyDeficit=${report.energyDeficit}, sources=${report.sources.length}, upgraderShortage=${report.controller.upgraderRecommendation - report.controller.upgraderCount}`);
        // Debug source info
        report.sources.forEach((s, i) => {
            console.log(`   Source ${i}: energy=${s.energy}, harvesters=${s.harvestersPresent}/${s.harvestersNeeded}`);
        });
        // 2. Taskmaster generates tasks based on the report
        // Use existing tasks from memory, or generate new ones if none exist
        let tasks = room.memory.tasks || [];
        // Clean up completed tasks (no assigned creeps and not needed anymore)
        tasks = tasks.filter(t => t.assignedCreeps.length > 0 || t.creepsNeeded > 0);
        // Generate new tasks if we have none, or refresh periodically (every 10 ticks)
        if (tasks.length === 0 || Game.time % 10 === 0) {
            const newTasks = magistrates.taskmaster.run(report);
            // Merge new tasks with existing ones (preserve assignments)
            // Match by targetId to handle ID format changes
            newTasks.forEach(newTask => {
                const existing = tasks.find(t => t.type === newTask.type &&
                    t.targetId === newTask.targetId);
                if (existing) {
                    // Update existing task with new ID format and priority
                    existing.id = newTask.id; // CRITICAL: Update to new stable ID format
                    existing.priority = newTask.priority;
                    existing.creepsNeeded = newTask.creepsNeeded;
                }
                else {
                    // Add new task
                    tasks.push(newTask);
                }
            });
            // Remove tasks that no longer exist in newTasks (target gone)
            tasks = tasks.filter(t => newTasks.some(nt => nt.type === t.type && nt.targetId === t.targetId));
            console.log(`📋 ${room.name}: Refreshed tasks - ${tasks.length} total`);
        }
        if (tasks.length > 0) {
            tasks.forEach(t => console.log(`   - ${t.type} (priority ${t.priority}, ${t.assignedCreeps.length}/${t.creepsNeeded} creeps)`));
        }
        // Store tasks in room memory for persistence
        room.memory.tasks = tasks;
        // 3. Broodmother spawns creeps based on tasks
        magistrates.broodmother.run(tasks);
        // 4. Legion Commander executes tasks with existing creeps
        magistrates.legionCommander.run(tasks);
        // 5. Architect handles construction
        magistrates.architect.run();
        // 6. Trailblazer handles pathfinding and movement
        magistrates.trailblazer.run();
    }
}

// Initialize the Empire once (persists across ticks via global scope)
const empire = new Empire();
// This is the main game loop - called every tick by Screeps
const loop = () => {
    try {
        // Clear dead creep memory
        for (const name in Memory.creeps) {
            if (!(name in Game.creeps)) {
                delete Memory.creeps[name];
            }
        }
        // Execute the Empire's master plan
        empire.run();
    }
    catch (error) {
        console.log(`❌ CRITICAL ERROR in main loop: ${error}`);
        if (error instanceof Error) {
            console.log(`Stack: ${error.stack}`);
        }
    }
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
