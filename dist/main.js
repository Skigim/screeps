'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

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
        // TRAFFIC FLOW OPTIMIZATION: Maintain 1-tile gap on roads for zipper-merge passing
        // Check if next position has a creep AND we're both on/moving to roads
        // Default to TRUE (enabled) unless explicitly disabled
        if (options.maintainRoadGap !== false) {
            let nextPos = Traveler.positionAtDirection(creep.pos, nextDirection);
            if (nextPos && !options.ignoreCreeps) {
                let shouldMaintainGap = this.shouldMaintainTrafficGap(creep, nextPos, destination);
                if (shouldMaintainGap) {
                    // Don't move - maintain gap to allow passing
                    return OK;
                }
            }
        }
        return creep.move(nextDirection);
    }
    /**
     * Traffic flow optimization: Determine if creep should maintain 1-tile gap
     * Allows "zipper merge" behavior where creeps can pass each other on roads
     *
     * @param creep The creep considering movement
     * @param nextPos The position the creep wants to move to
     * @param destination The creep's final destination
     * @returns true if creep should wait to maintain gap
     */
    static shouldMaintainTrafficGap(creep, nextPos, destination) {
        // Only apply gap logic on roads (or if moving to road)
        const currentTerrain = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos);
        const nextTerrain = creep.room.lookForAt(LOOK_STRUCTURES, nextPos);
        const onRoad = currentTerrain.some(s => s.structureType === STRUCTURE_ROAD);
        const nextIsRoad = nextTerrain.some(s => s.structureType === STRUCTURE_ROAD);
        if (!onRoad && !nextIsRoad) {
            return false; // Not on road network, no gap needed
        }
        // Check if there's a creep at next position
        const creepsAtNext = nextPos.lookFor(LOOK_CREEPS);
        if (creepsAtNext.length === 0) {
            return false; // No creep ahead, move normally
        }
        const creepAhead = creepsAtNext[0];
        // Don't maintain gap if creep ahead is stationary (harvester, upgrader at controller)
        if (!creepAhead.memory._trav || creepAhead.fatigue > 0) {
            return false; // Stationary creep, we need to path around
        }
        // Check if creep ahead is moving in same general direction
        const ourDirection = creep.pos.getDirectionTo(destination);
        const theirDirection = creepAhead.pos.getDirectionTo(destination);
        // If moving in similar direction (within 2 directions), maintain gap
        const directionDiff = Math.abs(ourDirection - theirDirection);
        const similarDirection = directionDiff <= 2 || directionDiff >= 6; // Handles wrapping (1-8)
        if (similarDirection) {
            // Both moving same direction on road - maintain 1 tile gap
            return true;
        }
        return false; // Different directions, normal pathfinding
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
                room.memory.avoid = 1;
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
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
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
        room.find(FIND_CREEPS).forEach((creep) => {
            // OPTIMIZATION: Instead of making creeps impassable (0xff), set high cost (10)
            // This allows creeps to path through each other when it's more efficient
            // Enables "zipper merge" behavior on single-lane roads where creeps can pass
            // if they're moving in compatible directions
            matrix.set(creep.pos.x, creep.pos.y, 10);
        });
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
                Memory.rooms[roomName].avoid = 1;
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
if (typeof Creep !== 'undefined') {
    Creep.prototype.travelTo = function (destination, options) {
        return Traveler.travelTo(this, destination, options);
    };
}

/* eslint-disable @typescript-eslint/no-var-requires */
const createFallback = () => {
    const fallback = class StubTasks {
        static chain(tasks = []) {
            return tasks.length > 0 ? tasks[0] : null;
        }
    };
    const taskMethods = [
        'attack',
        'build',
        'claim',
        'dismantle',
        'drop',
        'fortify',
        'getBoosted',
        'getRenewed',
        'goTo',
        'goToRoom',
        'harvest',
        'heal',
        'meleeAttack',
        'pickup',
        'rangedAttack',
        'repair',
        'reserve',
        'signController',
        'transfer',
        'transferAll',
        'upgrade',
        'withdraw',
        'withdrawAll'
    ];
    for (const method of taskMethods) {
        fallback[method] = (..._args) => {
            throw new Error(`Tasks.${method} is unavailable`);
        };
    }
    return fallback;
};
const loadTasks = () => {
    if (typeof Game === 'undefined') {
        return createFallback();
    }
    try {
        require('./runtime/prototypes');
        const tasksModule = require('./runtime/Tasks');
        return tasksModule.Tasks || tasksModule.default;
    }
    catch (error) {
        const globalScope = global;
        if (!globalScope.__creepTasksWarned) {
            console.log(`[Vendor] creep-tasks offline (${error.message})`);
            globalScope.__creepTasksWarned = true;
        }
        return createFallback();
    }
};
const Tasks = loadTasks();

const MIN_ENERGY_LOW = 200;
const DEFAULT_HIGH_ENERGY = 10000;
const derivePolicy = (room, state) => {
    const nextPolicy = {
        threatLevel: state.hostiles.count > 0 ? "poke" : "none",
        upgrade: state.energy.bank < MIN_ENERGY_LOW ? "conserve" : "steady",
        energy: {
            low: MIN_ENERGY_LOW,
            high: Math.max(DEFAULT_HIGH_ENERGY, state.energy.bank)
        },
        cpu: { minBucket: 3000 },
        nav: { moveRatioHint: 0.5 }
    };
    room.memory.policy = nextPolicy;
    return nextPolicy;
};

const energyFromStructure = (structure) => {
    var _a, _b;
    if ("store" in structure && structure.store) {
        const store = structure.store;
        if (typeof store.getUsedCapacity === "function") {
            const capacity = store.getUsedCapacity(RESOURCE_ENERGY);
            return typeof capacity === "number" ? capacity : 0;
        }
        return (_a = store[RESOURCE_ENERGY]) !== null && _a !== void 0 ? _a : 0;
    }
    if ("energy" in structure) {
        return (_b = structure.energy) !== null && _b !== void 0 ? _b : 0;
    }
    return 0;
};
const calculateRoadCoverage = (structures) => {
    const roadCount = structures.filter(structure => structure.structureType === STRUCTURE_ROAD).length;
    if (roadCount === 0) {
        return 0;
    }
    return Math.min(1, roadCount / 100);
};
const buildRoomState = (_room, snapshot) => {
    var _a, _b;
    const energyBank = snapshot.structures.reduce((total, structure) => {
        if (structure.structureType === STRUCTURE_SPAWN ||
            structure.structureType === STRUCTURE_EXTENSION ||
            structure.structureType === STRUCTURE_CONTAINER) {
            return total + energyFromStructure(structure);
        }
        return total;
    }, 0);
    const state = {
        hostiles: { count: snapshot.hostiles.length },
        energy: { bank: energyBank },
        infra: { roadsPct: calculateRoadCoverage(snapshot.structures) },
        flags: { linksOnline: Boolean((_b = (_a = _room.memory) === null || _a === void 0 ? void 0 : _a.flags) === null || _b === void 0 ? void 0 : _b.linksOnline) }
    };
    return state;
};

const Heap = global;
if (!Heap.orders) {
    Heap.orders = new Map();
}
if (!Heap.snap) {
    Heap.snap = { rooms: new Map(), squads: new Map() };
}
if (!Heap.runtime) {
    Heap.runtime = { rooms: new Map() };
}
if (!Heap.debug) {
    Heap.debug = {};
}
const ensureRoomFrame = (roomName) => {
    if (!Heap.snap) {
        Heap.snap = { rooms: new Map(), squads: new Map() };
    }
    let frame = Heap.snap.rooms.get(roomName);
    if (!frame) {
        frame = {};
        Heap.snap.rooms.set(roomName, frame);
    }
    return frame;
};
const getRoomRuntimeFrame = (roomName) => {
    if (!Heap.runtime) {
        Heap.runtime = { rooms: new Map() };
    }
    let runtime = Heap.runtime.rooms.get(roomName);
    if (!runtime) {
        runtime = {
            upgradeSuccess: [],
            spawnStarved: [],
            cpuMedians: [],
            workerCounts: [],
            refillDurations: []
        };
        Heap.runtime.rooms.set(roomName, runtime);
    }
    return runtime;
};

const RCL1Config = {
    worker: {
        min: 3,
        max: 4,
        bodyPlan: "worker-basic"
    },
    spawn: {
        energyBuffer: 200
    }
};

const compileBody = (_plan, _profile, _energyCap, _policy) => {
    return [WORK, CARRY, MOVE];
};
const estimateSpawnTime = (body) => body.length * 3;
const calculateBodyCost = (body) => body.reduce((cost, part) => cost + BODYPART_COST[part], 0);

const orderSignature = (order) => { var _a, _b; return `${order.type}:${(_a = order.targetId) !== null && _a !== void 0 ? _a : "none"}:${(_b = order.posKey) !== null && _b !== void 0 ? _b : "none"}`; };
const ensureHeapMaps = () => {
    if (!Heap.snap) {
        Heap.snap = { rooms: new Map(), squads: new Map() };
    }
    if (!Heap.snap.squads) {
        Heap.snap.squads = new Map();
    }
    if (!Heap.orders) {
        Heap.orders = new Map();
    }
    if (!Heap.debug) {
        Heap.debug = {};
    }
    if (!Heap.debug.creepCpuSamples) {
        Heap.debug.creepCpuSamples = [];
    }
};
const cpuNow = () => (typeof Game !== "undefined" && Game.cpu ? Game.cpu.getUsed() : 0);
const hasEnergyFreeCapacity = (structure) => {
    const store = structure.store;
    if (store && typeof store.getFreeCapacity === "function") {
        const free = store.getFreeCapacity(RESOURCE_ENERGY);
        return typeof free === "number" && free > 0;
    }
    const legacy = structure;
    if (typeof legacy.energy === "number" && typeof legacy.energyCapacity === "number") {
        return legacy.energy < legacy.energyCapacity;
    }
    return false;
};
const findRefillTarget = (snapshot) => {
    const spawn = snapshot.structures.find((structure) => {
        if (structure.structureType !== STRUCTURE_SPAWN) {
            return false;
        }
        return hasEnergyFreeCapacity(structure);
    });
    if (spawn) {
        return spawn;
    }
    return snapshot.structures.find((structure) => {
        if (structure.structureType !== STRUCTURE_EXTENSION) {
            return false;
        }
        return hasEnergyFreeCapacity(structure);
    });
};
const recordMetrics = (room, headcount, queued, idlePct, ordersIssued, ordersChanged) => {
    var _a;
    const squadName = "worker";
    ensureHeapMaps();
    const snap = Heap.snap;
    if (!snap) {
        return;
    }
    const entries = (_a = snap.squads.get(squadName)) !== null && _a !== void 0 ? _a : [];
    const metrics = {
        tick: Game.time,
        room: room.name,
        squad: squadName,
        idlePct,
        ordersIssued,
        ordersChanged,
        headcount,
        queued
    };
    entries.push(metrics);
    if (entries.length > 50) {
        entries.splice(0, entries.length - 50);
    }
    snap.squads.set(squadName, entries);
};
const assignOrder = (creep, room, snapshot) => {
    var _a, _b;
    ensureHeapMaps();
    const isEmpty = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0;
    const controller = room.controller;
    let orderType = "IDLE";
    let targetId;
    const refillTarget = findRefillTarget(snapshot);
    const targetPos = refillTarget ? refillTarget.pos : controller === null || controller === void 0 ? void 0 : controller.pos;
    const posKey = targetPos ? `${targetPos.x},${targetPos.y},${targetPos.roomName}` : undefined;
    if (isEmpty) {
        const source = snapshot.sources[0];
        if (source) {
            orderType = "HARVEST";
            targetId = source.id;
        }
    }
    else if (refillTarget) {
        orderType = "TRANSFER";
        targetId = refillTarget.id;
    }
    else if (controller) {
        orderType = "UPGRADE";
        targetId = controller.id;
    }
    const signature = orderSignature({ type: orderType, targetId, posKey });
    const memory = creep.memory;
    const previousSignature = (_a = memory.orderId) !== null && _a !== void 0 ? _a : "";
    const changed = signature !== previousSignature;
    const order = {
        id: `${creep.name}:${Game.time}`,
        type: orderType,
        params: { persisted: !changed }
    };
    if (targetId) {
        order.targetId = targetId;
    }
    if (posKey) {
        order.params = { ...((_b = order.params) !== null && _b !== void 0 ? _b : {}), posKey };
    }
    if (orderType === "TRANSFER") {
        order.res = RESOURCE_ENERGY;
        order.amount = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    }
    if (Heap.orders) {
        Heap.orders.set(creep.name, order);
    }
    memory.orderId = signature;
    memory.role = "worker";
    memory.squad = "worker";
    return { changed, idle: orderType === "IDLE", order };
};
const moveCreep = (creep, target) => {
    const destination = target instanceof RoomPosition ? target : target.pos;
    creep.moveTo(destination, { reusePath: 5, visualizePathStyle: { stroke: "#ffaa00" } });
};
const executeBasicOrder = (creep, order) => {
    var _a;
    if (!order || order.type === "IDLE") {
        return;
    }
    const target = order.targetId ? Game.getObjectById(order.targetId) : undefined;
    switch (order.type) {
        case "HARVEST": {
            if (!target || target.energy === 0) {
                return;
            }
            const result = creep.harvest(target);
            if (result === ERR_NOT_IN_RANGE) {
                moveCreep(creep, target);
            }
            break;
        }
        case "TRANSFER": {
            if (!target || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                return;
            }
            const result = creep.transfer(target, (_a = order.res) !== null && _a !== void 0 ? _a : RESOURCE_ENERGY);
            if (result === ERR_NOT_IN_RANGE) {
                moveCreep(creep, target);
            }
            else if (result === ERR_FULL || result === ERR_INVALID_TARGET) {
                creep.memory.orderId = undefined;
            }
            break;
        }
        case "UPGRADE": {
            if (!target || !creep.store.getUsedCapacity(RESOURCE_ENERGY)) {
                return;
            }
            const result = creep.upgradeController(target);
            if (result === ERR_NOT_IN_RANGE) {
                moveCreep(creep, target);
            }
            break;
        }
        default: {
            if (order.targetId && target) {
                moveCreep(creep, target);
            }
            break;
        }
    }
};
const maintainPopulation = (context) => {
    const { policy, snapshot } = context;
    const workerCreeps = snapshot.myCreeps.filter(creep => { var _a; return ((_a = creep.memory.role) !== null && _a !== void 0 ? _a : "") === "worker"; });
    if (workerCreeps.length >= RCL1Config.worker.max) {
        return;
    }
    const idleSpawn = snapshot.structures.find((structure) => {
        if (structure.structureType !== STRUCTURE_SPAWN) {
            return false;
        }
        const spawn = structure;
        return !spawn.spawning;
    });
    if (!idleSpawn) {
        return;
    }
    const body = compileBody("worker", RCL1Config.worker.bodyPlan, snapshot.energyCapacityAvailable);
    const cost = calculateBodyCost(body);
    if (snapshot.energyAvailable < cost) {
        return;
    }
    const name = `wrk-${Game.time}-${Math.floor(Math.random() * 1000)}`;
    idleSpawn.spawnCreep(body, name, {
        memory: {
            role: "worker",
            squad: "worker"
        }
    });
};
class WorkerSquad {
    run(context) {
        maintainPopulation(context);
        const workerCreeps = context.snapshot.myCreeps.filter(creep => { var _a; return ((_a = creep.memory.role) !== null && _a !== void 0 ? _a : "") === "worker"; });
        let ordersIssued = 0;
        let ordersChanged = 0;
        let idleCount = 0;
        for (const creep of workerCreeps) {
            const before = cpuNow();
            const { changed, idle, order } = assignOrder(creep, context.room, context.snapshot);
            const after = cpuNow();
            const delta = after - before;
            if (!Heap.debug) {
                Heap.debug = {};
            }
            if (!Heap.debug.creepCpuSamples) {
                Heap.debug.creepCpuSamples = [];
            }
            Heap.debug.creepCpuSamples.push(delta);
            ordersIssued += 1;
            if (changed) {
                ordersChanged += 1;
            }
            if (idle) {
                idleCount += 1;
            }
            executeBasicOrder(creep, order);
        }
        const idlePct = workerCreeps.length === 0 ? 0 : idleCount / workerCreeps.length;
        const queued = context.snapshot.structures.reduce((count, structure) => {
            if (structure.structureType !== STRUCTURE_SPAWN) {
                return count;
            }
            const spawn = structure;
            return spawn.spawning ? count + 1 : count;
        }, 0);
        recordMetrics(context.room, workerCreeps.length, queued, idlePct, ordersIssued, ordersChanged);
        return {
            workers: workerCreeps.length,
            queued,
            targetMin: RCL1Config.worker.min,
            targetMax: RCL1Config.worker.max,
            ordersIssued,
            ordersChanged,
            idlePct
        };
    }
}

const ALERT_LIMIT = 20;
const ROLLING_WINDOW = 50;
const getAugmentedMemory = (room) => room.memory;
const ensureRoomMetrics = (room) => {
    var _a;
    const memory = getAugmentedMemory(room);
    const existing = (_a = memory.metrics) !== null && _a !== void 0 ? _a : {};
    const sanitized = {};
    if (typeof existing.upgradeContinuityPct === "number") {
        sanitized.upgradeContinuityPct = existing.upgradeContinuityPct;
    }
    if (typeof existing.spawnStarvationTicks === "number") {
        sanitized.spawnStarvationTicks = existing.spawnStarvationTicks;
    }
    if (typeof existing.lastControllerProgress === "number") {
        sanitized.lastControllerProgress = existing.lastControllerProgress;
    }
    if (typeof existing.lastSpawnTick === "number") {
        sanitized.lastSpawnTick = existing.lastSpawnTick;
    }
    if (typeof existing.creepCpuMedian === "number") {
        sanitized.creepCpuMedian = existing.creepCpuMedian;
    }
    if (typeof existing.cpuP95 === "number") {
        sanitized.cpuP95 = existing.cpuP95;
    }
    if (typeof existing.refillSlaMedian === "number") {
        sanitized.refillSlaMedian = existing.refillSlaMedian;
    }
    if (typeof existing.workerCount === "number") {
        sanitized.workerCount = existing.workerCount;
    }
    memory.metrics = sanitized;
    return memory.metrics;
};
const pushAlert = (room, type, msg) => {
    const memory = getAugmentedMemory(room);
    if (!memory.alerts) {
        memory.alerts = [];
    }
    memory.alerts.push({ tick: Game.time, type, msg });
    if (memory.alerts.length > ALERT_LIMIT) {
        memory.alerts.splice(0, memory.alerts.length - ALERT_LIMIT);
    }
};
const median = (values) => {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
};
const percentile = (values, fraction) => {
    if (values.length === 0) {
        return 0;
    }
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.ceil(fraction * sorted.length) - 1);
    return sorted[Math.max(0, index)];
};
const runTickMonitors = (room, context) => {
    var _a, _b, _c, _d;
    const memory = getAugmentedMemory(room);
    const metrics = ensureRoomMetrics(room);
    const runtime = getRoomRuntimeFrame(room.name);
    if (!memory.policy) {
        pushAlert(room, "FAIL", "policy missing");
    }
    const workerCreeps = context.snapshot.myCreeps.filter(creep => creep.memory.role === "worker");
    if (workerCreeps.length < RCL1Config.worker.min) {
        pushAlert(room, "WARN", `worker count below target (${workerCreeps.length}/${RCL1Config.worker.min})`);
    }
    runtime.workerCounts.push(workerCreeps.length);
    if (runtime.workerCounts.length > ROLLING_WINDOW) {
        runtime.workerCounts.shift();
    }
    metrics.workerCount = workerCreeps.length;
    const controller = room.controller;
    if (controller && controller.ticksToDowngrade !== undefined && controller.ticksToDowngrade <= 4000) {
        pushAlert(room, "WARN", "controller downgrade risk");
    }
    const progress = (_a = controller === null || controller === void 0 ? void 0 : controller.progress) !== null && _a !== void 0 ? _a : 0;
    const previousProgress = (_b = metrics.lastControllerProgress) !== null && _b !== void 0 ? _b : progress;
    const upgraded = progress > previousProgress ? 1 : 0;
    runtime.upgradeSuccess.push(upgraded);
    if (runtime.upgradeSuccess.length > ROLLING_WINDOW) {
        runtime.upgradeSuccess.shift();
    }
    metrics.lastControllerProgress = progress;
    const desiredWorkers = RCL1Config.worker.min;
    const starved = workerCreeps.length < desiredWorkers && room.energyAvailable < RCL1Config.spawn.energyBuffer;
    runtime.spawnStarved.push(starved ? 1 : 0);
    if (runtime.spawnStarved.length > ROLLING_WINDOW) {
        runtime.spawnStarved.shift();
    }
    const spawns = context.snapshot.structures.filter((structure) => structure.structureType === STRUCTURE_SPAWN);
    if (spawns.some(spawn => spawn.spawning)) {
        metrics.lastSpawnTick = Game.time;
    }
    const creepSamples = (_d = (_c = Heap.debug) === null || _c === void 0 ? void 0 : _c.creepCpuSamples) !== null && _d !== void 0 ? _d : [];
    if (creepSamples.length > 0) {
        const medianCpu = median(creepSamples);
        metrics.creepCpuMedian = Number(medianCpu.toFixed(3));
        runtime.cpuMedians.push(medianCpu);
        if (runtime.cpuMedians.length > 100) {
            runtime.cpuMedians.shift();
        }
        if (medianCpu > 0.3) {
            pushAlert(room, "WARN", `median creep CPU ${medianCpu.toFixed(3)}ms`);
        }
    }
    if (runtime.cpuMedians.length > 0) {
        const cpuP95 = percentile(runtime.cpuMedians, 0.95);
        metrics.cpuP95 = Number(cpuP95.toFixed(3));
    }
    const { energyAvailable, energyCapacityAvailable } = context.snapshot;
    if (energyAvailable < energyCapacityAvailable) {
        if (runtime.refillActiveSince === undefined) {
            runtime.refillActiveSince = Game.time;
        }
    }
    else if (runtime.refillActiveSince !== undefined) {
        const duration = Game.time - runtime.refillActiveSince;
        runtime.refillActiveSince = undefined;
        if (duration > 0) {
            runtime.refillDurations.push(duration);
            if (runtime.refillDurations.length > ROLLING_WINDOW) {
                runtime.refillDurations.shift();
            }
        }
    }
    if (runtime.refillDurations.length > 0) {
        const refillMedian = median(runtime.refillDurations);
        metrics.refillSlaMedian = Number(refillMedian.toFixed(1));
    }
};

const AUDIT_WINDOW = 50;
const toPercent = (value) => `${Math.round(value * 100)}%`;
const runRoomAudit = (room, _context) => {
    const memory = room.memory;
    if (!memory.metrics) {
        memory.metrics = {};
    }
    const metrics = memory.metrics;
    const runtime = getRoomRuntimeFrame(room.name);
    const continuityWindow = runtime.upgradeSuccess.slice(-AUDIT_WINDOW);
    if (continuityWindow.length === AUDIT_WINDOW) {
        const continuity = continuityWindow.reduce((sum, value) => sum + value, 0) / AUDIT_WINDOW;
        metrics.upgradeContinuityPct = Math.round(continuity * 100);
        if (continuity < 0.9) {
            pushAlert(room, "WARN", `upgrade continuity ${toPercent(continuity)} below SLA`);
        }
    }
    const starvedWindow = runtime.spawnStarved.slice(-AUDIT_WINDOW);
    if (starvedWindow.length === AUDIT_WINDOW) {
        const starvedTicks = starvedWindow.reduce((sum, value) => sum + value, 0);
        metrics.spawnStarvationTicks = starvedTicks;
        if (starvedTicks > 3) {
            pushAlert(room, "WARN", `spawn starvation ${starvedTicks} ticks in window`);
        }
    }
};

const RECENT_LIMIT = 10;
const ensureTestsMemory = (memory) => {
    if (!memory.tests) {
        memory.tests = { pass: 0, fail: 0, recent: [] };
    }
    if (!memory.tests.recent) {
        memory.tests.recent = [];
    }
    return memory.tests;
};
const recordAssertion = (memory, name, pass, details) => {
    var _a;
    const tests = ensureTestsMemory(memory);
    if (pass) {
        tests.pass += 1;
    }
    else {
        tests.fail += 1;
    }
    tests.lastTick = Game.time;
    tests.recent = (_a = tests.recent) !== null && _a !== void 0 ? _a : [];
    tests.recent.push({ name, pass, tick: Game.time, details });
    if (tests.recent.length > RECENT_LIMIT) {
        tests.recent.splice(0, tests.recent.length - RECENT_LIMIT);
    }
};
const runRoomAssertions = (room, context) => {
    const memory = room.memory;
    recordAssertion(memory, "policy-energy-low", context.policy.energy.low === 200, `low=${context.policy.energy.low}`);
    recordAssertion(memory, "policy-nav-hint", context.policy.nav.moveRatioHint === 0.5, `hint=${context.policy.nav.moveRatioHint}`);
    const expectedUpgrade = context.state.energy.bank < 200 ? "conserve" : "steady";
    recordAssertion(memory, "policy-upgrade-bank", context.policy.upgrade === expectedUpgrade, `bank=${context.state.energy.bank} mode=${context.policy.upgrade}`);
    const body = compileBody("worker", RCL1Config.worker.bodyPlan, room.energyCapacityAvailable, context.policy);
    const spawnTime = estimateSpawnTime(body);
    recordAssertion(memory, "worker-spawn-time", spawnTime <= 300, `spawnTime=${spawnTime}`);
};

const initializeTick = () => {
    if (!Heap.orders) {
        Heap.orders = new Map();
    }
    Heap.orders.clear();
    if (!Heap.snap) {
        Heap.snap = { rooms: new Map(), squads: new Map() };
    }
    Heap.snap.rooms.clear();
    Heap.snap.squads.clear();
    if (!Heap.debug) {
        Heap.debug = {};
    }
    Heap.debug.roomScans = {};
    Heap.debug.creepCpuSamples = [];
};
const sense = (room) => {
    var _a;
    const snapshot = {
        tick: Game.time,
        structures: room.find(FIND_STRUCTURES),
        hostiles: room.find(FIND_HOSTILE_CREEPS),
        myCreeps: room.find(FIND_MY_CREEPS),
        sources: room.find(FIND_SOURCES),
        energyAvailable: room.energyAvailable,
        energyCapacityAvailable: room.energyCapacityAvailable
    };
    const frame = ensureRoomFrame(room.name);
    frame.snapshot = snapshot;
    if (!Heap.debug) {
        Heap.debug = {};
    }
    if (!Heap.debug.roomScans) {
        Heap.debug.roomScans = {};
    }
    Heap.debug.roomScans[room.name] = ((_a = Heap.debug.roomScans[room.name]) !== null && _a !== void 0 ? _a : 0) + 1;
    return snapshot;
};
const writeCompactState = (room, state) => {
    const compact = {
        bank: state.energy.bank,
        hostiles: state.hostiles.count,
        roads: Number(state.infra.roadsPct.toFixed(2)),
        links: state.flags.linksOnline ? 1 : 0
    };
    room.memory.state = compact;
};
const synthesize = (room, snapshot) => {
    const state = buildRoomState(room, snapshot);
    const policy = derivePolicy(room, state);
    writeCompactState(room, state);
    const frame = ensureRoomFrame(room.name);
    frame.state = state;
    frame.policy = policy;
    return { state, policy };
};
const decide = (room, policy) => {
    const directives = {
        refill: { slaTicks: 300 },
        upgrade: { mode: policy.upgrade }
    };
    const frame = ensureRoomFrame(room.name);
    frame.directives = directives;
    return directives;
};
const logSense = (room, snapshot) => {
    const metrics = [
        `energy=${snapshot.energyAvailable}/${snapshot.energyCapacityAvailable}`,
        `workers=${snapshot.myCreeps.length}`,
        `hostiles=${snapshot.hostiles.length}`
    ].join(" ");
    console.log(`[Survey ${room.name}] ${metrics}`);
};
const logSynthesize = (room, policy) => {
    const summary = [
        `upgrade=${policy.upgrade}`,
        `threat=${policy.threatLevel}`,
        `nav.move=${policy.nav.moveRatioHint}`
    ].join(" ");
    console.log(`[Council ${room.name}] policy: ${summary}`);
};
const logDecide = (room, directives) => {
    console.log(`[Mayor ${room.name}] directives: refill=${directives.refill.slaTicks} upgrade=${directives.upgrade.mode}`);
};
const logAct = (room, report) => {
    const details = [
        `workers=${report.workers}/${report.targetMax}`,
        `queued=${report.queued}`,
        `ordersIssued=${report.ordersIssued}`,
        `ordersChanged=${report.ordersChanged}`,
        `idlePct=${report.idlePct.toFixed(2)}`
    ].join(" ");
    console.log(`[Foreman ${room.name}] ${details}`);
};
const logChronicler = (room, context, report) => {
    var _a, _b;
    const memory = room.memory;
    const metrics = (_a = memory.metrics) !== null && _a !== void 0 ? _a : {};
    const alerts = (_b = memory.alerts) !== null && _b !== void 0 ? _b : [];
    const cpuP95 = metrics.cpuP95 !== undefined ? metrics.cpuP95.toFixed(3) : "-";
    const refillMedian = metrics.refillSlaMedian !== undefined ? metrics.refillSlaMedian.toFixed(1) : "-";
    const chronicle = [
        `t=${Game.time}`,
        `cpu.p95=${cpuP95}`,
        `workers=${report.workers}`,
        `upgrade=${context.policy.upgrade}`,
        `refillSLA.median=${refillMedian}`,
        `alerts=${alerts.length}`
    ].join(" ");
    console.log(`[Chronicler ${room.name}] ${chronicle}`);
};
const act = (room, context) => {
    const workerSquad = new WorkerSquad();
    return workerSquad.run({
        room,
        policy: context.policy,
        directives: context.directives,
        state: context.state,
        snapshot: context.snapshot
    });
};
const runTick = () => {
    if (typeof Game === "undefined") {
        return;
    }
    initializeTick();
    const rooms = Object.values(Game.rooms);
    for (const room of rooms) {
        const snapshot = sense(room);
        logSense(room, snapshot);
        const { state, policy } = synthesize(room, snapshot);
        logSynthesize(room, policy);
        const directives = decide(room, policy);
        logDecide(room, directives);
        const tickContext = {
            state,
            policy,
            directives,
            snapshot
        };
        const report = act(room, tickContext);
        logAct(room, report);
        runTickMonitors(room, tickContext);
        if (Game.time % 50 === 0) {
            runRoomAudit(room);
        }
        if (Game.time % 500 === 0) {
            runRoomAssertions(room, tickContext);
        }
        if (Game.time % 100 === 0) {
            logChronicler(room, tickContext, report);
        }
    }
};

const bootstrapVendors = () => {
    global.Traveler = Traveler;
    global.Tasks = Tasks;
};
bootstrapVendors();
const cleanupCreepMemory = () => {
    if (typeof Memory === "undefined" || typeof Game === "undefined") {
        return;
    }
    for (const name of Object.keys(Memory.creeps)) {
        if (!Game.creeps[name]) {
            delete Memory.creeps[name];
        }
    }
};
global.__GIT_HASH__ = "25aba14";
const loop = () => {
    var _a;
    cleanupCreepMemory();
    runTick();
    if (typeof Game !== "undefined" && Game.time % 150 === 0) {
        console.log(`Loop tick=${Game.time} hash=${(_a = global.__GIT_HASH__) !== null && _a !== void 0 ? _a : "development"}`);
    }
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
