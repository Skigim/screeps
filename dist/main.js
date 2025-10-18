'use strict';

/**
 * SPAWN MANAGER MODULE
 *
 * Manages creep spawning strategy and body design for RCL1 foundation.
 *
 * Spawning Priority (RCL1):
 * 1. Minimum 2 harvesters (critical - economy collapses without them)
 * 2. Minimum 2 upgraders (prevent controller downgrade)
 * 3. Builders only if construction sites exist (max 2)
 * 4. Scale up upgraders if excess energy (max 4)
 *
 * Body Design Philosophy:
 * - Simple [WORK, CARRY, MOVE] repeating pattern
 * - Scales automatically with available energy
 * - Cost per unit: 200 energy
 * - Balanced: 1 WORK (mining/building), 1 CARRY (transport), 1 MOVE (speed)
 */
/**
 * Manages spawning for a single spawn structure.
 * Evaluates current room state and spawns the highest priority creep.
 *
 * @param spawn - The spawn structure to manage
 * @param room - The room the spawn is in
 * @param harvesterCount - Current number of harvester creeps
 * @param upgraderCount - Current number of upgrader creeps
 * @param builderCount - Current number of builder creeps
 *
 * @remarks
 * This function should be called once per tick per spawn.
 * It will only spawn one creep per call (spawn can only spawn one at a time).
 *
 * @example
 * ```typescript
 * const spawn = Game.spawns['Spawn1'];
 * const room = spawn.room;
 * const creeps = room.find(FIND_MY_CREEPS);
 * const harvesterCount = creeps.filter(c => c.memory.role === 'harvester').length;
 * const upgraderCount = creeps.filter(c => c.memory.role === 'upgrader').length;
 * const builderCount = creeps.filter(c => c.memory.role === 'builder').length;
 *
 * manageSpawn(spawn, room, harvesterCount, upgraderCount, builderCount);
 * ```
 */
function manageSpawn(spawn, room, harvesterCount, upgraderCount, builderCount) {
    // Don't try to spawn if already spawning
    if (spawn.spawning)
        return;
    const energy = room.energyAvailable;
    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    // PRIORITY 1: Emergency - Always maintain minimum harvesters
    // Without harvesters, no energy flows and the economy collapses
    if (harvesterCount < 2) {
        spawnHarvester(spawn, room, energy);
        return;
    }
    // PRIORITY 2: Maintain upgraders to prevent controller downgrade
    // Controller downgrade would reset RCL progress and waste time
    if (upgraderCount < 2) {
        spawnUpgrader(spawn, room, energy);
        return;
    }
    // PRIORITY 3: Spawn builder if construction sites exist
    // Only spawn builders when there's work for them to do
    if (constructionSites.length > 0 && builderCount < 2) {
        spawnBuilder(spawn, room, energy);
        return;
    }
    // PRIORITY 4: Expansion - Add more upgraders if we have energy to spare
    // More upgraders = faster RCL progression
    // Only spawn if we have at least 550 energy (can afford decent body)
    if (upgraderCount < 4 && energy >= 550) {
        spawnUpgrader(spawn, room, energy);
        return;
    }
    // No spawning needed at this time
}
/**
 * Spawns a harvester creep with optimal body for available energy.
 *
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnHarvester(spawn, room, energy) {
    const body = getBody(energy);
    const result = spawn.spawnCreep(body, `harvester_${Game.time}`, {
        memory: { role: 'harvester', room: room.name, working: false }
    });
    if (result === OK) {
        console.log(`🌾 Spawning harvester with ${energy} energy (${body.length} parts)`);
    }
    // Possible errors: ERR_NOT_ENOUGH_ENERGY, ERR_NAME_EXISTS, ERR_BUSY
}
/**
 * Spawns an upgrader creep with optimal body for available energy.
 *
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnUpgrader(spawn, room, energy) {
    const body = getBody(energy);
    const result = spawn.spawnCreep(body, `upgrader_${Game.time}`, {
        memory: { role: 'upgrader', room: room.name, working: false }
    });
    if (result === OK) {
        console.log(`⬆️ Spawning upgrader with ${energy} energy (${body.length} parts)`);
    }
}
/**
 * Spawns a builder creep with optimal body for available energy.
 *
 * @param spawn - The spawn structure to use
 * @param room - The room to spawn in
 * @param energy - Available energy for spawning
 */
function spawnBuilder(spawn, room, energy) {
    const body = getBody(energy);
    const result = spawn.spawnCreep(body, `builder_${Game.time}`, {
        memory: { role: 'builder', room: room.name, working: false }
    });
    if (result === OK) {
        console.log(`🔨 Spawning builder with ${energy} energy (${body.length} parts)`);
    }
}
/**
 * Designs an optimal creep body based on available energy.
 *
 * Pattern: [WORK, CARRY, MOVE] repeating
 * - WORK: 100 energy (harvests 2 energy/tick, builds 5 progress/tick)
 * - CARRY: 50 energy (holds 50 energy)
 * - MOVE: 50 energy (moves 1 tile/tick on roads, 1 tile/2 ticks on plain)
 *
 * Cost per unit: 200 energy
 *
 * Examples:
 * - 300 energy → [W, C, M] (minimum viable)
 * - 550 energy → [W, C, M, W, C, M] (2 units)
 * - 800 energy → [W, C, M, W, C, M, W, C, M] (3 units)
 *
 * @param energy - Available energy for body design
 * @returns Array of body part constants
 *
 * @remarks
 * Max body size is 50 parts (hard limit in Screeps).
 * This function caps at 12 parts (4 units) to keep CPU cost reasonable.
 *
 * The [W,C,M] pattern ensures:
 * - Balanced performance (work + carry + mobility)
 * - No bottlenecks (can work and carry simultaneously)
 * - Efficient movement (1 MOVE per 2 parts)
 */
function getBody(energy) {
    const body = [];
    // Start with basic unit cost
    const unitCost = 200; // WORK (100) + CARRY (50) + MOVE (50)
    let remainingEnergy = energy;
    // Add [W, C, M] units until we run out of energy or hit size limit
    // Cap at 12 parts (4 units) to keep CPU cost reasonable for RCL1
    while (remainingEnergy >= unitCost && body.length < 12) {
        body.push(WORK, CARRY, MOVE);
        remainingEnergy -= unitCost;
    }
    // Minimum viable creep: At least one [W, C, M] unit
    // This ensures the creep can actually perform its job
    if (body.length === 0) {
        body.push(WORK, CARRY, MOVE); // Force at least one unit (200 energy)
    }
    return body;
}

/**
 * HARVESTER BEHAVIOR MODULE
 *
 * The harvester is the backbone of your economy in Screeps.
 * It gathers energy from sources and delivers it to spawn/extensions.
 *
 * RCL1 Strategy:
 * - Harvest from the nearest active source
 * - Deliver energy to spawn first (ensures spawning never stops)
 * - If spawn is full, deliver to extensions (RCL2+)
 * - If all structures are full, help upgrade the controller
 *
 * State Machine:
 * - working: false → Creep is empty, needs to harvest
 * - working: true → Creep is full, needs to deliver energy
 */
/**
 * Main behavior function for harvester role.
 * Called once per game tick for each harvester creep.
 *
 * @param creep - The creep to run harvester behavior on
 *
 * @example
 * ```typescript
 * const harvester = Game.creeps['harvester_12345'];
 * runHarvester(harvester);
 * ```
 */
function runHarvester(creep) {
    // State machine: Switch between harvesting and delivering
    // When completely full, switch to "working" (delivering) mode
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    // When completely empty, switch to harvesting mode
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    if (!creep.memory.working) {
        // HARVESTING MODE: Get energy from source
        harvestEnergy(creep);
    }
    else {
        // DELIVERING MODE: Deliver energy to structures
        deliverEnergy(creep);
    }
}
/**
 * Harvests energy from the nearest active source.
 *
 * Flow:
 * 1. Find the closest active source (has energy remaining)
 * 2. If in range, harvest from it
 * 3. If not in range, move towards it
 *
 * @param creep - The creep that should harvest
 *
 * @remarks
 * Uses pathfinding with yellow visualization for easy debugging.
 * Active sources are those with energy > 0.
 */
function harvestEnergy(creep) {
    // Find the nearest source that still has energy
    const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
    if (source) {
        // Try to harvest. Returns OK if successful, or an error code
        const result = creep.harvest(source);
        if (result === ERR_NOT_IN_RANGE) {
            // Too far away, move closer
            creep.travelTo(source);
        }
        // Other possible errors (ERR_NOT_ENOUGH_RESOURCES, ERR_BUSY, etc.)
        // are handled automatically by the game engine
    }
}
/**
 * Delivers energy to spawn, extensions, or controller.
 *
 * Priority system:
 * 1. Spawn first (critical - enables spawning new creeps)
 * 2. Extensions next (RCL2+, increases spawn capacity)
 * 3. Controller if all structures are full (don't waste time)
 *
 * @param creep - The creep that should deliver energy
 *
 * @remarks
 * This ensures your spawn never runs out of energy, which would
 * halt creep production and potentially collapse your economy.
 */
function deliverEnergy(creep) {
    // Find all spawn and extension structures that need energy
    const targets = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return ((structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_EXTENSION) &&
                structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
        }
    });
    if (targets.length > 0) {
        // Priority: Spawn first, then closest extension
        const spawn = targets.find(t => t.structureType === STRUCTURE_SPAWN);
        const target = spawn || targets[0];
        const result = creep.transfer(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(target);
        }
    }
    else {
        // All spawn/extensions full, help with upgrading
        // This prevents wasting harvester time when storage is full
        upgradeControllerFallback$1(creep);
    }
}
/**
 * Fallback behavior: Upgrade controller when no delivery targets.
 *
 * This prevents harvesters from idling when spawn and extensions
 * are full. Instead, they contribute to controller progress.
 *
 * @param creep - The creep that should upgrade
 */
function upgradeControllerFallback$1(creep) {
    const controller = creep.room.controller;
    if (controller) {
        const result = creep.upgradeController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(controller);
        }
    }
}

/**
 * UPGRADER BEHAVIOR MODULE
 *
 * Upgraders maintain and improve your Room Controller Level (RCL).
 * They withdraw energy from spawn/extensions and upgrade the controller.
 *
 * Why upgraders matter:
 * - Prevent controller downgrade (critical at low RCL)
 * - Unlock new structures and capabilities at each RCL
 * - RCL1→2 unlocks extensions (300 energy capacity each)
 * - RCL2→3 unlocks towers, walls, ramparts
 *
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should upgrade
 */
/**
 * Main behavior function for upgrader role.
 * Called once per game tick for each upgrader creep.
 *
 * @param creep - The creep to run upgrader behavior on
 *
 * @example
 * ```typescript
 * const upgrader = Game.creeps['upgrader_12345'];
 * runUpgrader(upgrader);
 * ```
 */
function runUpgrader(creep) {
    // State machine: Switch between withdrawing and upgrading
    // When empty, switch to withdrawing mode
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    // When full, switch to upgrading mode
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    if (!creep.memory.working) {
        // WITHDRAWING MODE: Get energy from spawn/extensions
        withdrawEnergy$1(creep);
    }
    else {
        // UPGRADING MODE: Upgrade the controller
        upgradeController(creep);
    }
}
/**
 * Withdraws energy from spawn or extensions.
 *
 * Strategy:
 * 1. Find spawn and extensions with available energy
 * 2. Prefer spawn first (leave extensions for spawning if possible)
 * 3. If spawn is empty, use closest extension
 * 4. Move and withdraw
 *
 * @param creep - The creep that should withdraw energy
 *
 * @remarks
 * This creates a "reserve" strategy where extensions are primarily
 * used for spawning, and upgraders take from spawn when possible.
 */
function withdrawEnergy$1(creep) {
    // Find spawn and extensions with energy available
    const sources = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return ((structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_EXTENSION) &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
        }
    });
    if (sources.length > 0) {
        // Prefer spawn first (reserve extensions for spawning), then closest
        const spawn = sources.find(s => s.structureType === STRUCTURE_SPAWN);
        const target = spawn || sources[0];
        const result = creep.withdraw(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(target);
        }
    }
    // If no sources found, creep will wait until energy is available
}
/**
 * Upgrades the room controller with carried energy.
 *
 * The controller is the heart of your room:
 * - Upgrading increases progress towards next RCL
 * - Each upgrade action consumes 1 energy per WORK part
 * - Controller downgrades if not upgraded regularly
 *
 * @param creep - The creep that should upgrade the controller
 *
 * @remarks
 * At RCL1, controller downgrade timer is 20,000 ticks (~6.7 hours).
 * At RCL2+, this increases significantly.
 */
function upgradeController(creep) {
    const controller = creep.room.controller;
    if (controller) {
        const result = creep.upgradeController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(controller);
        }
        // Possible errors: ERR_NOT_ENOUGH_RESOURCES (out of energy),
        // ERR_INVALID_TARGET (controller doesn't exist), etc.
    }
}

/**
 * BUILDER BEHAVIOR MODULE
 *
 * Builders construct structures from construction sites.
 * They withdraw energy and build roads, extensions, towers, etc.
 *
 * RCL1 Strategy:
 * - Only spawn builders when construction sites exist
 * - Withdraw energy from spawn/extensions
 * - Build the nearest construction site
 * - If no sites exist, help upgrade controller (don't idle)
 *
 * Construction priorities (managed externally):
 * - Extensions (increase spawn energy capacity)
 * - Roads (reduce creep fatigue, increase efficiency)
 * - Containers (energy storage near sources)
 *
 * State Machine:
 * - working: false → Creep is empty, needs energy
 * - working: true → Creep has energy, should build
 */
/**
 * Main behavior function for builder role.
 * Called once per game tick for each builder creep.
 *
 * @param creep - The creep to run builder behavior on
 *
 * @example
 * ```typescript
 * const builder = Game.creeps['builder_12345'];
 * runBuilder(builder);
 * ```
 */
function runBuilder(creep) {
    // State machine: Switch between withdrawing and building
    // When empty, switch to withdrawing mode
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    // When full, switch to building mode
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    if (!creep.memory.working) {
        // WITHDRAWING MODE: Get energy from spawn/extensions
        withdrawEnergy(creep);
    }
    else {
        // BUILDING MODE: Build construction sites or upgrade if none exist
        buildOrUpgrade(creep);
    }
}
/**
 * Withdraws energy from spawn or extensions.
 *
 * Strategy:
 * 1. Find spawn and extensions with available energy
 * 2. Prefer spawn first (same as upgrader strategy)
 * 3. Move and withdraw
 *
 * @param creep - The creep that should withdraw energy
 *
 * @remarks
 * Builders use the same withdrawal strategy as upgraders to
 * minimize competition for extension energy during spawning.
 */
function withdrawEnergy(creep) {
    // Find spawn and extensions with energy available
    const sources = creep.room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return ((structure.structureType === STRUCTURE_SPAWN ||
                structure.structureType === STRUCTURE_EXTENSION) &&
                structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
        }
    });
    if (sources.length > 0) {
        // Prefer spawn first, then closest extension
        const spawn = sources.find(s => s.structureType === STRUCTURE_SPAWN);
        const target = spawn || sources[0];
        const result = creep.withdraw(target, RESOURCE_ENERGY);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(target);
        }
    }
}
/**
 * Builds construction sites or upgrades controller as fallback.
 *
 * Priority:
 * 1. Build nearest construction site
 * 2. If no sites, upgrade controller (prevent idling)
 *
 * @param creep - The creep that should build
 *
 * @remarks
 * Construction sites are created manually or by planning code.
 * This function just executes the building, not the planning.
 *
 * Each build action consumes 5 energy and adds 5 progress to site.
 * A creep with multiple WORK parts builds faster (5 progress per WORK).
 */
function buildOrUpgrade(creep) {
    // Find the nearest construction site
    const site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
    if (site) {
        // Construction site exists, build it
        const result = creep.build(site);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(site);
        }
    }
    else {
        // No construction sites, help upgrade controller instead
        // This prevents builders from idling when construction is complete
        upgradeControllerFallback(creep);
    }
}
/**
 * Fallback behavior: Upgrade controller when no construction sites.
 *
 * This prevents builders from idling and wasting CPU when there's
 * nothing to build. They contribute to RCL progress instead.
 *
 * @param creep - The creep that should upgrade
 */
function upgradeControllerFallback(creep) {
    const controller = creep.room.controller;
    if (controller) {
        const result = creep.upgradeController(controller);
        if (result === ERR_NOT_IN_RANGE) {
            creep.travelTo(controller);
        }
    }
}

/**
 * CREEP BEHAVIOR CONFIGURATION SYSTEM
 *
 * This module defines creep behaviors for each RCL level.
 * Each RCL can have different strategies, spawning priorities, and role distributions.
 *
 * Architecture:
 * - BehaviorConfig: Defines what roles exist at an RCL and their spawn priorities
 * - rclBehaviors: Maps RCL level → BehaviorConfig
 * - getBehaviorConfig: Gets the active config for a room's current RCL
 */
/**
 * RCL1 Behavior Configuration
 *
 * At RCL1, we focus on the core economy:
 * - Harvesters: Gather energy from sources
 * - Upgraders: Keep controller from downgrading
 * - Builders: Build towards extensions for RCL2
 *
 * Note: No spawning/extensions yet, so minimal infrastructure.
 */
const rcl1Behavior = {
    rcl: 1,
    name: 'RCL1 Foundation',
    description: 'Core economy: harvest, upgrade, build',
    roles: [
        {
            name: 'harvester',
            priority: 100,
            targetCount: 2,
            body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            options: { comment: 'Dual work parts for faster harvesting' }
        },
        {
            name: 'upgrader',
            priority: 90,
            targetCount: 1,
            body: [WORK, CARRY, MOVE],
            options: { comment: 'Keep controller from downgrading' }
        },
        {
            name: 'builder',
            priority: 80,
            targetCount: 1,
            body: [WORK, CARRY, MOVE],
            options: { comment: 'Build extensions for RCL2' }
        }
    ]
};
/**
 * RCL2 Behavior Configuration (placeholder)
 *
 * At RCL2, we unlock extensions and expand capacity.
 * This is a placeholder for future implementation.
 */
const rcl2Behavior = {
    rcl: 2,
    name: 'RCL2 Expansion',
    description: 'With extensions: scale economy and build infrastructure',
    roles: [
        {
            name: 'harvester',
            priority: 100,
            targetCount: 3,
            body: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
            options: { comment: 'More harvesters with extensions' }
        },
        {
            name: 'upgrader',
            priority: 90,
            targetCount: 2,
            body: [WORK, CARRY, MOVE],
            options: { comment: 'Increase upgrade speed' }
        },
        {
            name: 'builder',
            priority: 80,
            targetCount: 2,
            body: [WORK, CARRY, MOVE],
            options: { comment: 'Build more infrastructure' }
        }
    ]
};
/**
 * Map of RCL level to behavior configuration
 */
const rclBehaviors = {
    1: rcl1Behavior,
    2: rcl2Behavior
};
/**
 * Get the behavior configuration for a room's current RCL
 *
 * @param rcl - The room's controller level
 * @returns The behavior config for this RCL, or RCL1 as fallback
 *
 * @example
 * ```typescript
 * const config = getBehaviorConfig(room.controller!.level);
 * const harvesters = config.roles.filter(r => r.name === 'harvester');
 * ```
 */
function getBehaviorConfig(rcl) {
    return rclBehaviors[rcl] || rclBehaviors[1];
}

/**
 * CREEP SPAWNING LOGIC BASED ON BEHAVIOR CONFIG
 *
 * This module uses the behavior configuration system to:
 * - Determine which roles should be spawned
 * - Check if we're below target counts
 * - Generate appropriate bodies based on config
 */
/**
 * Get all roles that need spawning (below target count)
 *
 * @param room - The room to check
 * @returns Array of SpawnRequests sorted by priority (highest first)
 *
 * @example
 * ```typescript
 * const requests = getSpawnRequests(room);
 * const topPriority = requests[0];
 * console.log(`Should spawn ${topPriority.role} (priority ${topPriority.priority})`);
 * ```
 */
function getSpawnRequests(room) {
    var _a;
    const config = getBehaviorConfig(((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 1);
    const requests = [];
    // Count current creeps by role
    const creepsByRole = countCreepsByRole$1(room);
    // Check each role to see if we need more
    for (const roleConfig of config.roles) {
        const currentCount = creepsByRole[roleConfig.name] || 0;
        if (currentCount < roleConfig.targetCount) {
            requests.push({
                role: roleConfig.name,
                body: roleConfig.body,
                priority: roleConfig.priority,
                reason: `${roleConfig.name} (${currentCount}/${roleConfig.targetCount})`
            });
        }
    }
    // Sort by priority (highest first)
    return requests.sort((a, b) => b.priority - a.priority);
}
/**
 * Count creeps in room grouped by role
 *
 * @param room - The room to count creeps in
 * @returns Object with role names as keys and counts as values
 */
function countCreepsByRole$1(room) {
    const counts = {};
    for (const creep of room.find(FIND_MY_CREEPS)) {
        const role = creep.memory.role || 'unknown';
        counts[role] = (counts[role] || 0) + 1;
    }
    return counts;
}
/**
 * Get a human-readable summary of current vs target creep composition
 *
 * @param room - The room to analyze
 * @returns Formatted status string
 *
 * @example
 * ```
 * Harvesters: 2/2 ✓ | Upgraders: 1/1 ✓ | Builders: 0/1 ⚠️
 * ```
 */
function getSpawnStatus(room) {
    var _a;
    const config = getBehaviorConfig(((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 1);
    const counts = countCreepsByRole$1(room);
    const parts = [];
    for (const roleConfig of config.roles) {
        const current = counts[roleConfig.name] || 0;
        const target = roleConfig.targetCount;
        const status = current >= target ? '✓' : '⚠️';
        parts.push(`${roleConfig.name}: ${current}/${target} ${status}`);
    }
    return parts.join(' | ');
}

/**
 * CREEP TASK SYSTEM
 *
 * Allows assigning simple tasks to creeps via console.
 * Tasks override normal role behavior when active.
 *
 * Example tasks:
 * - harvest(sourceId)
 * - deliver(structureId)
 * - build(siteId)
 * - upgrade()
 * - move(x, y, roomName)
 */
/**
 * Get task assigned to a creep
 *
 * @param creep - The creep to check
 * @returns The current task, or undefined
 */
function getTask(creep) {
    if (!creep.memory.task) {
        return undefined;
    }
    return creep.memory.task;
}
/**
 * Assign a task to a creep
 *
 * @param creep - The creep to assign to
 * @param task - The task to assign
 */
function assignTask(creep, task) {
    task.assignedAt = Game.time;
    task.status = 'pending';
    creep.memory.task = task;
}
/**
 * Clear task from a creep
 *
 * @param creep - The creep to clear
 */
function clearTask(creep) {
    creep.memory.task = undefined;
}
/**
 * Create a harvest task
 *
 * @param sourceId - The source's id
 * @returns Task object
 */
function createHarvestTask(sourceId) {
    return {
        type: 'harvest',
        targetId: sourceId,
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create a deliver task
 *
 * @param structureId - The structure's id (spawn, extension, container, etc.)
 * @returns Task object
 */
function createDeliverTask(structureId) {
    return {
        type: 'deliver',
        targetId: structureId,
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create a build task
 *
 * @param siteId - The construction site's id
 * @returns Task object
 */
function createBuildTask(siteId) {
    return {
        type: 'build',
        targetId: siteId,
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create an upgrade task
 *
 * @returns Task object
 */
function createUpgradeTask() {
    return {
        type: 'upgrade',
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create a move task
 *
 * @param x - Target X coordinate
 * @param y - Target Y coordinate
 * @param roomName - Target room
 * @returns Task object
 */
function createMoveTask(x, y, roomName) {
    return {
        type: 'move',
        targetPos: { x, y, roomName },
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create a repair task
 *
 * @param structureId - The structure's id
 * @returns Task object
 */
function createRepairTask(structureId) {
    return {
        type: 'repair',
        targetId: structureId,
        priority: 'normal',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Create an idle task (do nothing)
 *
 * @returns Task object
 */
function createIdleTask() {
    return {
        type: 'idle',
        priority: 'low',
        assignedAt: Game.time,
        status: 'pending'
    };
}
/**
 * Get task status as a human-readable string
 */
function getTaskDescription(task) {
    var _a, _b;
    switch (task.type) {
        case 'harvest': {
            const source = Game.getObjectById(task.targetId);
            return `Harvest from ${source ? source.pos : task.targetId}`;
        }
        case 'deliver': {
            const target = Game.getObjectById(task.targetId);
            return `Deliver to ${target ? target.pos : task.targetId}`;
        }
        case 'build': {
            const site = Game.getObjectById(task.targetId);
            return `Build ${site ? site.pos : task.targetId}`;
        }
        case 'upgrade':
            return 'Upgrade controller';
        case 'move':
            return `Move to ${(_a = task.targetPos) === null || _a === void 0 ? void 0 : _a.x},${(_b = task.targetPos) === null || _b === void 0 ? void 0 : _b.y}`;
        case 'repair': {
            const structure = Game.getObjectById(task.targetId);
            return `Repair ${structure ? structure.pos : task.targetId}`;
        }
        case 'idle':
            return 'Idle (do nothing)';
        default:
            return 'Unknown task';
    }
}

/**
 * CREEP DISPATCHER MODULE
 *
 * Central dispatcher for all creep role behaviors.
 * This module imports role-specific behaviors and routes each creep
 * to the correct handler based on its role.
 *
 * Architecture:
 * - Each role has its own file (harvester.ts, upgrader.ts, builder.ts)
 * - behaviors.ts defines RCL-specific configurations
 * - This index exports a unified `runCreep` function
 * - Main loop calls `runCreep` for each creep
 *
 * Adding new roles:
 * 1. Create new file (e.g., src/world/creeps/repairer.ts)
 * 2. Import it here: import { runRepairer } from './repairer';
 * 3. Add case to switch statement below
 * 4. Add role to appropriate RCL config in behaviors.ts
 */
/**
 * Dispatches a creep to its role-specific behavior.
 *
 * This is the single entry point for running creep behaviors.
 * It reads the creep's role from memory and calls the appropriate function.
 *
 * @param creep - The creep to run behavior for
 *
 * @remarks
 * If a creep has an unknown role, a warning is logged but no error is thrown.
 * This prevents one bad creep from crashing the entire game loop.
 *
 * @example
 * ```typescript
 * const creeps = room.find(FIND_MY_CREEPS);
 * creeps.forEach(creep => runCreep(creep));
 * ```
 */
function runCreep(creep) {
    // Dispatch based on role stored in creep memory
    switch (creep.memory.role) {
        case 'harvester':
            runHarvester(creep);
            break;
        case 'upgrader':
            runUpgrader(creep);
            break;
        case 'builder':
            runBuilder(creep);
            break;
        default:
            // Unknown role - log warning but don't crash
            console.log(`⚠️ Unknown role '${creep.memory.role}' for creep ${creep.name}`);
            break;
    }
}

/**
 * ROOM VISUAL DISPLAY SYSTEM
 *
 * Renders structure names and labels as visual markers on the map.
 * Persists display state for 3 ticks when activated.
 * Labels are stored in memory to survive ticks.
 */
/**
 * Display structure names as room visuals
 *
 * @param roomName - Name of room to display labels in
 * @param duration - How many ticks to display (default 3)
 */
function showNames$1(roomName, duration = 3) {
    if (!Memory.empire) {
        Memory.empire = {};
    }
    if (!Memory.empire.visuals) {
        Memory.empire.visuals = {};
    }
    Memory.empire.visuals[roomName] = {
        expiresAt: Game.time + duration
    };
    console.log(`👁️  Displaying structure names in ${roomName} for ${duration} ticks`);
}
/**
 * Hide structure name displays
 *
 * @param roomName - Name of room to hide labels in
 */
function hideNames$1(roomName) {
    var _a, _b;
    if ((_b = (_a = Memory.empire) === null || _a === void 0 ? void 0 : _a.visuals) === null || _b === void 0 ? void 0 : _b[roomName]) {
        delete Memory.empire.visuals[roomName];
    }
    console.log(`🚫 Hidden structure names in ${roomName}`);
}
/**
 * Check if names should be displayed in a room
 */
function shouldShowNames(roomName) {
    var _a, _b;
    if (!((_b = (_a = Memory.empire) === null || _a === void 0 ? void 0 : _a.visuals) === null || _b === void 0 ? void 0 : _b[roomName])) {
        return false;
    }
    const visual = Memory.empire.visuals[roomName];
    return Game.time <= visual.expiresAt;
}
/**
 * Render all visible structure names in a room as visual text
 * Call this each tick in your room orchestrator
 */
function renderStructureNames(room) {
    if (!shouldShowNames(room.name)) {
        return;
    }
    const visual = new RoomVisual(room.name);
    // Get all structures from registry
    const registry = Memory.structures || {};
    for (const [id, info] of Object.entries(registry)) {
        if (info.roomName !== room.name)
            continue;
        // Get the actual object in the room
        const obj = Game.getObjectById(id);
        if (!obj || !obj.pos)
            continue;
        // Draw the name at the structure's position
        let color = '#00FF00'; // Green by default
        // Color by type for better visibility
        if (info.type === 'source') {
            color = '#FFFF00'; // Yellow for sources
        }
        else if (info.type === 'controller') {
            color = '#0066FF'; // Blue for controller
        }
        else if (info.locked) {
            color = '#FF0000'; // Red if locked
        }
        else if (info.type === 'site') {
            color = '#FF9900'; // Orange for construction sites
        }
        // Draw text label above the structure
        visual.text(info.name, obj.pos.x, obj.pos.y - 0.5, {
            color,
            font: 0.6,
            align: 'center',
            backgroundColor: '#000000'
        });
        // Draw a small circle indicator
        visual.circle(obj.pos.x, obj.pos.y, {
            radius: 0.3,
            fill: 'transparent',
            stroke: color
        });
    }
}

/**
 * STRUCTURE REGISTRY & NAMING SYSTEM
 *
 * Automatically assigns human-readable names to structures.
 * Stores mapping between IDs and names in Memory.
 *
 * Examples:
 * - Sources: SourceA, SourceB
 * - Spawns: SpawnMain, SpawnBackup
 * - Extensions: ExtensionA, ExtensionB
 * - Containers: ContainerA, ContainerB
 * - Controllers: ControllerMain
 */
/**
 * Get or create the structures registry in memory
 */
function getRegistry() {
    if (!Memory.structures) {
        Memory.structures = {};
    }
    return Memory.structures;
}
/**
 * Register a structure with a name
 */
function registerStructure(id, name, type, roomName) {
    const registry = getRegistry();
    registry[id] = {
        id,
        name,
        type,
        roomName,
        locked: false,
        createdAt: Game.time
    };
}
/**
 * Get ID for a structure by name
 */
function getStructureId(name) {
    const registry = getRegistry();
    for (const [id, info] of Object.entries(registry)) {
        if (info.name === name) {
            return id;
        }
    }
    return undefined;
}
/**
 * Scan room and auto-name structures and construction sites
 */
function scanRoom(room) {
    const registry = getRegistry();
    // Sources
    const sources = room.find(FIND_SOURCES);
    sources.forEach((source, index) => {
        if (!registry[source.id]) {
            const letter = String.fromCharCode(65 + index); // A, B, C...
            registerStructure(source.id, `Source${letter}`, 'source', room.name);
        }
    });
    // Spawns
    const spawns = room.find(FIND_MY_SPAWNS);
    spawns.forEach((spawn, index) => {
        if (!registry[spawn.id]) {
            const name = index === 0 ? 'SpawnMain' : `SpawnBackup${index}`;
            registerStructure(spawn.id, name, 'spawn', room.name);
        }
    });
    // Extensions
    const extensions = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION
    });
    extensions.forEach((ext, index) => {
        if (!registry[ext.id]) {
            const letter = String.fromCharCode(65 + index);
            registerStructure(ext.id, `Extension${letter}`, 'extension', room.name);
        }
    });
    // Containers (they're resources, not structures in the Screeps API)
    // Skip containers in this scan as they're handled separately
    // Storage
    const storage = room.find(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_STORAGE
    });
    storage.forEach(stor => {
        if (!registry[stor.id]) {
            registerStructure(stor.id, 'Storage', 'storage', room.name);
        }
    });
    // Controller
    if (room.controller && !registry[room.controller.id]) {
        registerStructure(room.controller.id, 'Controller', 'controller', room.name);
    }
    // Construction sites - name them site1, site2, etc.
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    sites.forEach(site => {
        if (!registry[site.id]) {
            // Find the next available site number
            let siteNum = 1;
            while (Object.values(registry).some(s => s.name === `site${siteNum}` && s.roomName === room.name)) {
                siteNum++;
            }
            registerStructure(site.id, `site${siteNum}`, 'site', room.name);
        }
    });
}
/**
 * Lock a structure (prevent actions on it)
 */
function lockStructure(nameOrId) {
    const registry = getRegistry();
    const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);
    if (!id || !registry[id]) {
        return false;
    }
    registry[id].locked = true;
    return true;
}
/**
 * Unlock a structure
 */
function unlockStructure(nameOrId) {
    const registry = getRegistry();
    const id = registry[nameOrId] ? nameOrId : getStructureId(nameOrId);
    if (!id || !registry[id]) {
        return false;
    }
    registry[id].locked = false;
    return true;
}
/**
 * Rename a structure
 */
function renameStructure(oldNameOrId, newName) {
    const registry = getRegistry();
    const id = registry[oldNameOrId] ? oldNameOrId : getStructureId(oldNameOrId);
    if (!id || !registry[id]) {
        return false;
    }
    // Check if new name is already taken
    for (const [otherId, info] of Object.entries(registry)) {
        if (otherId !== id && info.name === newName) {
            return false; // Name conflict
        }
    }
    registry[id].name = newName;
    return true;
}
/**
 * Get all locked structures
 */
function getLockedStructures(roomName) {
    const registry = getRegistry();
    return Object.values(registry).filter(s => s.locked && (!roomName || s.roomName === roomName));
}
/**
 * List all structures (for debugging)
 */
function listStructures(roomName) {
    const registry = getRegistry();
    const structures = roomName
        ? Object.values(registry).filter(s => s.roomName === roomName)
        : Object.values(registry);
    if (structures.length === 0) {
        console.log('No structures registered');
        return;
    }
    console.log('\nRegistered Structures:');
    console.log('─'.repeat(80));
    for (const info of structures) {
        const locked = info.locked ? '🔒' : '🔓';
        console.log(`${locked} ${info.name.padEnd(20)} | ${info.type.padEnd(12)} | ${info.roomName} | ${info.id.substring(0, 8)}...`);
    }
    console.log('');
}
/**
 * Auto-rename completed construction sites to final names
 * Called each tick to detect completed sites and rename them
 */
function updateConstructionSites(room) {
    const registry = getRegistry();
    // Find all completed structures that were built from sites
    const completedStructures = room.find(FIND_MY_STRUCTURES);
    completedStructures.forEach(struct => {
        // Check if this structure is NOT in the registry with a permanent name
        const existing = Object.values(registry).find(s => s.id === struct.id);
        // If it's not registered, register it
        if (!existing) {
            let name = '';
            const type = struct.structureType;
            // Generate name based on type and existing count
            switch (type) {
                case STRUCTURE_EXTENSION: {
                    const count = Object.values(registry).filter(s => s.type === 'extension' && s.roomName === room.name).length;
                    const letter = String.fromCharCode(65 + count);
                    name = `Extension${letter}`;
                    break;
                }
                case STRUCTURE_TOWER: {
                    const count = Object.values(registry).filter(s => s.type === 'tower' && s.roomName === room.name).length;
                    const letter = String.fromCharCode(65 + count);
                    name = `Tower${letter}`;
                    break;
                }
                case STRUCTURE_STORAGE:
                    name = 'Storage';
                    break;
                case STRUCTURE_RAMPART: {
                    const count = Object.values(registry).filter(s => s.type === 'rampart' && s.roomName === room.name).length;
                    const letter = String.fromCharCode(65 + count);
                    name = `Rampart${letter}`;
                    break;
                }
                default:
                    name = `${type}${Game.time}`;
            }
            registerStructure(struct.id, name, type, room.name);
        }
    });
    // Check for completed construction sites and rename them
    const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
    const siteIds = new Set(sites.map(s => s.id));
    // If a registered site is no longer in the construction list, it was completed
    const registryArray = Object.entries(registry);
    for (const [id, info] of registryArray) {
        if (info.roomName === room.name && info.type === 'site' && !siteIds.has(id)) {
            // Site completed! Remove the site entry - it will be picked up as a new structure above
            delete registry[id];
        }
    }
}

/**
 * ROOM ORCHESTRATOR MODULE
 *
 * Coordinates all activities within a single room.
 * This is the "conductor" that brings together spawning, creep behaviors,
 * and room-level strategy.
 *
 * Responsibilities:
 * - Run spawn manager to maintain creep population
 * - Dispatch creep behaviors based on role
 * - Report room statistics for debugging
 * - Handle room-level optimizations (future: tower management, link logic, etc.)
 *
 * RCL1 Focus:
 * - Simple priority-based spawning
 * - Role-based creep behaviors
 * - Energy flow optimization
 */
/**
 * Runs all logic for a single owned room.
 * Called once per tick for each room under your control.
 *
 * This is the main orchestration function that:
 * 1. Counts creeps by role
 * 2. Manages spawning via spawn manager
 * 3. Runs behavior for each creep
 * 4. Reports statistics
 *
 * @param room - The room to orchestrate
 *
 * @remarks
 * This function should only be called for rooms with a controller
 * that you own (room.controller.my === true).
 *
 * @example
 * ```typescript
 * for (const roomName in Game.rooms) {
 *   const room = Game.rooms[roomName];
 *   if (room.controller && room.controller.my) {
 *     runRoom(room);
 *   }
 * }
 * ```
 */
function runRoom(room) {
    // Find the primary spawn in this room
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) {
        // No spawn in this room, can't do much yet
        return;
    }
    // Update construction sites each tick (rename completed ones)
    updateConstructionSites(room);
    // Get all creeps in this room
    const creeps = room.find(FIND_MY_CREEPS);
    // Count creeps by role for spawn manager
    const roleCounts = countCreepsByRole(creeps);
    const { harvesterCount, upgraderCount, builderCount } = roleCounts;
    // Log room statistics for debugging (every 100 ticks to reduce console spam)
    if (Game.time % 100 === 0) {
        logRoomStats(room, roleCounts);
    }
    // Manage spawning based on current population
    manageSpawn(spawn, room, harvesterCount, upgraderCount, builderCount);
    // Run behavior for each creep in the room
    runCreeps(creeps);
    // Render structure name visuals if enabled
    renderStructureNames(room);
}
/**
 * Counts creeps by their role.
 *
 * @param creeps - Array of creeps to count
 * @returns Object with counts for each role
 *
 * @remarks
 * This is more efficient than filtering multiple times,
 * and makes it easy to add new roles in the future.
 */
function countCreepsByRole(creeps) {
    const harvesters = creeps.filter(c => c.memory.role === 'harvester');
    const upgraders = creeps.filter(c => c.memory.role === 'upgrader');
    const builders = creeps.filter(c => c.memory.role === 'builder');
    return {
        harvesterCount: harvesters.length,
        upgraderCount: upgraders.length,
        builderCount: builders.length
    };
}
/**
 * Logs room statistics to console for debugging.
 *
 * Shows:
 * - Room name
 * - Creep counts by role (H=harvesters, U=upgraders, B=builders)
 * - Current RCL (Room Controller Level)
 *
 * @param room - The room to log stats for
 * @param roleCounts - Counts of creeps by role
 *
 * @remarks
 * This is useful for debugging and monitoring room performance.
 * In production, you might want to reduce console spam by logging
 * only every N ticks or when values change.
 */
function logRoomStats(room, roleCounts) {
    const { harvesterCount, upgraderCount, builderCount } = roleCounts;
    const rcl = room.controller ? room.controller.level : 0;
    console.log(`📊 ${room.name}: H=${harvesterCount}, U=${upgraderCount}, B=${builderCount}, RCL=${rcl}`);
}
/**
 * Runs behavior for all creeps in the room.
 *
 * Dispatches each creep to its role-specific behavior function
 * via the unified creep dispatcher.
 *
 * @param creeps - Array of creeps to run
 *
 * @remarks
 * The actual role logic is in src/world/creeps/*.ts files.
 * This function just iterates and dispatches to the right handler.
 */
function runCreeps(creeps) {
    creeps.forEach(creep => {
        runCreep(creep);
    });
}

/**
 * EMPIRE MANAGEMENT MODULE
 *
 * Manages empire-wide settings and policies that affect behavior across all rooms.
 * Two operational modes:
 * - COMMAND: Direct manual control - you make all decisions
 * - DELEGATE: Automatic AI control - empire handles spawning, construction, etc.
 */
/**
 * Initialize empire memory if not present
 */
function initializeEmpireMemory() {
    if (!Memory.empire) {
        Memory.empire = {};
    }
    if (!Memory.empire.mode) {
        Memory.empire.mode = 'delegate';
        Memory.empire.modeChangedAt = Game.time;
    }
}
/**
 * Get current empire mode
 *
 * @returns Current mode: 'command' or 'delegate'
 */
function getMode() {
    initializeEmpireMemory();
    return Memory.empire.mode || 'delegate';
}
/**
 * Set empire mode
 *
 * @param mode - 'command' or 'delegate'
 * @returns true if mode changed, false if already in that mode
 */
function setMode(mode) {
    initializeEmpireMemory();
    const currentMode = Memory.empire.mode;
    if (currentMode === mode) {
        return false;
    }
    Memory.empire.mode = mode;
    Memory.empire.modeChangedAt = Game.time;
    return true;
}
/**
 * Get ticks since last mode change
 */
function getTicksSinceModeChange() {
    initializeEmpireMemory();
    const changedAt = Memory.empire.modeChangedAt || 0;
    return Game.time - changedAt;
}
/**
 * Display mode information
 */
function displayModeInfo() {
    const mode = getMode();
    const ticksSince = getTicksSinceModeChange();
    const modeEmoji = mode === 'command' ? '⚔️' : '📋';
    const modeDescription = mode === 'command'
        ? 'Direct Control - You are in command of all operations'
        : 'Delegation Mode - AI handles spawn priorities and construction';
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`${modeEmoji} EMPIRE MODE: ${mode.toUpperCase()}`);
    console.log(`${'═'.repeat(60)}`);
    console.log(`${modeDescription}`);
    console.log(`Mode active for: ${ticksSince} ticks`);
    console.log(`${'═'.repeat(60)}\n`);
}

/**
 * LEGATUS OF OFICIO - THE TASKMASTER
 *
 * Central command processor for creep management.
 * Stores room context and task queues, relaying commands to creeps.
 * Reduces per-creep memory overhead by centralizing command dispatch.
 *
 * The Legatus receives orders and distributes them to the appropriate creeps,
 * tracking execution state without burdening individual creep memory.
 */
/**
 * Get the Legatus registry for a room
 */
function getLegatus(roomName) {
    if (!Memory.empire) {
        Memory.empire = {};
    }
    if (!Memory.empire.legatus) {
        Memory.empire.legatus = {};
    }
    const legatus = Memory.empire.legatus;
    if (!legatus[roomName]) {
        legatus[roomName] = {
            room: roomName,
            assignments: [],
            lastUpdated: Game.time
        };
    }
    return legatus[roomName];
}
/**
 * Get all current assignments in a room
 *
 * @param roomName - Room to query
 * @returns Array of assignments
 */
function getRoomAssignments(roomName) {
    const legatus = getLegatus(roomName);
    return legatus.assignments;
}
/**
 * Get status of Legatus in a room
 */
function getLegaStatus(roomName) {
    const legatus = getLegatus(roomName);
    return `🎯 Legatus ${roomName}: ${legatus.assignments.length} active assignments`;
}
/**
 * List all assignments in a room (for debugging)
 */
function listLegaAssignments(roomName) {
    const legatus = getLegatus(roomName);
    if (legatus.assignments.length === 0) {
        console.log(`📋 Legatus ${roomName}: No assignments`);
        return;
    }
    console.log(`\n📋 Legatus ${roomName}: ${legatus.assignments.length} assignments`);
    console.log('─'.repeat(80));
    for (const assignment of legatus.assignments) {
        const ageInTicks = Game.time - assignment.assignedAt;
        console.log(`${assignment.creepName.padEnd(25)} | ${assignment.command.type.padEnd(10)} | Age: ${ageInTicks} ticks`);
    }
    console.log('');
}

/**
 * BODY CONFIG REGISTRY
 *
 * Stores named body configurations for easy creep spawning.
 * Allows preset bodies and dynamic body construction.
 *
 * Examples:
 * - registerBody('harvester1', [WORK, CARRY, MOVE])
 * - registerBody('scout', [MOVE])
 * - spawnCreep('Scout1', 'scout', 'scout', 'W1N1')
 */
/**
 * Get or create the body registry in memory
 */
function getBodyRegistry() {
    if (!Memory.empire) {
        Memory.empire = {};
    }
    if (!Memory.empire.bodyConfigs) {
        Memory.empire.bodyConfigs = {};
    }
    return Memory.empire.bodyConfigs;
}
/**
 * Register a named body configuration
 *
 * @param name - Name of the body type (e.g., 'harvester_basic', 'scout')
 * @param parts - Array of body parts (e.g., [WORK, CARRY, MOVE])
 * @param role - Optional: the role this body is designed for
 */
function registerBody(name, parts, role = 'generic') {
    const registry = getBodyRegistry();
    registry[name] = {
        name,
        parts,
        role,
        createdAt: Game.time
    };
}
/**
 * Get a registered body configuration
 *
 * @param nameOrArray - Name of registered body, or array of parts
 * @returns Array of body parts, or undefined if not found
 */
function getBodyConfig(nameOrArray) {
    var _a;
    // If it's already an array, return it
    if (Array.isArray(nameOrArray)) {
        return nameOrArray;
    }
    // Otherwise look it up
    const registry = getBodyRegistry();
    return (_a = registry[nameOrArray]) === null || _a === void 0 ? void 0 : _a.parts;
}
/**
 * List all registered body configurations
 */
function listBodyConfigs(role) {
    const registry = getBodyRegistry();
    const configs = role
        ? Object.values(registry).filter(c => c.role === role)
        : Object.values(registry);
    if (configs.length === 0) {
        console.log('📦 No body configurations registered');
        return;
    }
    console.log(`\n📦 Body Configurations${role ? ` (${role})` : ''}:`);
    console.log('─'.repeat(80));
    for (const config of configs) {
        const partNames = config.parts.map(p => {
            switch (p) {
                case WORK: return 'W';
                case CARRY: return 'C';
                case MOVE: return 'M';
                case ATTACK: return 'A';
                case HEAL: return 'H';
                case RANGED_ATTACK: return 'R';
                case TOUGH: return 'T';
                case CLAIM: return 'CL';
                default: return p;
            }
        }).join('');
        console.log(`  ${config.name.padEnd(25)} | ${config.role.padEnd(15)} | [${partNames}]`);
    }
    console.log('');
}
/**
 * Get body cost (energy required to spawn)
 */
function getBodyCost(nameOrArray) {
    const parts = getBodyConfig(nameOrArray);
    if (!parts) {
        return 0;
    }
    let cost = 0;
    for (const part of parts) {
        cost += BODYPART_COST[part];
    }
    return cost;
}
/**
 * Register default/preset body types
 * Called once on startup
 */
function registerDefaultBodies() {
    // RCL1 Harvester - balanced for early game
    registerBody('harvester_basic', [WORK, CARRY, MOVE], 'harvester');
    // RCL1 Upgrader
    registerBody('upgrader_basic', [WORK, CARRY, MOVE], 'upgrader');
    // RCL1 Builder
    registerBody('builder_basic', [WORK, CARRY, MOVE], 'builder');
    // Scout - minimal, just movement
    registerBody('scout', [MOVE], 'scout');
    // Hauler - lots of carry, minimal work
    registerBody('hauler', [CARRY, CARRY, CARRY, MOVE, MOVE], 'hauler');
    // Worker - balanced work and carry
    registerBody('worker', [WORK, WORK, CARRY, MOVE], 'worker');
}

/**
 * To start using Traveler, require it in main.js:
 * Example: var Traveler = require('Traveler.js');
 */
class Traveler {
    /**
     * move creep to destination
     * @param creep
     * @param destination
     * @param options
     * @returns {number}
     */
    static travelTo(creep, destination, options = {}) {
        // uncomment if you would like to register hostile rooms entered
        // this.updateRoomStatus(creep.room);
        if (!destination) {
            return ERR_INVALID_ARGS;
        }
        if (creep.fatigue > 0) {
            Traveler.circle(creep.pos, "aqua", .3);
            return ERR_TIRED;
        }
        destination = this.normalizePos(destination);
        // manage case where creep is nearby destination
        let rangeToDestination = creep.pos.getRangeTo(destination);
        if (options.range && rangeToDestination <= options.range) {
            return OK;
        }
        else if (rangeToDestination <= 1) {
            if (rangeToDestination === 1 && !options.range) {
                let direction = creep.pos.getDirectionTo(destination);
                if (options.returnData) {
                    options.returnData.nextPos = destination;
                    options.returnData.path = direction.toString();
                }
                return creep.move(direction);
            }
            return OK;
        }
        // initialize data object
        if (!creep.memory._trav) {
            delete creep.memory._travel;
            creep.memory._trav = {};
        }
        let travelData = creep.memory._trav;
        let state = this.deserializeState(travelData, destination);
        // uncomment to visualize destination
        // this.circle(destination.pos, "orange");
        // check if creep is stuck
        if (this.isStuck(creep, state)) {
            state.stuckCount++;
            Traveler.circle(creep.pos, "magenta", state.stuckCount * .2);
        }
        else {
            state.stuckCount = 0;
        }
        // handle case where creep is stuck
        if (!options.stuckValue) {
            options.stuckValue = DEFAULT_STUCK_VALUE;
        }
        if (state.stuckCount >= options.stuckValue && Math.random() > .5) {
            options.ignoreCreeps = false;
            options.freshMatrix = true;
            delete travelData.path;
        }
        // TODO:handle case where creep moved by some other function, but destination is still the same
        // delete path cache if destination is different
        if (!this.samePos(state.destination, destination)) {
            if (options.movingTarget && state.destination.isNearTo(destination)) {
                travelData.path = (travelData.path || "") + state.destination.getDirectionTo(destination);
                state.destination = destination;
            }
            else {
                delete travelData.path;
            }
        }
        if (options.repath && Math.random() < options.repath) {
            // add some chance that you will find a new path randomly
            delete travelData.path;
        }
        // pathfinding
        let newPath = false;
        if (!travelData.path) {
            newPath = true;
            if (creep.spawning) {
                return ERR_BUSY;
            }
            state.destination = destination;
            let cpu = Game.cpu.getUsed();
            let ret = this.findTravelPath(creep.pos, destination, options);
            let cpuUsed = Game.cpu.getUsed() - cpu;
            state.cpu = _.round(cpuUsed + state.cpu);
            if (state.cpu > REPORT_CPU_THRESHOLD) {
                // see note at end of file for more info on this
                console.log(`TRAVELER: heavy cpu use: ${creep.name}, cpu: ${state.cpu} origin: ${creep.pos}, dest: ${destination}`);
            }
            let color = "orange";
            if (ret.incomplete) {
                // uncommenting this is a great way to diagnose creep behavior issues
                // console.log(`TRAVELER: incomplete path for ${creep.name}`);
                color = "red";
            }
            if (options.returnData) {
                options.returnData.pathfinderReturn = ret;
            }
            travelData.path = Traveler.serializePath(creep.pos, ret.path, color);
            state.stuckCount = 0;
        }
        this.serializeState(creep, destination, state, travelData);
        if (!travelData.path || travelData.path.length === 0) {
            return ERR_NO_PATH;
        }
        // consume path
        if (state.stuckCount === 0 && !newPath) {
            travelData.path = travelData.path.substr(1);
        }
        let nextDirection = parseInt(travelData.path[0], 10);
        if (options.returnData) {
            if (nextDirection) {
                let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
                if (nextPos) {
                    options.returnData.nextPos = nextPos;
                }
            }
            options.returnData.state = state;
            options.returnData.path = travelData.path;
        }
        return creep.move(nextDirection);
    }
    /**
     * make position objects consistent so that either can be used as an argument
     * @param destination
     * @returns {any}
     */
    static normalizePos(destination) {
        if (!(destination instanceof RoomPosition)) {
            return destination.pos;
        }
        return destination;
    }
    /**
     * check if room should be avoided by findRoute algorithm
     * @param roomName
     * @returns {RoomMemory|number}
     */
    static checkAvoid(roomName) {
        return Memory.rooms && Memory.rooms[roomName] && Memory.rooms[roomName].avoid;
    }
    /**
     * check if a position is an exit
     * @param pos
     * @returns {boolean}
     */
    static isExit(pos) {
        return pos.x === 0 || pos.y === 0 || pos.x === 49 || pos.y === 49;
    }
    /**
     * check two coordinates match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static sameCoord(pos1, pos2) {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }
    /**
     * check if two positions match
     * @param pos1
     * @param pos2
     * @returns {boolean}
     */
    static samePos(pos1, pos2) {
        return this.sameCoord(pos1, pos2) && pos1.roomName === pos2.roomName;
    }
    /**
     * draw a circle at position
     * @param pos
     * @param color
     * @param opacity
     */
    static circle(pos, color, opacity) {
        new RoomVisual(pos.roomName).circle(pos, {
            radius: .45, fill: "transparent", stroke: color, strokeWidth: .15, opacity: opacity
        });
    }
    /**
     * update memory on whether a room should be avoided based on controller owner
     * @param room
     */
    static updateRoomStatus(room) {
        if (!room) {
            return;
        }
        if (room.controller) {
            if (room.controller.owner && !room.controller.my) {
                room.memory.avoid = true;
            }
            else {
                delete room.memory.avoid;
            }
        }
    }
    /**
     * find a path from origin to destination
     * @param origin
     * @param destination
     * @param options
     * @returns {PathfinderReturn}
     */
    static findTravelPath(origin, destination, options = {}) {
        _.defaults(options, {
            ignoreCreeps: true,
            maxOps: DEFAULT_MAXOPS,
            range: 1,
        });
        if (options.movingTarget) {
            options.range = 0;
        }
        origin = this.normalizePos(origin);
        destination = this.normalizePos(destination);
        let originRoomName = origin.roomName;
        let destRoomName = destination.roomName;
        // check to see whether findRoute should be used
        let roomDistance = Game.map.getRoomLinearDistance(origin.roomName, destination.roomName);
        let allowedRooms = options.route;
        if (!allowedRooms && (options.useFindRoute || (options.useFindRoute === undefined && roomDistance > 2))) {
            let route = this.findRoute(origin.roomName, destination.roomName, options);
            if (route) {
                allowedRooms = route;
            }
        }
        let callback = (roomName) => {
            if (allowedRooms) {
                if (!allowedRooms[roomName]) {
                    return false;
                }
            }
            else if (!options.allowHostile && Traveler.checkAvoid(roomName)
                && roomName !== destRoomName && roomName !== originRoomName) {
                return false;
            }
            let matrix;
            let room = Game.rooms[roomName];
            if (room) {
                if (options.ignoreStructures) {
                    matrix = new PathFinder.CostMatrix();
                    if (!options.ignoreCreeps) {
                        Traveler.addCreepsToMatrix(room, matrix);
                    }
                }
                else if (options.ignoreCreeps || roomName !== originRoomName) {
                    matrix = this.getStructureMatrix(room, options.freshMatrix);
                }
                else {
                    matrix = this.getCreepMatrix(room);
                }
                if (options.obstacles) {
                    matrix = matrix.clone();
                    for (let obstacle of options.obstacles) {
                        if (obstacle.pos.roomName !== roomName) {
                            continue;
                        }
                        matrix.set(obstacle.pos.x, obstacle.pos.y, 0xff);
                    }
                }
            }
            if (options.roomCallback) {
                if (!matrix) {
                    matrix = new PathFinder.CostMatrix();
                }
                let outcome = options.roomCallback(roomName, matrix.clone());
                if (outcome !== undefined) {
                    return outcome;
                }
            }
            return matrix;
        };
        let ret = PathFinder.search(origin, { pos: destination, range: options.range }, {
            maxOps: options.maxOps,
            maxRooms: options.maxRooms,
            plainCost: options.offRoad ? 1 : options.ignoreRoads ? 1 : 2,
            swampCost: options.offRoad ? 1 : options.ignoreRoads ? 5 : 10,
            roomCallback: callback,
        });
        if (ret.incomplete && options.ensurePath) {
            if (options.useFindRoute === undefined) {
                // handle case where pathfinder failed at a short distance due to not using findRoute
                // can happen for situations where the creep would have to take an uncommonly indirect path
                // options.allowedRooms and options.routeCallback can also be used to handle this situation
                if (roomDistance <= 2) {
                    console.log(`TRAVELER: path failed without findroute, trying with options.useFindRoute = true`);
                    console.log(`from: ${origin}, destination: ${destination}`);
                    options.useFindRoute = true;
                    ret = this.findTravelPath(origin, destination, options);
                    console.log(`TRAVELER: second attempt was ${ret.incomplete ? "not " : ""}successful`);
                    return ret;
                }
                // TODO: handle case where a wall or some other obstacle is blocking the exit assumed by findRoute
            }
        }
        return ret;
    }
    /**
     * find a viable sequence of rooms that can be used to narrow down pathfinder's search algorithm
     * @param origin
     * @param destination
     * @param options
     * @returns {{}}
     */
    static findRoute(origin, destination, options = {}) {
        let restrictDistance = options.restrictDistance || Game.map.getRoomLinearDistance(origin, destination) + 10;
        let allowedRooms = { [origin]: true, [destination]: true };
        let highwayBias = 1;
        if (options.preferHighway) {
            highwayBias = 2.5;
            if (options.highwayBias) {
                highwayBias = options.highwayBias;
            }
        }
        let ret = Game.map.findRoute(origin, destination, {
            routeCallback: (roomName) => {
                if (options.routeCallback) {
                    let outcome = options.routeCallback(roomName);
                    if (outcome !== undefined) {
                        return outcome;
                    }
                }
                let rangeToRoom = Game.map.getRoomLinearDistance(origin, roomName);
                if (rangeToRoom > restrictDistance) {
                    // room is too far out of the way
                    return Number.POSITIVE_INFINITY;
                }
                if (!options.allowHostile && Traveler.checkAvoid(roomName) &&
                    roomName !== destination && roomName !== origin) {
                    // room is marked as "avoid" in room memory
                    return Number.POSITIVE_INFINITY;
                }
                let parsed;
                if (options.preferHighway) {
                    parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    let isHighway = (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
                    if (isHighway) {
                        return 1;
                    }
                }
                // SK rooms are avoided when there is no vision in the room, harvested-from SK rooms are allowed
                if (!options.allowSK && !Game.rooms[roomName]) {
                    if (!parsed) {
                        parsed = /^[WE]([0-9]+)[NS]([0-9]+)$/.exec(roomName);
                    }
                    let fMod = parsed[1] % 10;
                    let sMod = parsed[2] % 10;
                    let isSK = !(fMod === 5 && sMod === 5) &&
                        ((fMod >= 4) && (fMod <= 6)) &&
                        ((sMod >= 4) && (sMod <= 6));
                    if (isSK) {
                        return 10 * highwayBias;
                    }
                }
                return highwayBias;
            },
        });
        if (!_.isArray(ret)) {
            console.log(`couldn't findRoute to ${destination}`);
            return;
        }
        for (let value of ret) {
            allowedRooms[value.room] = true;
        }
        return allowedRooms;
    }
    /**
     * check how many rooms were included in a route returned by findRoute
     * @param origin
     * @param destination
     * @returns {number}
     */
    static routeDistance(origin, destination) {
        let linearDistance = Game.map.getRoomLinearDistance(origin, destination);
        if (linearDistance >= 32) {
            return linearDistance;
        }
        let allowedRooms = this.findRoute(origin, destination);
        if (allowedRooms) {
            return Object.keys(allowedRooms).length;
        }
    }
    /**
     * build a cost matrix based on structures in the room. Will be cached for more than one tick. Requires vision.
     * @param room
     * @param freshMatrix
     * @returns {any}
     */
    static getStructureMatrix(room, freshMatrix) {
        if (!this.structureMatrixCache[room.name] || (freshMatrix && Game.time !== this.structureMatrixTick)) {
            this.structureMatrixTick = Game.time;
            let matrix = new PathFinder.CostMatrix();
            this.structureMatrixCache[room.name] = Traveler.addStructuresToMatrix(room, matrix, 1);
        }
        return this.structureMatrixCache[room.name];
    }
    /**
     * build a cost matrix based on creeps and structures in the room. Will be cached for one tick. Requires vision.
     * @param room
     * @returns {any}
     */
    static getCreepMatrix(room) {
        if (!this.creepMatrixCache[room.name] || Game.time !== this.creepMatrixTick) {
            this.creepMatrixTick = Game.time;
            this.creepMatrixCache[room.name] = Traveler.addCreepsToMatrix(room, this.getStructureMatrix(room, true).clone());
        }
        return this.creepMatrixCache[room.name];
    }
    /**
     * add structures to matrix so that impassible structures can be avoided and roads given a lower cost
     * @param room
     * @param matrix
     * @param roadCost
     * @returns {CostMatrix}
     */
    static addStructuresToMatrix(room, matrix, roadCost) {
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, roadCost);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else if (!(structure instanceof ConstructionSite)) {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(114)) {
            if (site instanceof ConstructionSite) {
                if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                    || site.structureType === STRUCTURE_RAMPART) {
                    continue;
                }
                matrix.set(site.pos.x, site.pos.y, 0xff);
            }
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        return matrix;
    }
    /**
     * add creeps to matrix so that they will be avoided by other creeps
     * @param room
     * @param matrix
     * @returns {CostMatrix}
     */
    static addCreepsToMatrix(room, matrix) {
        room.find(101).forEach((creep) => matrix.set(creep.pos.x, creep.pos.y, 0xff));
        return matrix;
    }
    /**
     * serialize a path, traveler style. Returns a string of directions.
     * @param startPos
     * @param path
     * @param color
     * @returns {string}
     */
    static serializePath(startPos, path, color = "orange") {
        let serializedPath = "";
        let lastPosition = startPos;
        this.circle(startPos, color);
        for (let position of path) {
            if (position.roomName === lastPosition.roomName) {
                new RoomVisual(position.roomName)
                    .line(position, lastPosition, { color: color, lineStyle: "dashed" });
                serializedPath += lastPosition.getDirectionTo(position);
            }
            lastPosition = position;
        }
        return serializedPath;
    }
    /**
     * returns a position at a direction relative to origin
     * @param origin
     * @param direction
     * @returns {RoomPosition}
     */
    static positionAtDirection(origin, direction) {
        let offsetX = [0, 0, 1, 1, 1, 0, -1, -1, -1];
        let offsetY = [0, -1, -1, 0, 1, 1, 1, 0, -1];
        let x = origin.x + offsetX[direction];
        let y = origin.y + offsetY[direction];
        if (x > 49 || x < 0 || y > 49 || y < 0) {
            return;
        }
        return new RoomPosition(x, y, origin.roomName);
    }
    /**
     * convert room avoidance memory from the old pattern to the one currently used
     * @param cleanup
     */
    static patchMemory(cleanup = false) {
        if (!Memory.empire) {
            return;
        }
        if (!Memory.empire.hostileRooms) {
            return;
        }
        let count = 0;
        for (let roomName in Memory.empire.hostileRooms) {
            if (Memory.empire.hostileRooms[roomName]) {
                if (!Memory.rooms[roomName]) {
                    Memory.rooms[roomName] = {};
                }
                Memory.rooms[roomName].avoid = true;
                count++;
            }
            if (cleanup) {
                delete Memory.empire.hostileRooms[roomName];
            }
        }
        if (cleanup) {
            delete Memory.empire.hostileRooms;
        }
        console.log(`TRAVELER: room avoidance data patched for ${count} rooms`);
    }
    static deserializeState(travelData, destination) {
        let state = {};
        if (travelData.state) {
            state.lastCoord = { x: travelData.state[STATE_PREV_X], y: travelData.state[STATE_PREV_Y] };
            state.cpu = travelData.state[STATE_CPU];
            state.stuckCount = travelData.state[STATE_STUCK];
            state.destination = new RoomPosition(travelData.state[STATE_DEST_X], travelData.state[STATE_DEST_Y], travelData.state[STATE_DEST_ROOMNAME]);
        }
        else {
            state.cpu = 0;
            state.destination = destination;
        }
        return state;
    }
    static serializeState(creep, destination, state, travelData) {
        travelData.state = [creep.pos.x, creep.pos.y, state.stuckCount, state.cpu, destination.x, destination.y,
            destination.roomName];
    }
    static isStuck(creep, state) {
        let stuck = false;
        if (state.lastCoord !== undefined) {
            if (this.sameCoord(creep.pos, state.lastCoord)) {
                // didn't move
                stuck = true;
            }
            else if (this.isExit(creep.pos) && this.isExit(state.lastCoord)) {
                // moved against exit
                stuck = true;
            }
        }
        return stuck;
    }
}
Traveler.structureMatrixCache = {};
Traveler.creepMatrixCache = {};
// this might be higher than you wish, setting it lower is a great way to diagnose creep behavior issues. When creeps
// need to repath to often or they aren't finding valid paths, it can sometimes point to problems elsewhere in your code
const REPORT_CPU_THRESHOLD = 1000;
const DEFAULT_MAXOPS = 20000;
const DEFAULT_STUCK_VALUE = 2;
const STATE_PREV_X = 0;
const STATE_PREV_Y = 1;
const STATE_STUCK = 2;
const STATE_CPU = 3;
const STATE_DEST_X = 4;
const STATE_DEST_Y = 5;
const STATE_DEST_ROOMNAME = 6;
// assigns a function to Creep.prototype: creep.travelTo(destination)
Creep.prototype.travelTo = function (destination, options) {
    return Traveler.travelTo(this, destination, options);
};

/**
 * CONSOLE COMMAND SYSTEM
 *
 * Provides a comprehensive command-line interface for controlling your colony.
 * All commands are called via console.log and global functions.
 *
 * Usage:
 * ```
 * > help()                          // Show all commands
 * > status()                        // Full colony status
 * > status('W1N1')                  // Room-specific status
 * > spawn('harvester', 'W1N1')      // Spawn a role in a room
 * > despawn('creep_name')           // Delete a creep
 * > pos(10, 20, 'W1N1')             // Go to position
 * > memory()                        // View full memory
 * > memory('creep_name')            // View creep memory
 * > config()                        // View behavior config
 * ```
 */
/**
 * Get the current room (first owned room, or first room with a creep)
 */
function getCurrentRoom() {
    var _a, _b, _c;
    // Try to find a room with a creep first (most likely user context)
    for (const creep of Object.values(Game.creeps)) {
        if ((_b = (_a = creep.room) === null || _a === void 0 ? void 0 : _a.controller) === null || _b === void 0 ? void 0 : _b.my) {
            return creep.room.name;
        }
    }
    // Fall back to first owned room
    for (const room of Object.values(Game.rooms)) {
        if ((_c = room.controller) === null || _c === void 0 ? void 0 : _c.my) {
            return room.name;
        }
    }
    return null;
}
/**
 * Print a formatted header
 */
function header(text) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`║ ${text.padEnd(58)} ║`);
    console.log(`${'═'.repeat(60)}\n`);
}
/**
 * Print a section separator
 */
function section(text) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${text}`);
    console.log(`${'─'.repeat(60)}`);
}
/**
 * HELP - Display all available commands
 *
 * @example help()
 */
function help() {
    header('SCREEPS CONSOLE COMMANDS');
    section('VIEWING STATUS');
    console.log('  status()             - Full colony status (all rooms)');
    console.log('  status(roomName)     - Status for specific room');
    console.log('  memory()             - View full Memory object');
    console.log('  memory(creepName)    - View specific creep memory');
    console.log('  config()             - View behavior configuration');
    section('SPAWNING & CREEPS');
    console.log('  spawn(role)                      - Spawn a creep (auto-name, current room)');
    console.log('  spawn(role, room)                - Spawn a creep (auto-name)');
    console.log('  spawnCreep(name, role, body)     - Spawn with name & body (current room)');
    console.log('  spawnCreep(name, role, body, room) - Spawn with name & body');
    console.log('  despawn(creepName)               - Delete a creep');
    console.log('  creeps(room?)                    - List all creeps (or by room)');
    section('BODY CONFIGURATIONS');
    console.log('  bodies()             - List all registered body configs');
    console.log('  bodies(role)         - List bodies for a role');
    console.log('  regBody(name, arr, role) - Register a body config');
    section('MOVEMENT & TARGETING');
    console.log('  goto(x, y, room)     - Move all creeps to position');
    console.log('  goto(target)         - Go to creep/structure/source');
    section('TASK ASSIGNMENT');
    console.log('  task(name, type, id) - Assign task to creep');
    console.log('  tasks()              - View all assigned tasks');
    console.log('  tasks(room)          - View tasks in room');
    console.log('  untask(name)         - Clear task from creep');
    console.log('');
    console.log('  Task types: harvest, deliver, build, upgrade, repair, move, idle');
    console.log('  Example: task("harvester_1", "harvest", "SourceA")');
    section('STRUCTURE REGISTRY');
    console.log('  scan()               - Scan current room structures (or all if none)');
    console.log('  scan(room)           - Register structures in a room');
    console.log('  structures()         - List all registered structures');
    console.log('  structures(room)     - List structures in a room');
    console.log('  rename(old, new)     - Rename a structure');
    section('STRUCTURE LOCKING');
    console.log('  lock(name)           - Lock a structure (prevent actions)');
    console.log('  unlock(name)         - Unlock a structure');
    console.log('  locked()             - View all locked structures');
    console.log('  locked(room)         - View locked structures in room');
    section('VISUAL LABELS');
    console.log('  showNames()          - Display labels on current room (3 ticks)');
    console.log('  showNames(room)      - Display structure names on map (3 ticks)');
    console.log('  showNames(room, dur) - Display labels for duration ticks');
    console.log('  hideNames()          - Hide labels on current room');
    console.log('  hideNames(room)      - Hide structure name displays');
    section('LEGATUS COMMANDS');
    console.log('  legaStatus()         - Show Legatus assignments (current room)');
    console.log('  legaStatus(room)     - Show Legatus assignments in room');
    console.log('  legaList()           - List all assignments (current room)');
    console.log('  legaList(room)       - List all assignments in room');
    section('ROOM MANAGEMENT');
    console.log('  rooms()              - List all owned rooms');
    console.log('  room(name)           - Get Room object');
    section('BUILDING & CONSTRUCTION');
    console.log('  plan()               - Show construction plan');
    console.log('  build(structType)    - Plan a structure to build');
    console.log('  cancel()             - Cancel construction sites');
    section('DEBUGGING');
    console.log('  flag(x, y, room)     - Place a flag (for visual reference)');
    console.log('  clear()              - Clear console output');
    section('EMPIRE MODE');
    console.log('  mode()               - Display current empire mode');
    console.log('  mode("command")      - Switch to COMMAND mode (direct control)');
    console.log('  mode("delegate")     - Switch to DELEGATE mode (automatic AI)');
    console.log('\n💡 Most room-based commands default to current room if not specified\n');
}
/**
 * STATUS - Display colony-wide status
 *
 * @param roomName - Optional: show only this room
 * @example status()
 * @example status('W1N1')
 */
function status(roomName) {
    var _a, _b, _c;
    const rooms = roomName ? [Game.rooms[roomName]] : Object.values(Game.rooms);
    const ownedRooms = rooms.filter(r => { var _a; return (_a = r.controller) === null || _a === void 0 ? void 0 : _a.my; });
    if (ownedRooms.length === 0) {
        console.log('⚠️  No rooms under control');
        return;
    }
    header('COLONY STATUS');
    for (const room of ownedRooms) {
        section(`Room: ${room.name} | RCL: ${((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 0}`);
        // Room stats
        console.log(`Progress: ${((_b = room.controller) === null || _b === void 0 ? void 0 : _b.progress) || 0}/${((_c = room.controller) === null || _c === void 0 ? void 0 : _c.progressTotal) || 0}`);
        console.log(`Energy: ${room.energyAvailable}/${room.energyCapacityAvailable}`);
        // Creep composition
        console.log(`\n📋 Creep Status:`);
        console.log(getSpawnStatus(room));
        // Spawn requests
        const requests = getSpawnRequests(room);
        if (requests.length > 0) {
            console.log(`\n🔄 Next to spawn: ${requests[0].reason}`);
        }
        // Structures
        const spawns = room.find(FIND_MY_SPAWNS);
        const extensions = room.find(FIND_MY_STRUCTURES, {
            filter: s => s.structureType === STRUCTURE_EXTENSION
        });
        console.log(`\n🏗️  Structures: ${spawns.length} spawn(s), ${extensions.length} extension(s)`);
        // Construction sites
        const sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        if (sites.length > 0) {
            console.log(`⚙️  Construction: ${sites.length} site(s)`);
        }
    }
    console.log();
}
/**
 * SPAWN - Spawn a creep of a given role
 *
 * @param role - Role name (harvester, upgrader, builder)
 * @param roomName - Optional: Room to spawn in (defaults to current room)
 * @returns The new creep, or false if failed
 *
 * @example spawn('harvester', 'W1N1')
 * @example spawn('harvester')
 */
function spawn(role, roomName) {
    var _a;
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return false;
    }
    const room = Game.rooms[targetRoom];
    if (!room) {
        console.log(`❌ Room not found: ${targetRoom}`);
        return false;
    }
    const config = getBehaviorConfig(((_a = room.controller) === null || _a === void 0 ? void 0 : _a.level) || 1);
    const roleConfig = config.roles.find(r => r.name === role);
    if (!roleConfig) {
        console.log(`❌ Unknown role: ${role}`);
        console.log(`Available roles: ${config.roles.map(r => r.name).join(', ')}`);
        return false;
    }
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
        console.log(`❌ No spawns in room`);
        return false;
    }
    const spawn = spawns[0];
    const creepName = `${role}_${Game.time}`;
    const result = spawn.spawnCreep(roleConfig.body, creepName, {
        memory: {
            role,
            room: targetRoom,
            working: false
        }
    });
    if (result === OK) {
        console.log(`✅ Spawned ${creepName}`);
        return Game.creeps[creepName];
    }
    else {
        console.log(`❌ Spawn failed: ${result}`);
        return false;
    }
}
/**
 * DESPAWN - Delete a creep
 *
 * @param creepName - Name of creep to delete
 * @example despawn('harvester_12345')
 */
function despawn(creepName) {
    const creep = Game.creeps[creepName];
    if (!creep) {
        console.log(`❌ Creep not found: ${creepName}`);
        return;
    }
    creep.suicide();
    console.log(`💀 Killed ${creepName}`);
}
/**
 * SPAWNCREEP - Spawn a creep with specific name and body configuration
 *
 * @param creepName - Custom name for the creep (e.g., 'Harvester1')
 * @param role - Role name (harvester, upgrader, builder)
 * @param bodyTypeOrArray - Body config name (e.g., 'harvester_basic') or array of parts
 * @param roomName - Optional: Room to spawn in (defaults to current room)
 * @returns The new creep, or false if failed
 *
 * @example spawnCreep('Harvester1', 'harvester', 'harvester_basic', 'W1N1')
 * @example spawnCreep('Harvester1', 'harvester', 'harvester_basic')
 * @example spawnCreep('Scout1', 'scout', [MOVE], 'W1N1')
 */
function spawnCreep(creepName, role, bodyTypeOrArray, roomName) {
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return false;
    }
    const room = Game.rooms[targetRoom];
    if (!room) {
        console.log(`❌ Room not found: ${targetRoom}`);
        return false;
    }
    // Get body parts
    const bodyParts = getBodyConfig(bodyTypeOrArray);
    if (!bodyParts || bodyParts.length === 0) {
        console.log(`❌ Invalid body config: ${bodyTypeOrArray}`);
        console.log(`Available bodies: `);
        listBodyConfigs();
        return false;
    }
    // Check if name is already taken
    if (Game.creeps[creepName]) {
        console.log(`❌ Creep name already exists: ${creepName}`);
        return false;
    }
    // Find spawn
    const spawns = room.find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
        console.log(`❌ No spawns in room`);
        return false;
    }
    const spawnObj = spawns[0];
    // Attempt spawn
    const result = spawnObj.spawnCreep(bodyParts, creepName, {
        memory: {
            role,
            room: targetRoom,
            working: false
        }
    });
    if (result === OK) {
        const cost = getBodyCost(bodyParts);
        console.log(`✅ Spawned ${creepName} (${bodyParts.length} parts, ${cost}E)`);
        return Game.creeps[creepName];
    }
    else {
        const errorMsg = {
            [ERR_NOT_OWNER]: 'Not your spawn',
            [ERR_NAME_EXISTS]: 'Name already exists',
            [ERR_INVALID_ARGS]: 'Invalid body parts',
            [ERR_NOT_ENOUGH_ENERGY]: `Not enough energy (need ${getBodyCost(bodyParts)}E)`
        }[result] || `Error code ${result}`;
        console.log(`❌ Spawn failed: ${errorMsg}`);
        return false;
    }
}
/**
 * CREEPS - List all creeps (optionally filtered by room)
 *
 * @param roomName - Optional: filter by room
 * @example creeps()
 * @example creeps('W1N1')
 */
function creeps(roomName) {
    var _a;
    const allCreeps = Object.values(Game.creeps);
    const filtered = roomName
        ? allCreeps.filter(c => c.memory.room === roomName)
        : allCreeps;
    if (filtered.length === 0) {
        console.log('⚠️  No creeps found');
        return;
    }
    section(`CREEPS (${filtered.length} total)`);
    for (const creep of filtered) {
        const energy = `${creep.store.getUsedCapacity(RESOURCE_ENERGY)}/${creep.store.getCapacity(RESOURCE_ENERGY)}`;
        const working = creep.memory.working ? '🔨' : '⛏️';
        console.log(`  ${creep.name.padEnd(30)} | Role: ${((_a = creep.memory.role) === null || _a === void 0 ? void 0 : _a.padEnd(10)) || 'unknown'} | Energy: ${energy} | ${working}`);
    }
    console.log();
}
/**
 * MEMORY - View memory structure
 *
 * @param key - Optional: view specific key (creep name or memory path)
 * @example memory()
 * @example memory('harvester_12345')
 */
function memory(key) {
    if (!key) {
        console.log(JSON.stringify(Memory, null, 2));
        return;
    }
    // Try to find creep memory
    if (key in Memory.creeps) {
        console.log(JSON.stringify(Memory.creeps[key], null, 2));
        return;
    }
    // Try as direct memory path
    const value = Memory[key];
    if (value !== undefined) {
        console.log(JSON.stringify(value, null, 2));
        return;
    }
    console.log(`⚠️  Key not found: ${key}`);
}
/**
 * CONFIG - Display current behavior configuration
 *
 * @example config()
 * @example config(1)  // for RCL 1
 */
function config(rcl) {
    var _a;
    if (rcl === undefined) {
        // Show configs for all controlled rooms
        for (const room of Object.values(Game.rooms)) {
            if ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my) {
                config(room.controller.level);
            }
        }
        return;
    }
    const cfg = getBehaviorConfig(rcl);
    section(`BEHAVIOR CONFIG - RCL ${rcl}`);
    console.log(`Name: ${cfg.name}`);
    console.log(`Description: ${cfg.description}\n`);
    console.log('Roles:');
    for (const role of cfg.roles) {
        console.log(`  ${role.name.padEnd(15)} | Priority: ${role.priority.toString().padEnd(3)} | Target: ${role.targetCount} | Body: ${role.body.join(',')}`);
    }
    console.log();
}
/**
 * ROOMS - List all owned rooms
 *
 * @example rooms()
 */
function rooms() {
    var _a;
    const ownedRooms = Object.values(Game.rooms).filter(r => { var _a; return (_a = r.controller) === null || _a === void 0 ? void 0 : _a.my; });
    if (ownedRooms.length === 0) {
        console.log('⚠️  No rooms under control');
        return;
    }
    section(`OWNED ROOMS (${ownedRooms.length})`);
    for (const room of ownedRooms) {
        const creepCount = room.find(FIND_MY_CREEPS).length;
        const spawnCount = room.find(FIND_MY_SPAWNS).length;
        console.log(`  ${room.name.padEnd(10)} | RCL: ${(_a = room.controller) === null || _a === void 0 ? void 0 : _a.level} | Energy: ${room.energyAvailable}/${room.energyCapacityAvailable} | Creeps: ${creepCount} | Spawns: ${spawnCount}`);
    }
    console.log();
}
/**
 * ROOM - Get a room object by name
 *
 * @param name - Room name (e.g., 'W1N1')
 * @example room('W1N1')
 */
function room(name) {
    const r = Game.rooms[name];
    if (!r) {
        console.log(`❌ Room not found: ${name}`);
        return null;
    }
    return r;
}
/**
 * GOTO - Move all creeps to a target position
 *
 * @param target - Target room position, creep name, or structure
 * @example goto(new RoomPosition(25, 25, 'W1N1'))
 * @example goto('W1N1', 25, 25)
 */
function goto(x, y, roomName) {
    let pos;
    if (x instanceof RoomPosition) {
        pos = x;
    }
    else if (typeof x === 'string' && y !== undefined && roomName !== undefined) {
        pos = new RoomPosition(y, roomName, x);
    }
    else if (typeof x === 'string') {
        // Try to find creep or structure
        const creep = Game.creeps[x];
        if (creep) {
            pos = creep.pos;
        }
        else {
            console.log(`❌ Target not found: ${x}`);
            return;
        }
    }
    else {
        console.log('❌ Invalid arguments');
        return;
    }
    const creeps = Object.values(Game.creeps);
    console.log(`📍 Moving ${creeps.length} creeps to ${pos.x},${pos.y} in ${pos.roomName}`);
    for (const creep of creeps) {
        creep.travelTo(pos);
    }
}
/**
 * FLAG - Place a flag at a position (for visual reference)
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param roomName - Room name
 * @example flag(25, 25, 'W1N1')
 */
function flag(x, y, roomName) {
    const flagName = `flag_${Game.time}`;
    const result = Game.flags[flagName] ? Game.flags[flagName].remove() : OK;
    if (result === OK || result === ERR_NOT_FOUND) {
        Game.map.visual.circle(new RoomPosition(x, y, roomName), { radius: 0.5, stroke: 'red' });
        console.log(`🚩 Flag placed at ${x},${y} in ${roomName}`);
    }
}
/**
 * CLEAR - Clear console history
 *
 * @example clear()
 */
function clear() {
    var _a;
    (_a = console.clear) === null || _a === void 0 ? void 0 : _a.call(console);
    console.log('✨ Console cleared');
}
/**
 * MODE - Display or switch empire mode
 *
 * @param newMode - Optional: 'command' or 'delegate' to switch modes
 * @example mode()
 * @example mode('command')
 * @example mode('delegate')
 */
function mode(newMode) {
    if (newMode) {
        const changed = setMode(newMode);
        if (changed) {
            displayModeInfo();
            console.log(`✅ Empire mode switched to ${newMode.toUpperCase()}`);
        }
        else {
            console.log(`⚠️  Already in ${newMode} mode`);
        }
    }
    else {
        displayModeInfo();
    }
}
/**
 * TASK - Assign a task to a creep
 *
 * @param creepName - Name of creep to assign task to
 * @param taskType - Type of task: harvest, deliver, build, upgrade, move, repair, idle
 * @param targetId - Target ID (for harvest, deliver, build, repair)
 * @example task('harvester_123', 'harvest', 'abc123def')
 * @example task('harvester_123', 'upgrade')
 * @example task('harvester_123', 'move', '25:20:W1N1')
 */
function task(creepName, taskType, targetId) {
    const creep = Game.creeps[creepName];
    if (!creep) {
        console.log(`❌ Creep not found: ${creepName}`);
        return;
    }
    let t;
    switch (taskType.toLowerCase()) {
        case 'harvest':
            if (!targetId) {
                console.log('❌ harvest requires target source ID');
                return;
            }
            t = createHarvestTask(targetId);
            break;
        case 'deliver':
            if (!targetId) {
                console.log('❌ deliver requires target structure ID');
                return;
            }
            t = createDeliverTask(targetId);
            break;
        case 'build':
            if (!targetId) {
                console.log('❌ build requires target site ID');
                return;
            }
            t = createBuildTask(targetId);
            break;
        case 'upgrade':
            t = createUpgradeTask();
            break;
        case 'move': {
            if (!targetId) {
                console.log('❌ move requires target position (x:y:roomName)');
                return;
            }
            const parts = targetId.split(':');
            if (parts.length !== 3) {
                console.log('❌ move format: x:y:roomName (e.g., 25:20:W1N1)');
                return;
            }
            const [x, y, roomName] = parts;
            t = createMoveTask(parseInt(x), parseInt(y), roomName);
            break;
        }
        case 'repair':
            if (!targetId) {
                console.log('❌ repair requires target structure ID');
                return;
            }
            t = createRepairTask(targetId);
            break;
        case 'idle':
            t = createIdleTask();
            break;
        default:
            console.log(`❌ Unknown task type: ${taskType}`);
            console.log('Available: harvest, deliver, build, upgrade, move, repair, idle');
            return;
    }
    assignTask(creep, t);
    console.log(`✅ Assigned task to ${creepName}: ${getTaskDescription(t)}`);
}
/**
 * TASKS - View tasks assigned to creeps
 *
 * @param roomName - Optional: filter by room
 * @example tasks()
 * @example tasks('W1N1')
 */
function tasks(roomName) {
    const allCreeps = Object.values(Game.creeps);
    const filtered = roomName
        ? allCreeps.filter(c => c.memory.room === roomName)
        : allCreeps;
    const withTasks = filtered.filter(c => getTask(c));
    if (withTasks.length === 0) {
        console.log('⚠️  No creeps have assigned tasks');
        return;
    }
    section(`CREEP TASKS (${withTasks.length})`);
    for (const creep of withTasks) {
        const t = getTask(creep);
        if (t) {
            console.log(`  ${creep.name.padEnd(30)} | ${getTaskDescription(t)}`);
        }
    }
    console.log();
}
/**
 * UNTASK - Clear task from a creep
 *
 * @param creepName - Name of creep to clear task from
 * @example untask('harvester_123')
 */
function untask(creepName) {
    const creep = Game.creeps[creepName];
    if (!creep) {
        console.log(`❌ Creep not found: ${creepName}`);
        return;
    }
    clearTask(creep);
    console.log(`✅ Cleared task from ${creepName}`);
}
/**
 * SCAN - Scan a room and register its structures
 *
 * @param roomName - Optional: Room to scan (defaults to current room, or all owned rooms if none)
 * @example scan()
 * @example scan('W1N1')
 */
function scan(roomName) {
    var _a;
    let targetRoom;
    if (roomName) {
        targetRoom = Game.rooms[roomName];
        if (!targetRoom) {
            console.log(`❌ Room not found: ${roomName}`);
            return;
        }
    }
    else {
        // Try to get current room, fall back to all owned rooms
        const currentRoomName = getCurrentRoom();
        if (currentRoomName) {
            targetRoom = Game.rooms[currentRoomName];
        }
    }
    if (targetRoom) {
        scanRoom(targetRoom);
        console.log(`✅ Scanned room ${targetRoom.name}`);
    }
    else {
        // Scan all owned rooms
        for (const room of Object.values(Game.rooms)) {
            if ((_a = room.controller) === null || _a === void 0 ? void 0 : _a.my) {
                scanRoom(room);
            }
        }
        console.log('✅ Scanned all owned rooms');
    }
}
/**
 * STRUCTURES - List registered structures
 *
 * @param roomName - Optional: filter by room
 * @example structures()
 * @example structures('W1N1')
 */
function structures(roomName) {
    listStructures(roomName);
}
/**
 * LOCK - Lock a structure (prevent actions on it)
 *
 * @param nameOrId - Structure name or ID
 * @example lock('SourceA')
 * @example lock('SpawnMain')
 */
function lock(nameOrId) {
    const success = lockStructure(nameOrId);
    if (success) {
        console.log(`🔒 Locked ${nameOrId}`);
    }
    else {
        console.log(`❌ Structure not found: ${nameOrId}`);
    }
}
/**
 * UNLOCK - Unlock a structure
 *
 * @param nameOrId - Structure name or ID
 * @example unlock('SourceA')
 * @example unlock('SpawnMain')
 */
function unlock(nameOrId) {
    const success = unlockStructure(nameOrId);
    if (success) {
        console.log(`🔓 Unlocked ${nameOrId}`);
    }
    else {
        console.log(`❌ Structure not found: ${nameOrId}`);
    }
}
/**
 * LOCKED - View all locked structures
 *
 * @param roomName - Optional: filter by room
 * @example locked()
 * @example locked('W1N1')
 */
function locked(roomName) {
    const lockedStructs = getLockedStructures(roomName);
    if (lockedStructs.length === 0) {
        console.log('✅ No locked structures');
        return;
    }
    section(`LOCKED STRUCTURES (${lockedStructs.length})`);
    for (const info of lockedStructs) {
        console.log(`  🔒 ${info.name.padEnd(25)} | ${info.type} | ${info.roomName}`);
    }
    console.log();
}
/**
 * RENAME - Rename a structure
 *
 * @param oldName - Current name or ID
 * @param newName - New name
 * @example rename('SourceA', 'MainSource')
 * @example rename('SpawnMain', 'SpawnPrimary')
 */
function rename(oldName, newName) {
    const success = renameStructure(oldName, newName);
    if (success) {
        console.log(`✅ Renamed ${oldName} → ${newName}`);
    }
    else {
        console.log(`❌ Failed to rename (not found or name conflict)`);
    }
}
/**
 * SHOWNALES - Display structure names as visual labels on the map
 *
 * @param roomName - Optional: Room to display labels in (defaults to current room)
 * @param duration - How many ticks to persist (default 3)
 * @example showNames('W1N1')
 * @example showNames()
 * @example showNames('W1N1', 10)
 */
function showNames(roomName, duration = 3) {
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return;
    }
    const room = Game.rooms[targetRoom];
    if (!room) {
        console.log(`❌ Room not found: ${targetRoom}`);
        return;
    }
    showNames$1(targetRoom, duration);
    console.log(`👁️  Structure labels will display for ${duration} ticks`);
}
/**
 * HIDENAMES - Hide structure name displays
 *
 * @param roomName - Optional: Room to hide labels in (defaults to current room)
 * @example hideNames('W1N1')
 * @example hideNames()
 */
function hideNames(roomName) {
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return;
    }
    hideNames$1(targetRoom);
}
/**
 * LEGASTATUS - Show LegatusOficio status for a room
 *
 * @param roomName - Optional: Room to query (defaults to current room)
 * @example legaStatus('W1N1')
 * @example legaStatus()
 */
function legaStatus(roomName) {
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return;
    }
    const assignments = getRoomAssignments(targetRoom);
    console.log(getLegaStatus(targetRoom));
    if (assignments.length > 0) {
        console.log(`\nActive Assignments:`);
        for (const assignment of assignments) {
            const ageTicks = Game.time - assignment.assignedAt;
            console.log(`  ${assignment.creepName.padEnd(30)} → ${assignment.command.type.padEnd(12)} (${ageTicks} ticks)`);
        }
    }
}
/**
 * LEGALIRT - List all Legatus assignments in a room
 *
 * @param roomName - Optional: Room to list (defaults to current room)
 * @example legaList('W1N1')
 * @example legaList()
 */
function legaList(roomName) {
    const targetRoom = roomName || getCurrentRoom();
    if (!targetRoom) {
        console.log(`❌ No room specified and no current room found`);
        return;
    }
    listLegaAssignments(targetRoom);
}
/**
 * BODIES - List all registered body configurations
 *
 * @param role - Optional: filter by role
 * @example bodies()
 * @example bodies('harvester')
 */
function bodies(role) {
    listBodyConfigs(role);
}
/**
 * REGBODY - Register a new body configuration
 *
 * @param name - Name of the body type
 * @param partsArray - Array of body parts
 * @param role - Optional: role this body is for
 * @example regBody('harvester_v2', [WORK, WORK, CARRY, MOVE], 'harvester')
 * @example regBody('scout', [MOVE])
 */
function regBody(name, partsArray, role = 'generic') {
    registerBody(name, partsArray, role);
    const cost = getBodyCost(partsArray);
    console.log(`✅ Registered body '${name}' (${partsArray.length} parts, ${cost}E)`);
}
/**
 * Register all console commands globally
 * This is called from main.ts to make all commands available
 */
function registerConsoleCommands() {
    global.help = help;
    global.status = status;
    global.spawn = spawn;
    global.spawnCreep = spawnCreep;
    global.despawn = despawn;
    global.creeps = creeps;
    global.memory = memory;
    global.config = config;
    global.rooms = rooms;
    global.room = room;
    global.goto = goto;
    global.flag = flag;
    global.clear = clear;
    global.mode = mode;
    global.task = task;
    global.tasks = tasks;
    global.untask = untask;
    global.scan = scan;
    global.structures = structures;
    global.lock = lock;
    global.unlock = unlock;
    global.locked = locked;
    global.rename = rename;
    global.showNames = showNames;
    global.hideNames = hideNames;
    global.legaStatus = legaStatus;
    global.legaList = legaList;
    global.bodies = bodies;
    global.regBody = regBody;
    console.log('✅ Console commands registered. Type help() for usage.');
}

const BUILD_INFO = {
  commitHash: '8170967'};

const INIT_VERSION = '8170967';

/**
 * PROJECT IMPERIUM - RCL1 FOUNDATION
 *
 * Philosophy: Simple, tested, expandable
 * Strategy: Build RCL1 → Prove it works → Add RCL2
 *
 * "Festina lente" - Make haste slowly
 */
/**
 * MAIN GAME LOOP
 *
 * This is the entry point for your Screeps AI.
 * Called once per game tick (every ~3 seconds in real-time).
 *
 * Architecture:
 * - src/main.ts - High-level game loop (this file)
 * - src/world/* - All game logic (rooms, creeps, spawns)
 * - src/types/* - Type definitions
 *
 * The world module handles:
 * - Room orchestration (spawning, creep management, statistics)
 * - Creep behaviors (harvester, upgrader, builder roles)
 * - Spawn management (priority system, body design)
 */
/**
 * Main game loop function.
 * Executed automatically by the Screeps game engine every tick.
 *
 * Responsibilities:
 * 1. Clean up memory for dead creeps (prevent memory leak)
 * 2. Process each owned room
 *
 * @remarks
 * Keep this function lightweight. Heavy logic should be in world module.
 * This makes testing easier and keeps the architecture clean.
 */
const loop = () => {
    // Initialize once using commit hash injected at build time
    // INIT_VERSION is automatically updated on every rebuild (even if code doesn't change)
    // because the commit hash changes when you push/commit
    if (!Memory.initialized || Memory.initVersion !== INIT_VERSION) {
        // Set flags FIRST to prevent double-init if loop runs again
        Memory.initialized = true;
        Memory.initVersion = INIT_VERSION;
        // Log build information on initialization
        console.log(`📦 Initializing with build: ${BUILD_INFO.commitHash}`);
        {
            console.warn(`⚠️  Built from uncommitted changes`);
        }
        // Then run initialization functions
        registerConsoleCommands();
        displayModeInfo();
        registerDefaultBodies();
        console.log('📦 Default body configurations registered');
    }
    // Log main tick info (every 100 ticks to reduce console spam)
    if (Game.time % 100 === 0) {
        console.log(`⚔️ Tick ${Game.time} - PROJECT IMPERIUM - RCL1 FOUNDATION`);
    }
    // Clean up dead creep memory
    // Without this, Memory.creeps grows forever and causes performance issues
    cleanupDeadCreeps();
    // Process each room we own
    processOwnedRooms();
};
/**
 * Removes memory entries for creeps that no longer exist.
 *
 * When a creep dies, it's removed from Game.creeps but stays in Memory.creeps.
 * This cleanup prevents memory bloat over time.
 *
 * @remarks
 * This is called once per tick at the start of the main loop.
 * Memory is limited in Screeps, so cleanup is essential.
 */
function cleanupDeadCreeps() {
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
            console.log(`💀 Creep ${name} has fallen in battle`);
        }
    }
}
/**
 * Processes all rooms under your control.
 *
 * Iterates through Game.rooms and runs logic for each room
 * that has a controller you own.
 *
 * @remarks
 * Game.rooms only contains visible rooms (ones you have creeps or structures in).
 * Rooms you don't control are skipped.
 */
function processOwnedRooms() {
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        // Skip rooms we don't own (neutral or enemy rooms)
        if (!room.controller || !room.controller.my) {
            continue;
        }
        // Run all room logic via world module
        runRoom(room);
    }
}

exports.loop = loop;
//# sourceMappingURL=main.js.map
