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
        // Haul energy from containers to spawns/extensions
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
        // Always have an upgrade task available
        const upgraderShortage = report.controller.upgraderRecommendation -
            report.controller.upgraderCount;
        if (upgraderShortage > 0 || report.controller.ticksToDowngrade < 5000) {
            const priority = report.controller.ticksToDowngrade < 5000 ? 90 : 55;
            tasks.push({
                id: this.generateTaskId(),
                type: TaskType.UPGRADE_CONTROLLER,
                priority: priority,
                targetId: report.controller.id,
                creepsNeeded: Math.max(1, upgraderShortage),
                assignedCreeps: []
            });
        }
        return tasks;
    }
    generateTaskId() {
        return `task_${this.roomName}_${Game.time}_${this.taskIdCounter++}`;
    }
}

/**
 * Legatus Genetor - The Broodmother
 *
 * Responsibility: Design and spawn creeps optimized for tasks
 * Philosophy: The right tool for the right job
 *
 * The Broodmother looks at the task queue and determines if a new creep
 * is needed. If so, it designs the perfect body for that task.
 */
class LegatusGenetor {
    constructor(roomName) {
        this.roomName = roomName;
    }
    /**
     * Analyze tasks and spawn creeps as needed
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
        // Find highest priority task that needs creeps
        const taskNeedingCreeps = tasks.find(t => t.assignedCreeps.length < t.creepsNeeded);
        if (!taskNeedingCreeps)
            return;
        // Design and spawn a creep for this task
        const request = this.designCreep(taskNeedingCreeps, room);
        if (request) {
            this.spawnCreep(spawns[0], request);
        }
    }
    designCreep(task, room) {
        var _a;
        const energy = room.energyAvailable;
        // Design body based on task type
        let body = [];
        let role = '';
        switch (task.type) {
            case TaskType.HARVEST_ENERGY:
                body = this.designHarvester(energy);
                role = 'harvester';
                break;
            case TaskType.HAUL_ENERGY:
            case TaskType.REFILL_TOWER:
            case TaskType.REFILL_SPAWN:
            case TaskType.REFILL_EXTENSION:
                body = this.designHauler(energy);
                role = 'hauler';
                break;
            case TaskType.BUILD:
                body = this.designBuilder(energy);
                role = 'builder';
                break;
            case TaskType.REPAIR:
                body = this.designRepairer(energy);
                role = 'repairer';
                break;
            case TaskType.UPGRADE_CONTROLLER:
                body = this.designUpgrader(energy);
                role = 'upgrader';
                break;
            case TaskType.DEFEND_ROOM:
                body = this.designDefender(energy);
                role = 'defender';
                break;
            default:
                body = this.designWorker(energy);
                role = 'worker';
        }
        if (body.length === 0)
            return null;
        const cost = this.calculateBodyCost(body);
        return {
            priority: task.priority,
            body: body,
            memory: {
                role: role,
                room: this.roomName,
                task: task.id,
                targetId: (_a = task.targetId) === null || _a === void 0 ? void 0 : _a.toString()
            },
            initialTask: task,
            cost: cost,
            role: role
        };
    }
    designHarvester(energy) {
        // Optimal harvester: 1 WORK per 2 MOVE for speed
        // Max 5 WORK parts (source energy/tick limit)
        const parts = [];
        const maxWork = 5;
        let workParts = 0;
        while (energy >= 150 && workParts < maxWork) {
            parts.push(WORK);
            parts.push(MOVE);
            workParts++;
            energy -= 150;
        }
        // Add carry for pickup
        if (energy >= 50) {
            parts.push(CARRY);
            energy -= 50;
        }
        return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
    }
    designHauler(energy) {
        // Hauler: Maximize CARRY with MOVE for speed
        const parts = [];
        while (energy >= 100) {
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 100;
        }
        return parts.length > 0 ? parts : [CARRY, MOVE];
    }
    designBuilder(energy) {
        // Builder: Balanced WORK, CARRY, MOVE
        const parts = [];
        while (energy >= 200) {
            parts.push(WORK);
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 200;
        }
        return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
    }
    designRepairer(energy) {
        // Same as builder
        return this.designBuilder(energy);
    }
    designUpgrader(energy) {
        // Upgrader: More WORK than builder for efficiency
        const parts = [];
        while (energy >= 300) {
            parts.push(WORK);
            parts.push(WORK);
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 300;
        }
        return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
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
    designWorker(energy) {
        // Generic worker: balanced parts
        const parts = [];
        while (energy >= 200) {
            parts.push(WORK);
            parts.push(CARRY);
            parts.push(MOVE);
            energy -= 200;
        }
        return parts.length > 0 ? parts : [WORK, CARRY, MOVE];
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
                trailblazer: new LegatusViae(room.name)
            });
        }
        const magistrates = this.magistratesByRoom.get(room.name);
        // Execute the Magistrate chain in order
        // 1. Archivist observes the room state
        const report = magistrates.archivist.run(room);
        // 2. Taskmaster generates tasks based on the report
        const tasks = magistrates.taskmaster.run(report);
        // 3. Broodmother spawns creeps based on tasks
        magistrates.broodmother.run(tasks);
        // 4. Architect handles construction
        magistrates.architect.run();
        // 5. Trailblazer handles pathfinding and movement
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
