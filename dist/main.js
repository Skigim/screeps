'use strict';

/**
 * PROJECT IMPERIUM - RCL1 FOUNDATION
 *
 * Philosophy: Simple, tested, expandable
 * Strategy: Build RCL1 → Prove it works → Add RCL2
 *
 * "Festina lente" - Make haste slowly
 */
// We use the existing CreepMemory from interfaces/CreepRequest.ts
// It already has: role, room, working fields
/**
 * RCL1 ECONOMY - THE FOUNDATION
 *
 * Phase 1: 2 Harvesters (gather energy, fill spawn)
 * Phase 2: Upgraders (maintain controller, prevent downgrade)
 * Phase 3: Builders (only when construction sites exist)
 *
 * Energy Flow: Source → Harvester → Spawn → Upgrader → Controller
 */
const loop = () => {
    console.log(`⚔️ Tick ${Game.time} - PROJECT IMPERIUM - RCL1 FOUNDATION`);
    // Clean up dead creep memory
    for (const name in Memory.creeps) {
        if (!(name in Game.creeps)) {
            delete Memory.creeps[name];
            console.log(`💀 Creep ${name} has fallen in battle`);
        }
    }
    // Process each room we own
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my)
            continue;
        runRoom(room);
    }
};
function runRoom(room) {
    const spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn)
        return;
    // Count creeps by role
    const creeps = room.find(FIND_MY_CREEPS);
    const harvesters = creeps.filter(c => c.memory.role === 'harvester');
    const upgraders = creeps.filter(c => c.memory.role === 'upgrader');
    const builders = creeps.filter(c => c.memory.role === 'builder');
    console.log(`📊 ${room.name}: H=${harvesters.length}, U=${upgraders.length}, B=${builders.length}, RCL=${room.controller.level}`);
    // Spawn logic - Simple priority system
    spawnCreeps(spawn, room, harvesters.length, upgraders.length, builders.length);
    // Run creep behaviors
    creeps.forEach(creep => {
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
        }
    });
}
/**
 * SPAWN LOGIC - RCL1 Priority
 *
 * 1. Minimum 2 harvesters (critical - can't do anything without energy)
 * 2. Minimum 2 upgraders (prevent controller downgrade)
 * 3. Builders only if construction sites exist
 */
function spawnCreeps(spawn, room, harvesterCount, upgraderCount, builderCount) {
    if (spawn.spawning)
        return;
    const energy = room.energyAvailable;
    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);
    // Emergency: Always maintain minimum harvesters
    if (harvesterCount < 2) {
        const body = getBody(energy);
        const result = spawn.spawnCreep(body, `harvester_${Game.time}`, {
            memory: { role: 'harvester', room: room.name, working: false }
        });
        if (result === OK) {
            console.log(`🌾 Spawning harvester with ${energy} energy`);
        }
        return;
    }
    // Priority 2: Maintain upgraders
    if (upgraderCount < 2) {
        const body = getBody(energy);
        const result = spawn.spawnCreep(body, `upgrader_${Game.time}`, {
            memory: { role: 'upgrader', room: room.name, working: false }
        });
        if (result === OK) {
            console.log(`⬆️ Spawning upgrader with ${energy} energy`);
        }
        return;
    }
    // Priority 3: Spawn builder if construction sites exist
    if (constructionSites.length > 0 && builderCount < 2) {
        const body = getBody(energy);
        const result = spawn.spawnCreep(body, `builder_${Game.time}`, {
            memory: { role: 'builder', room: room.name, working: false }
        });
        if (result === OK) {
            console.log(`🔨 Spawning builder with ${energy} energy`);
        }
        return;
    }
    // Expansion: Add more upgraders if we have energy to spare
    if (upgraderCount < 4 && energy >= 550) {
        const body = getBody(energy);
        const result = spawn.spawnCreep(body, `upgrader_${Game.time}`, {
            memory: { role: 'upgrader', room: room.name, working: false }
        });
        if (result === OK) {
            console.log(`⬆️ Spawning additional upgrader`);
        }
    }
}
/**
 * BODY DESIGN - Simple and scalable
 *
 * Pattern: [WORK, CARRY, MOVE] repeating
 * Cost per unit: 200 energy
 *
 * RCL1 with 300 energy: [W, C, M] = 200 energy
 * RCL2 with 550 energy: [W, C, M, W, C, M] = 400 energy
 */
function getBody(energy) {
    const body = [];
    // Start with basic unit
    const unitCost = 200; // WORK (100) + CARRY (50) + MOVE (50)
    let remainingEnergy = energy;
    // Add [W, C, M] units until we run out of energy
    while (remainingEnergy >= unitCost && body.length < 12) {
        body.push(WORK, CARRY, MOVE);
        remainingEnergy -= unitCost;
    }
    // Minimum viable creep if we can't afford a full unit
    if (body.length === 0) {
        body.push(WORK, CARRY, MOVE); // Force at least one unit
    }
    return body;
}
/**
 * HARVESTER - The backbone of the economy
 *
 * Behavior:
 * 1. Harvest energy from source
 * 2. Bring energy to spawn
 * 3. Repeat
 */
function runHarvester(creep) {
    // State machine: Switch between harvesting and delivering
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    if (!creep.memory.working) {
        // Get energy from source
        const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
        if (source) {
            if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                creep.moveTo(source, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
    else {
        // Deliver energy to spawn
        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.transfer(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffffff' } });
            }
        }
        else {
            // Spawn full, help with upgrading instead
            const controller = creep.room.controller;
            if (controller) {
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#ffffff' } });
                }
            }
        }
    }
}
/**
 * UPGRADER - Maintains controller progress
 *
 * Behavior:
 * 1. Withdraw energy from spawn
 * 2. Upgrade controller
 * 3. Repeat
 */
function runUpgrader(creep) {
    // State machine
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    if (!creep.memory.working) {
        // Get energy from spawn
        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.withdraw(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
    else {
        // Upgrade controller
        const controller = creep.room.controller;
        if (controller) {
            if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
            }
        }
    }
}
/**
 * BUILDER - Constructs structures
 *
 * Behavior:
 * 1. Withdraw energy from spawn
 * 2. Build construction sites
 * 3. Repeat
 */
function runBuilder(creep) {
    // State machine
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.working = false;
    }
    if (creep.store.getFreeCapacity() === 0) {
        creep.memory.working = true;
    }
    if (!creep.memory.working) {
        // Get energy from spawn
        const spawn = creep.room.find(FIND_MY_SPAWNS)[0];
        if (spawn && spawn.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (creep.withdraw(spawn, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                creep.moveTo(spawn, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
        }
    }
    else {
        // Build construction sites
        const site = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
        if (site) {
            if (creep.build(site) === ERR_NOT_IN_RANGE) {
                creep.moveTo(site, { visualizePathStyle: { stroke: '#0000ff' } });
            }
        }
        else {
            // No construction sites, help upgrade instead
            const controller = creep.room.controller;
            if (controller) {
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, { visualizePathStyle: { stroke: '#00ff00' } });
                }
            }
        }
    }
}

exports.loop = loop;
//# sourceMappingURL=main.js.map
