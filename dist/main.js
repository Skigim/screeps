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
            return {
                id: source.id,
                pos: { x: source.pos.x, y: source.pos.y },
                energy: source.energy,
                energyCapacity: source.energyCapacity,
                harvestersPresent: harvesters.length,
                harvestersNeeded: 2 // Simple default - can be improved
            };
        });
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
        this.taskIdCounter = 0;
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
        // Sort by priority (highest first)
        return tasks.sort((a, b) => b.priority - a.priority);
    }
    createDefenseTasks(report) {
        const tasks = [];
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
                    id: this.generateTaskId(),
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
    createTowerRefillTasks(report) {
        const tasks = [];
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
    createRepairTasks(repairTargets) {
        const tasks = [];
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
    createUpgradeTasks(report) {
        const tasks = [];
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
    generateTaskId() {
        return `task_${this.roomName}_${Game.time}_${this.taskIdCounter++}`;
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
        // Check if we need more creeps
        const creepCount = Object.keys(Game.creeps).filter(name => Game.creeps[name].memory.room === this.roomName).length;
        // Early game: maintain minimum population
        const minCreeps = 6;
        const maxCreeps = 15;
        if (creepCount >= maxCreeps)
            return;
        // Determine what type of creep to spawn based on room needs
        const energy = room.energyAvailable;
        // Only spawn if we have enough energy (don't spawn weak creeps)
        const minEnergyToSpawn = creepCount < minCreeps ? 200 : 300;
        if (energy < minEnergyToSpawn)
            return;
        // Decide body type based on current population and needs
        const creepType = this.determineNeededCreepType(room, tasks);
        const body = this.designCreepBody(creepType, energy);
        if (body.length === 0)
            return;
        const cost = this.calculateBodyCost(body);
        const role = creepType; // 'worker', 'hauler', 'defender', etc.
        const request = {
            priority: creepCount < minCreeps ? 100 : 50, // Emergency priority if below min
            body: body,
            memory: {
                role: role,
                room: this.roomName
            },
            initialTask: undefined, // Workers are not spawned for specific tasks
            cost: cost,
            role: role
        };
        this.spawnCreep(spawns[0], request);
    }
    /**
     * Determine what type of creep the room needs most
     */
    determineNeededCreepType(room, _tasks) {
        const creeps = Object.values(Game.creeps).filter(c => c.memory.room === this.roomName);
        // Count creeps by capability
        const workCreeps = creeps.filter(c => c.getActiveBodyparts(WORK) > 0).length;
        const carryCreeps = creeps.filter(c => c.getActiveBodyparts(CARRY) > 0).length;
        const attackCreeps = creeps.filter(c => c.getActiveBodyparts(ATTACK) > 0).length;
        // Check for defense needs
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        if (hostiles.length > 0 && attackCreeps < 2) {
            return 'defender';
        }
        // Early game: need workers who can do everything
        if (workCreeps < 4) {
            return 'worker'; // WORK + CARRY + MOVE - can harvest, build, upgrade, transfer
        }
        // Mid game: specialized haulers for efficiency
        if (carryCreeps < workCreeps * 0.5) {
            return 'hauler'; // Mostly CARRY + MOVE - fast energy transport
        }
        // Default: balanced worker
        return 'worker';
    }
    /**
     * Design a creep body based on type and available energy
     */
    designCreepBody(type, energy) {
        switch (type) {
            case 'worker':
                return this.designWorker(energy);
            case 'hauler':
                return this.designHauler(energy);
            case 'defender':
                return this.designDefender(energy);
            default:
                return this.designWorker(energy);
        }
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
     * Design a specialized hauler: Mostly CARRY + MOVE
     * Fast energy transport
     */
    designHauler(energy) {
        // Hauler: Maximize CARRY with MOVE for speed
        const parts = [];
        // At least 1 WORK for emergency harvesting
        if (energy >= 150) {
            parts.push(WORK);
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 150;
        }
        // Rest is CARRY + MOVE
        while (energy >= 100) {
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 100;
        }
        return parts.length > 0 ? parts : [CARRY, MOVE];
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
    spawnCreep(spawn, request) {
        const name = `${request.role}_${Game.time}`;
        const result = spawn.spawnCreep(request.body, name, { memory: request.memory });
        if (result === OK) {
            console.log(`🏛️ Spawning ${request.role}: ${name} (${request.cost} energy)`);
        }
        else if (result === ERR_NOT_ENOUGH_ENERGY) ;
        else {
            console.log(`⚠️ Failed to spawn ${request.role}: ${result}`);
        }
    }
}

/**
 * Legatus Fabrum - The Architect
 *
 * Responsibility: Place construction sites according to room blueprints
 * Philosophy: Every room should be a masterpiece of efficiency
 *
 * The Architect plans and places structures to optimize room layout.
 * This is complex logic that will be implemented in future phases.
 */
class LegatusFabrum {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze room and place construction sites
     * TODO: Implement room planning logic
     */
    run() {
        // STUB: Room planning logic will be implemented later
        // This will include:
        // - Extension placement optimization
        // - Road planning (coordinate with Legatus Viae)
        // - Defense structure placement
        // - Storage and terminal positioning
        // Suppress unused variable warning - will be used in future implementation
        void this.roomName;
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
        // Check if creep is out of energy
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'No energy',
                workDone: 0
            };
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
        // Check if creep is out of energy
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            return {
                status: TaskStatus.COMPLETED,
                message: 'No energy',
                workDone: 0
            };
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
        const isSpecializedHarvester = workParts > carryParts; // More WORK than CARRY = harvester
        // Check if creep can do this task based on energy state
        const hasEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        const hasSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        // Filter tasks based on creep capabilities and state
        const suitableTasks = tasks.filter(t => {
            // Task needs more creeps
            if (t.assignedCreeps.length >= t.creepsNeeded)
                return false;
            if (t.assignedCreeps.includes(creep.name))
                return false;
            // Specialized harvesters should focus on harvesting, not pickup
            if (t.type === 'PICKUP_ENERGY' && isSpecializedHarvester) {
                return false; // Let general workers handle pickup
            }
            // Energy transfer tasks require energy
            if (t.type === 'REFILL_SPAWN' || t.type === 'REFILL_EXTENSION' ||
                t.type === 'REFILL_TOWER' || t.type === 'HAUL_ENERGY') {
                if (!hasEnergy)
                    return false;
            }
            // Harvest and pickup tasks require space
            if (t.type === 'HARVEST_ENERGY' || t.type === 'PICKUP_ENERGY' || t.type === 'WITHDRAW_ENERGY') {
                if (!hasSpace)
                    return false;
            }
            // Upgrade/build/repair require energy
            if (t.type === 'UPGRADE_CONTROLLER' || t.type === 'BUILD' || t.type === 'REPAIR') {
                if (!hasEnergy)
                    return false;
            }
            return true;
        });
        // Debug: Log why no tasks available
        if (suitableTasks.length === 0) {
            console.log(`🔍 ${creep.name} - NO SUITABLE TASKS`);
            console.log(`  Energy: ${creep.store[RESOURCE_ENERGY]}/${creep.store.getCapacity(RESOURCE_ENERGY)} (hasEnergy:${hasEnergy}, hasSpace:${hasSpace})`);
            console.log(`  Body: WORK:${workParts} CARRY:${carryParts} (specialized:${isSpecializedHarvester})`);
            console.log(`  Total tasks: ${tasks.length}`);
            tasks.forEach(t => {
                const reason = [];
                if (t.assignedCreeps.length >= t.creepsNeeded)
                    reason.push('FULL');
                if (t.assignedCreeps.includes(creep.name))
                    reason.push('ALREADY_ASSIGNED');
                if (t.type === 'PICKUP_ENERGY' && isSpecializedHarvester)
                    reason.push('SPECIALIZED_HARVESTER');
                if (['REFILL_SPAWN', 'REFILL_EXTENSION', 'REFILL_TOWER', 'HAUL_ENERGY'].includes(t.type) && !hasEnergy)
                    reason.push('NEEDS_ENERGY');
                if (['HARVEST_ENERGY', 'PICKUP_ENERGY', 'WITHDRAW_ENERGY'].includes(t.type) && !hasSpace)
                    reason.push('NEEDS_SPACE');
                if (['UPGRADE_CONTROLLER', 'BUILD', 'REPAIR'].includes(t.type) && !hasEnergy)
                    reason.push('NEEDS_ENERGY');
                console.log(`    ${t.type} [${t.priority}] ${t.assignedCreeps.length}/${t.creepsNeeded} - ❌ ${reason.join(', ')}`);
            });
        }
        // Sort by priority (highest first)
        suitableTasks.sort((a, b) => b.priority - a.priority);
        const availableTask = suitableTasks[0];
        if (availableTask) {
            creep.memory.task = availableTask.id;
            creep.memory.targetId = availableTask.targetId; // Set targetId so Archivist can count us
            availableTask.assignedCreeps.push(creep.name);
            console.log(`📋 ${creep.name} assigned to ${availableTask.type} (target: ${availableTask.targetId})`);
        }
        else {
            // No tasks available - assign idle task
            creep.memory.task = 'idle';
            creep.memory.targetId = undefined;
            console.log(`💤 ${creep.name} idle - no tasks available`);
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
            newTasks.forEach(newTask => {
                const existing = tasks.find(t => t.type === newTask.type &&
                    t.targetId === newTask.targetId);
                if (existing) {
                    // Update existing task's priority and needs
                    existing.priority = newTask.priority;
                    existing.creepsNeeded = newTask.creepsNeeded;
                }
                else {
                    // Add new task
                    tasks.push(newTask);
                }
            });
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
