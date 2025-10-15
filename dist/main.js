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

// Universal reference properties
function deref(ref) {
    return Game.getObjectById(ref) || Game.flags[ref] || Game.creeps[ref] || Game.spawns[ref] || null;
}
function derefRoomPosition(protoPos) {
    return new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName);
}
function isEnergyStructure(structure) {
    return structure.energy !== undefined && structure.energyCapacity !== undefined;
}
function isStoreStructure(structure) {
    return structure.store !== undefined;
}

/**
 * Creep tasks setup instructions
 *
 * Javascript:
 * 1. In main.js:    require("creep-tasks");
 * 2. As needed:     var Tasks = require("<path to creep-tasks.js>");
 *
 * Typescript:
 * 1. In main.ts:    import "<path to index.ts>";
 * 2. As needed:     import {Tasks} from "<path to Tasks.ts>"
 *
 * If you use Traveler, change all occurrences of creep.moveTo() to creep.travelTo()
 */
/* An abstract class for encapsulating creep actions. This generalizes the concept of "do action X to thing Y until
 * condition Z is met" and saves a lot of convoluted and duplicated code in creep logic. A Task object contains
 * the necessary logic for traveling to a target, performing a task, and realizing when a task is no longer sensible
 * to continue.*/
class Task {
    constructor(taskName, target, options = {}) {
        // Parameters for the task
        this.name = taskName;
        this._creep = {
            name: '',
        };
        if (target) { // Handles edge cases like when you're done building something and target disappears
            this._target = {
                ref: target.ref,
                _pos: target.pos,
            };
        }
        else {
            this._target = {
                ref: '',
                _pos: {
                    x: -1,
                    y: -1,
                    roomName: '',
                }
            };
        }
        this._parent = null;
        this.settings = {
            targetRange: 1,
            workOffRoad: false,
            oneShot: false,
        };
        _.defaults(options, {
            blind: false,
            moveOptions: {},
        });
        this.tick = Game.time;
        this.options = options;
        this.data = {
            quiet: true,
        };
    }
    get proto() {
        return {
            name: this.name,
            _creep: this._creep,
            _target: this._target,
            _parent: this._parent,
            options: this.options,
            data: this.data,
            tick: this.tick,
        };
    }
    set proto(protoTask) {
        // Don't write to this.name; used in task switcher
        this._creep = protoTask._creep;
        this._target = protoTask._target;
        this._parent = protoTask._parent;
        this.options = protoTask.options;
        this.data = protoTask.data;
        this.tick = protoTask.tick;
    }
    // Getter/setter for task.creep
    get creep() {
        return Game.creeps[this._creep.name];
    }
    set creep(creep) {
        this._creep.name = creep.name;
    }
    // Dereferences the target
    get target() {
        const roomObject = deref(this._target.ref);
        if (roomObject) {
            return roomObject;
        }
        if (this._target._pos.roomName) {
            return derefRoomPosition(this._target._pos);
        }
        return null;
    }
    // Dereferences the saved target position; useful for situations where you might lose vision
    get targetPos() {
        // refresh if you have visibility of the target
        const roomObject = deref(this._target.ref);
        if (roomObject) {
            this._target._pos = roomObject.pos;
            return roomObject.pos;
        }
        return derefRoomPosition(this._target._pos);
    }
    // Getter/setter for task parent
    get parent() {
        return (this._parent ? initializeTask(this._parent) : null);
    }
    set parent(parentTask) {
        this._parent = parentTask ? parentTask.proto : null;
        // If the task is already assigned to a creep, update their memory
        if (this.creep) {
            this.creep.task = this;
        }
    }
    // Return a list of [this, this.parent, this.parent.parent, ...] as tasks
    get manifest() {
        const manifest = [this];
        let parent = this.parent;
        while (parent) {
            manifest.push(parent);
            parent = parent.parent;
        }
        return manifest;
    }
    // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
    get targetManifest() {
        const targetRefs = [this._target.ref];
        let parent = this._parent;
        while (parent) {
            targetRefs.push(parent._target.ref);
            parent = parent._parent;
        }
        return _.map(targetRefs, ref => deref(ref));
    }
    // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
    get targetPosManifest() {
        const targetPositions = [this._target._pos];
        let parent = this._parent;
        while (parent) {
            targetPositions.push(parent._target._pos);
            parent = parent._parent;
        }
        return _.map(targetPositions, protoPos => derefRoomPosition(protoPos));
    }
    // Fork the task, assigning a new task to the creep with this task as its parent
    fork(newTask) {
        newTask.parent = this;
        if (this.creep) {
            this.creep.task = newTask;
        }
        return newTask;
    }
    isValid() {
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        let validTarget = false;
        if (this.target) {
            validTarget = this.isValidTarget();
        }
        else if (this.options.blind && !Game.rooms[this.targetPos.roomName]) {
            // If you can't see the target's room but you have blind enabled, then that's okay
            validTarget = true;
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask && validTarget) {
            return true;
        }
        else {
            // Switch to parent task if there is one
            this.finish();
            return this.parent ? this.parent.isValid() : false;
        }
    }
    moveToTarget(range = this.settings.targetRange) {
        if (this.options.moveOptions && !this.options.moveOptions.range) {
            this.options.moveOptions.range = range;
        }
        return this.creep.moveTo(this.targetPos, this.options.moveOptions);
        // return this.creep.travelTo(this.targetPos, this.options.moveOptions); // <- switch if you use Traveler
    }
    /* Moves to the next position on the agenda if specified - call this in some tasks after work() is completed */
    moveToNextPos() {
        if (this.options.nextPos) {
            const nextPos = derefRoomPosition(this.options.nextPos);
            return this.creep.moveTo(nextPos);
            // return this.creep.travelTo(nextPos); // <- switch if you use Traveler
        }
        return undefined;
    }
    // Return expected number of ticks until creep arrives at its first destination; this requires Traveler to work!
    get eta() {
        if (this.creep && this.creep.memory._trav) {
            return this.creep.memory._trav.path.length;
        }
        return undefined;
    }
    // Execute this task each tick. Returns nothing unless work is done.
    run() {
        if (this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange) && !this.creep.pos.isEdge) {
            if (this.settings.workOffRoad) {
                // Move to somewhere nearby that isn't on a road
                this.parkCreep(this.creep, this.targetPos, true);
            }
            const result = this.work();
            if (this.settings.oneShot && result === OK) {
                this.finish();
            }
            return result;
        }
        else {
            this.moveToTarget();
        }
        return undefined;
    }
    /* Bundled form of Zerg.park(); adapted from BonzAI codebase*/
    parkCreep(creep, pos = creep.pos, maintainDistance = false) {
        const road = _.find(creep.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_ROAD);
        if (!road)
            return OK;
        let positions = _.sortBy(creep.pos.availableNeighbors(), (p) => p.getRangeTo(pos));
        if (maintainDistance) {
            const currentRange = creep.pos.getRangeTo(pos);
            positions = _.filter(positions, (p) => p.getRangeTo(pos) <= currentRange);
        }
        let swampPosition;
        for (const position of positions) {
            if (_.find(position.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_ROAD))
                continue;
            const terrain = position.lookFor(LOOK_TERRAIN)[0];
            if (terrain === 'swamp') {
                swampPosition = position;
            }
            else {
                return creep.move(creep.pos.getDirectionTo(position));
            }
        }
        if (swampPosition) {
            return creep.move(creep.pos.getDirectionTo(swampPosition));
        }
        return creep.moveTo(pos);
        // return creep.travelTo(pos); // <- switch if you use Traveler
    }
    // Finalize the task and switch to parent task (or null if there is none)
    finish() {
        this.moveToNextPos();
        if (this.creep) {
            this.creep.task = this.parent;
        }
        else {
            console.log(`No creep executing ${this.name}!`);
        }
    }
}

// Attack task, includes attack and ranged attack if applicable.
class TaskAttack extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskAttack.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }
    isValidTask() {
        return (this.creep.getActiveBodyparts(ATTACK) > 0 || this.creep.getActiveBodyparts(RANGED_ATTACK) > 0);
    }
    isValidTarget() {
        return !!(this.target && this.target.hits > 0);
    }
    work() {
        const creep = this.creep;
        const target = this.target;
        let attackReturn = 0;
        let rangedAttackReturn = 0;
        if (creep.getActiveBodyparts(ATTACK) > 0) {
            if (creep.pos.isNearTo(target)) {
                attackReturn = creep.attack(target);
            }
            else {
                attackReturn = this.moveToTarget(1); // approach target if you also have attack parts
            }
        }
        if (creep.pos.inRangeTo(target, 3) && creep.getActiveBodyparts(RANGED_ATTACK) > 0) {
            rangedAttackReturn = creep.rangedAttack(target);
        }
        if (attackReturn === OK && rangedAttackReturn === OK) {
            return OK;
        }
        else {
            if (attackReturn !== OK) {
                return attackReturn;
            }
            else {
                return rangedAttackReturn;
            }
        }
    }
}
TaskAttack.taskName = 'attack';

// TaskBuild: builds a construction site until creep has no energy or site is complete
class TaskBuild extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskBuild.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }
    isValidTask() {
        return this.creep.carry.energy > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.my && this.target.progress < this.target.progressTotal);
    }
    work() {
        return this.creep.build(this.target);
    }
}
TaskBuild.taskName = 'build';

// TaskClaim: claims a new controller
class TaskClaim extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskClaim.taskName, target, options);
        // Settings
    }
    isValidTask() {
        return (this.creep.getActiveBodyparts(CLAIM) > 0);
    }
    isValidTarget() {
        return !!(this.target && (!this.target.room || !this.target.owner));
    }
    work() {
        return this.creep.claimController(this.target);
    }
}
TaskClaim.taskName = 'claim';

// TaskDismantle: dismantles a structure
class TaskDismantle extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskDismantle.taskName, target, options);
    }
    isValidTask() {
        return (this.creep.getActiveBodyparts(WORK) > 0);
    }
    isValidTarget() {
        return !!(this.target && this.target.hits > 0);
    }
    work() {
        return this.creep.dismantle(this.target);
    }
}
TaskDismantle.taskName = 'dismantle';

class TaskFortify extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskFortify.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }
    isValidTask() {
        return (this.creep.carry.energy > 0);
    }
    isValidTarget() {
        const target = this.target;
        return !!(target && target.hits < target.hitsMax); // over-fortify to minimize extra trips
    }
    work() {
        return this.creep.repair(this.target);
    }
}
TaskFortify.taskName = 'fortify';

const MIN_LIFETIME_FOR_BOOST = 0.9;
function boostCounts(creep) {
    return _.countBy(creep.body, (bodyPart) => bodyPart.boost);
}
const boostParts = {
    'UH': ATTACK,
    'UO': WORK,
    'KH': CARRY,
    'KO': RANGED_ATTACK,
    'LH': WORK,
    'LO': HEAL,
    'ZH': WORK,
    'ZO': MOVE,
    'GH': WORK,
    'GO': TOUGH,
    'UH2O': ATTACK,
    'UHO2': WORK,
    'KH2O': CARRY,
    'KHO2': RANGED_ATTACK,
    'LH2O': WORK,
    'LHO2': HEAL,
    'ZH2O': WORK,
    'ZHO2': MOVE,
    'GH2O': WORK,
    'GHO2': TOUGH,
    'XUH2O': ATTACK,
    'XUHO2': WORK,
    'XKH2O': CARRY,
    'XKHO2': RANGED_ATTACK,
    'XLH2O': WORK,
    'XLHO2': HEAL,
    'XZH2O': WORK,
    'XZHO2': MOVE,
    'XGH2O': WORK,
    'XGHO2': TOUGH,
};
class TaskGetBoosted extends Task {
    get target() {
        return super.target;
    }
    constructor(target, boostType, partCount = undefined, options = {}) {
        super(TaskGetBoosted.taskName, target, options);
        // Settings
        this.data.resourceType = boostType;
        this.data.amount = partCount;
    }
    isValidTask() {
        const lifetime = _.any(this.creep.body, (part) => part.type === CLAIM) ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
        if (this.creep.ticksToLive && this.creep.ticksToLive < MIN_LIFETIME_FOR_BOOST * lifetime) {
            return false; // timeout after this amount of lifespan has passed
        }
        const partCount = (this.data.amount || this.creep.getActiveBodyparts(boostParts[this.data.resourceType]));
        return (boostCounts(this.creep)[this.data.resourceType] || 0) < partCount;
    }
    isValidTarget() {
        return true; // Warning: this will block creep actions if the lab is left unsupplied of energy or minerals
    }
    work() {
        const partCount = (this.data.amount || this.creep.getActiveBodyparts(boostParts[this.data.resourceType]));
        if (this.target.mineralType === this.data.resourceType &&
            this.target.mineralAmount >= LAB_BOOST_MINERAL * partCount &&
            this.target.energy >= LAB_BOOST_ENERGY * partCount) {
            return this.target.boostCreep(this.creep, this.data.amount);
        }
        else {
            return ERR_NOT_FOUND;
        }
    }
}
TaskGetBoosted.taskName = 'getBoosted';

class TaskGetRenewed extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskGetRenewed.taskName, target, options);
    }
    isValidTask() {
        const hasClaimPart = _.filter(this.creep.body, (part) => part.type === CLAIM).length > 0;
        const lifetime = hasClaimPart ? CREEP_CLAIM_LIFE_TIME : CREEP_LIFE_TIME;
        return this.creep.ticksToLive !== undefined && this.creep.ticksToLive < 0.9 * lifetime;
    }
    isValidTarget() {
        return !!(this.target && this.target.my);
    }
    work() {
        return this.target.renewCreep(this.creep);
    }
}
TaskGetRenewed.taskName = 'getRenewed';

function hasPos(obj) {
    return obj.pos !== undefined;
}
class TaskGoTo extends Task {
    constructor(target, options = {}) {
        if (hasPos(target)) {
            super(TaskGoTo.taskName, { ref: '', pos: target.pos }, options);
        }
        else {
            super(TaskGoTo.taskName, { ref: '', pos: target }, options);
        }
        // Settings
        this.settings.targetRange = 1;
    }
    isValidTask() {
        return !this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange);
    }
    isValidTarget() {
        return true;
    }
    isValid() {
        // It's necessary to override task.isValid() for tasks which do not have a RoomObject target
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask) {
            return true;
        }
        else {
            // Switch to parent task if there is one
            let isValid = false;
            if (this.parent) {
                isValid = this.parent.isValid();
            }
            this.finish();
            return isValid;
        }
    }
    work() {
        return OK;
    }
}
TaskGoTo.taskName = 'goTo';

class TaskGoToRoom extends Task {
    constructor(roomName, options = {}) {
        super(TaskGoToRoom.taskName, { ref: '', pos: new RoomPosition(25, 25, roomName) }, options);
        // Settings
        this.settings.targetRange = 24; // Target is almost always controller flag, so range of 2 is acceptable
    }
    isValidTask() {
        return !this.creep.pos.inRangeTo(this.targetPos, this.settings.targetRange);
    }
    isValidTarget() {
        return true;
    }
    isValid() {
        // It's necessary to override task.isValid() for tasks which do not have a RoomObject target
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask) {
            return true;
        }
        else {
            // Switch to parent task if there is one
            let isValid = false;
            if (this.parent) {
                isValid = this.parent.isValid();
            }
            this.finish();
            return isValid;
        }
    }
    work() {
        return OK;
    }
}
TaskGoToRoom.taskName = 'goToRoom';

function isSource(obj) {
    return obj.energy !== undefined;
}
class TaskHarvest extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskHarvest.taskName, target, options);
    }
    isValidTask() {
        return this.creep.store.getFreeCapacity() > 0;
    }
    isValidTarget() {
        // if (this.target && (this.target instanceof Source ? this.target.energy > 0 : this.target.mineralAmount > 0)) {
        // 	// Valid only if there's enough space for harvester to work - prevents doing tons of useless pathfinding
        // 	return this.target.pos.availableNeighbors().length > 0 || this.creep.pos.isNearTo(this.target.pos);
        // }
        // return false;
        if (this.target) {
            if (isSource(this.target)) {
                return this.target.energy > 0;
            }
            else {
                return this.target.mineralAmount > 0;
            }
        }
        return false;
    }
    work() {
        return this.creep.harvest(this.target);
    }
}
TaskHarvest.taskName = 'harvest';

class TaskHeal extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskHeal.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }
    isValidTask() {
        return (this.creep.getActiveBodyparts(HEAL) > 0);
    }
    isValidTarget() {
        return !!(this.target && this.target.hits < this.target.hitsMax && this.target.my);
    }
    work() {
        if (this.creep.pos.isNearTo(this.target)) {
            return this.creep.heal(this.target);
        }
        else {
            this.moveToTarget(1);
        }
        return this.creep.rangedHeal(this.target);
    }
}
TaskHeal.taskName = 'heal';

class TaskMeleeAttack extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskMeleeAttack.taskName, target, options);
        // Settings
        this.settings.targetRange = 1;
    }
    isValidTask() {
        return this.creep.getActiveBodyparts(ATTACK) > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.hits > 0);
    }
    work() {
        return this.creep.attack(this.target);
    }
}
TaskMeleeAttack.taskName = 'meleeAttack';

class TaskPickup extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskPickup.taskName, target, options);
        this.settings.oneShot = true;
    }
    isValidTask() {
        return this.creep.store.getFreeCapacity() > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.amount > 0);
    }
    work() {
        return this.creep.pickup(this.target);
    }
}
TaskPickup.taskName = 'pickup';

class TaskRangedAttack extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskRangedAttack.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }
    isValidTask() {
        return this.creep.getActiveBodyparts(RANGED_ATTACK) > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.hits > 0);
    }
    work() {
        return this.creep.rangedAttack(this.target);
    }
}
TaskRangedAttack.taskName = 'rangedAttack';

/* This is the withdrawal task for non-energy resources. */
class TaskWithdraw extends Task {
    get target() {
        return super.target;
    }
    constructor(target, resourceType = RESOURCE_ENERGY, amount = undefined, options = {}) {
        super(TaskWithdraw.taskName, target, options);
        // Settings
        this.settings.oneShot = true;
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }
    isValidTask() {
        const amount = this.data.amount || 1;
        const freeCapacity = this.creep.store.getFreeCapacity(this.data.resourceType);
        return (freeCapacity !== null && freeCapacity !== void 0 ? freeCapacity : 0) >= amount;
    }
    isValidTarget() {
        const amount = this.data.amount || 1;
        const target = this.target;
        if (!target)
            return false;
        if (target instanceof Tombstone || isStoreStructure(target)) {
            return (target.store[this.data.resourceType] || 0) >= amount;
        }
        else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
            return target.energy >= amount;
        }
        else {
            if (target instanceof StructureLab) {
                return this.data.resourceType === target.mineralType && target.mineralAmount >= amount;
            }
            else if (target instanceof StructureNuker) {
                return this.data.resourceType === RESOURCE_GHODIUM && target.ghodium >= amount;
            }
            else if (target instanceof StructurePowerSpawn) {
                return this.data.resourceType === RESOURCE_POWER && target.power >= amount;
            }
        }
        return false;
    }
    work() {
        return this.creep.withdraw(this.target, this.data.resourceType, this.data.amount);
    }
}
TaskWithdraw.taskName = 'withdraw';

class TaskRepair extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskRepair.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
    }
    isValidTask() {
        return this.creep.carry.energy > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.hits < this.target.hitsMax);
    }
    work() {
        const result = this.creep.repair(this.target);
        if (this.target.structureType === STRUCTURE_ROAD) {
            // prevents workers from idling for a tick before moving to next target
            const newHits = this.target.hits + this.creep.getActiveBodyparts(WORK) * REPAIR_POWER;
            if (newHits > this.target.hitsMax) {
                this.finish();
            }
        }
        return result;
    }
}
TaskRepair.taskName = 'repair';

class TaskReserve extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskReserve.taskName, target, options);
    }
    isValidTask() {
        return (this.creep.getActiveBodyparts(CLAIM) > 0);
    }
    isValidTarget() {
        const target = this.target;
        return !!(target && !target.owner && (!target.reservation || target.reservation.ticksToEnd < 4999));
    }
    work() {
        return this.creep.reserveController(this.target);
    }
}
TaskReserve.taskName = 'reserve';

class TaskSignController extends Task {
    get target() {
        return super.target;
    }
    constructor(target, signature = 'Your signature here', options = {}) {
        super(TaskSignController.taskName, target, options);
        this.data.signature = signature;
    }
    isValidTask() {
        return true;
    }
    isValidTarget() {
        const controller = this.target;
        const signature = this.data.signature;
        return !!(controller && (!controller.sign || controller.sign.text !== signature));
    }
    work() {
        return this.creep.signController(this.target, this.data.signature);
    }
}
TaskSignController.taskName = 'signController';

class TaskTransfer extends Task {
    get target() {
        return super.target;
    }
    constructor(target, resourceType = RESOURCE_ENERGY, amount = undefined, options = {}) {
        super(TaskTransfer.taskName, target, options);
        // Settings
        this.settings.oneShot = true;
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }
    isValidTask() {
        const amount = this.data.amount || 1;
        const resourcesInCarry = this.creep.carry[this.data.resourceType] || 0;
        return resourcesInCarry >= amount;
    }
    isValidTarget() {
        const amount = this.data.amount || 1;
        const target = this.target;
        if (!target)
            return false;
        if (target instanceof Creep) {
            const freeCapacity = target.store.getFreeCapacity(this.data.resourceType);
            return (freeCapacity !== null && freeCapacity !== void 0 ? freeCapacity : 0) >= amount;
        }
        else if (isStoreStructure(target)) {
            const freeCapacity = target.store.getFreeCapacity(this.data.resourceType);
            return (freeCapacity !== null && freeCapacity !== void 0 ? freeCapacity : 0) >= amount;
        }
        else if (isEnergyStructure(target) && this.data.resourceType === RESOURCE_ENERGY) {
            return target.energy <= target.energyCapacity - amount;
        }
        else {
            if (target instanceof StructureLab) {
                return (target.mineralType === this.data.resourceType || !target.mineralType) &&
                    target.mineralAmount <= target.mineralCapacity - amount;
            }
            else if (target instanceof StructureNuker) {
                return this.data.resourceType === RESOURCE_GHODIUM &&
                    target.ghodium <= target.ghodiumCapacity - amount;
            }
            else if (target instanceof StructurePowerSpawn) {
                return this.data.resourceType === RESOURCE_POWER &&
                    target.power <= target.powerCapacity - amount;
            }
        }
        return false;
    }
    work() {
        return this.creep.transfer(this.target, this.data.resourceType, this.data.amount);
    }
}
TaskTransfer.taskName = 'transfer';

class TaskUpgrade extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskUpgrade.taskName, target, options);
        // Settings
        this.settings.targetRange = 3;
        this.settings.workOffRoad = true;
    }
    isValidTask() {
        var _a;
        if (this.creep.store) {
            return this.creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
        const legacyCarry = this.creep.carry;
        return ((_a = legacyCarry === null || legacyCarry === void 0 ? void 0 : legacyCarry.energy) !== null && _a !== void 0 ? _a : 0) > 0;
    }
    isValidTarget() {
        return !!(this.target && this.target.my);
    }
    work() {
        var _a, _b;
        const result = this.creep.upgradeController(this.target);
        if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_INVALID_TARGET) {
            this.finish();
            return result;
        }
        if (result === OK) {
            const remaining = this.creep.store
                ? this.creep.store.getUsedCapacity(RESOURCE_ENERGY)
                : (_b = (_a = this.creep.carry) === null || _a === void 0 ? void 0 : _a.energy) !== null && _b !== void 0 ? _b : 0;
            if (!remaining) {
                this.finish();
            }
        }
        return result;
    }
}
TaskUpgrade.taskName = 'upgrade';

// TaskDrop: drops a resource at a position
class TaskDrop extends Task {
    get target() {
        const resolvedTarget = super.target;
        if (resolvedTarget instanceof RoomPosition) {
            return resolvedTarget;
        }
        if (resolvedTarget) {
            return resolvedTarget.pos;
        }
        if (!this._target._pos.roomName) {
            return null;
        }
        return derefRoomPosition(this._target._pos);
    }
    constructor(target, resourceType = RESOURCE_ENERGY, amount = undefined, options = {}) {
        if (target instanceof RoomPosition) {
            super(TaskDrop.taskName, { ref: '', pos: target }, options);
        }
        else {
            super(TaskDrop.taskName, { ref: '', pos: target.pos }, options);
        }
        // Settings
        this.settings.oneShot = true;
        this.settings.targetRange = 0;
        // Data
        this.data.resourceType = resourceType;
        this.data.amount = amount;
    }
    isValidTask() {
        const amount = this.data.amount || 1;
        const resourcesInCarry = this.creep.carry[this.data.resourceType] || 0;
        return resourcesInCarry >= amount;
    }
    isValidTarget() {
        return true;
    }
    isValid() {
        // It's necessary to override task.isValid() for tasks which do not have a RoomObject target
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask) {
            return true;
        }
        else {
            // Switch to parent task if there is one
            let isValid = false;
            if (this.parent) {
                isValid = this.parent.isValid();
            }
            this.finish();
            return isValid;
        }
    }
    work() {
        return this.creep.drop(this.data.resourceType, this.data.amount);
    }
}
TaskDrop.taskName = 'drop';

// Invalid task assigned if instantiation fails.
class TaskInvalid extends Task {
    constructor(target, options = {}) {
        super('INVALID', target, options);
    }
    isValidTask() {
        return false;
    }
    isValidTarget() {
        return false;
    }
    work() {
        return OK;
    }
}
TaskInvalid.taskName = 'invalid';

class TaskTransferAll extends Task {
    get target() {
        return super.target;
    }
    constructor(target, skipEnergy = false, options = {}) {
        super(TaskTransferAll.taskName, target, options);
        this.data.skipEnergy = skipEnergy;
    }
    isValidTask() {
        for (const resourceType in this.creep.carry) {
            if (this.data.skipEnergy && resourceType === RESOURCE_ENERGY) {
                continue;
            }
            const amountInCarry = this.creep.carry[resourceType] || 0;
            if (amountInCarry > 0) {
                return true;
            }
        }
        return false;
    }
    isValidTarget() {
        var _a;
        if (!this.target) {
            return false;
        }
        const store = this.target.store;
        if (store && typeof store.getFreeCapacity === 'function') {
            return ((_a = store.getFreeCapacity()) !== null && _a !== void 0 ? _a : 0) > 0;
        }
        if (typeof this.target.storeCapacity === 'number') {
            return _.sum(store) < this.target.storeCapacity;
        }
        return false;
    }
    work() {
        for (const resourceType in this.creep.carry) {
            if (this.data.skipEnergy && resourceType === RESOURCE_ENERGY) {
                continue;
            }
            const amountInCarry = this.creep.carry[resourceType] || 0;
            if (amountInCarry > 0) {
                return this.creep.transfer(this.target, resourceType);
            }
        }
        return -1;
    }
}
TaskTransferAll.taskName = 'transferAll';

class TaskWithdrawAll extends Task {
    get target() {
        return super.target;
    }
    constructor(target, options = {}) {
        super(TaskWithdrawAll.taskName, target, options);
    }
    isValidTask() {
        var _a, _b;
        if (typeof ((_a = this.creep.store) === null || _a === void 0 ? void 0 : _a.getFreeCapacity) === 'function') {
            return ((_b = this.creep.store.getFreeCapacity()) !== null && _b !== void 0 ? _b : 0) > 0;
        }
        return _.sum(this.creep.carry) < this.creep.carryCapacity;
    }
    isValidTarget() {
        var _a;
        const target = this.target;
        if (!target) {
            return false;
        }
        const store = target.store;
        if (!store) {
            return false;
        }
        if (typeof store.getUsedCapacity === 'function') {
            return ((_a = store.getUsedCapacity()) !== null && _a !== void 0 ? _a : 0) > 0;
        }
        return _.sum(store) > 0;
    }
    work() {
        const target = this.target;
        const store = target.store;
        if (!store) {
            return -1;
        }
        if (typeof store.getUsedCapacity === 'function') {
            for (const resource of Object.keys(store)) {
                const amount = store.getUsedCapacity(resource);
                if (typeof amount === 'number' && amount > 0) {
                    return this.creep.withdraw(target, resource);
                }
            }
            const total = store.getUsedCapacity();
            if (typeof total === 'number' && total > 0) {
                const resource = Object.keys(store).find(key => { var _a; return ((_a = store.getUsedCapacity(key)) !== null && _a !== void 0 ? _a : 0) > 0; });
                if (resource) {
                    return this.creep.withdraw(target, resource);
                }
            }
        }
        else {
            for (const resourceType in store) {
                const amountInStore = store[resourceType] || 0;
                if (amountInStore > 0) {
                    return this.creep.withdraw(target, resourceType);
                }
            }
        }
        return -1;
    }
}
TaskWithdrawAll.taskName = 'withdrawAll';

// Reinstantiation of a task object from protoTask data
function initializeTask(protoTask) {
    // Retrieve name and target data from the protoTask
    const taskName = protoTask.name;
    const target = deref(protoTask._target.ref);
    let task;
    // Create a task object of the correct type
    switch (taskName) {
        case TaskAttack.taskName:
            task = target ? new TaskAttack(target) : new TaskInvalid(target);
            break;
        case TaskBuild.taskName:
            task = target ? new TaskBuild(target) : new TaskInvalid(target);
            break;
        case TaskClaim.taskName:
            task = target ? new TaskClaim(target) : new TaskInvalid(target);
            break;
        case TaskDismantle.taskName:
            task = target ? new TaskDismantle(target) : new TaskInvalid(target);
            break;
        case TaskDrop.taskName:
            task = new TaskDrop(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskFortify.taskName:
            task = target ? new TaskFortify(target) : new TaskInvalid(target);
            break;
        case TaskGetBoosted.taskName:
            task = target ? new TaskGetBoosted(target, protoTask.data.resourceType) : new TaskInvalid(target);
            break;
        case TaskGetRenewed.taskName:
            task = target ? new TaskGetRenewed(target) : new TaskInvalid(target);
            break;
        case TaskGoTo.taskName:
            task = new TaskGoTo(derefRoomPosition(protoTask._target._pos));
            break;
        case TaskGoToRoom.taskName:
            task = new TaskGoToRoom(protoTask._target._pos.roomName);
            break;
        case TaskHarvest.taskName:
            task = target ? new TaskHarvest(target) : new TaskInvalid(target);
            break;
        case TaskHeal.taskName:
            task = target ? new TaskHeal(target) : new TaskInvalid(target);
            break;
        case TaskMeleeAttack.taskName:
            task = target ? new TaskMeleeAttack(target) : new TaskInvalid(target);
            break;
        case TaskPickup.taskName:
            task = target ? new TaskPickup(target) : new TaskInvalid(target);
            break;
        case TaskRangedAttack.taskName:
            task = target ? new TaskRangedAttack(target) : new TaskInvalid(target);
            break;
        case TaskRepair.taskName:
            task = target ? new TaskRepair(target) : new TaskInvalid(target);
            break;
        case TaskReserve.taskName:
            task = target ? new TaskReserve(target) : new TaskInvalid(target);
            break;
        case TaskSignController.taskName:
            task = target ? new TaskSignController(target) : new TaskInvalid(target);
            break;
        case TaskTransfer.taskName:
            task = target ? new TaskTransfer(target) : new TaskInvalid(target);
            break;
        case TaskTransferAll.taskName:
            task = target ? new TaskTransferAll(target) : new TaskInvalid(target);
            break;
        case TaskUpgrade.taskName:
            task = target ? new TaskUpgrade(target) : new TaskInvalid(target);
            break;
        case TaskWithdraw.taskName:
            task = target ? new TaskWithdraw(target) : new TaskInvalid(target);
            break;
        case TaskWithdrawAll.taskName:
            task = target ? new TaskWithdrawAll(target) : new TaskInvalid(target);
            break;
        default:
            console.log(`Invalid task name: ${taskName}! task.creep: ${protoTask._creep.name}. Deleting from memory!`);
            task = new TaskInvalid(target);
            break;
    }
    // Set the task proto to what is in memory
    task.proto = protoTask;
    // Return it
    return task;
}

const isRuntimeProto$1 = (value) => {
    return value !== undefined && value !== null && typeof value === 'object' && '_creep' in value && '_target' in value;
};

// Caches targets every tick to allow for RoomObject.targetedBy property
class TargetCache {
    constructor() {
        this.targets = {};
        this.tick = Game.time; // record last refresh
    }
    // Generates a hash table for targets: key: TargetRef, val: targeting creep names
    cacheTargets() {
        this.targets = {};
        for (const i in Game.creeps) {
            const creep = Game.creeps[i];
            const memory = creep.memory;
            let task = null;
            const stored = memory.task;
            if (stored && isRuntimeProto$1(stored)) {
                task = stored;
            }
            // Perform a faster, primitive form of _.map(creep.task.manifest, task => task.target.ref)
            while (task) {
                if (!this.targets[task._target.ref]) {
                    this.targets[task._target.ref] = [];
                }
                this.targets[task._target.ref].push(creep.name);
                task = task._parent;
            }
        }
    }
    // Assert that there is an up-to-date target cache
    static assert() {
        if (!(Game.TargetCache && Game.TargetCache.tick === Game.time)) {
            Game.TargetCache = new TargetCache();
            Game.TargetCache.build();
        }
    }
    // Build the target cache
    build() {
        this.cacheTargets();
    }
}

// This binds a getter/setter creep.task property
Object.defineProperty(Creep.prototype, 'task', {
    get() {
        if (!this._task) {
            const memory = this.memory;
            const stored = memory.task;
            if (stored && isRuntimeProto$1(stored)) {
                this._task = initializeTask(stored);
            }
            else {
                this._task = null;
            }
        }
        return this._task || null;
    },
    set(task) {
        // Assert that there is an up-to-date target cache
        TargetCache.assert();
        const memory = this.memory;
        const previous = memory.task;
        if (previous && isRuntimeProto$1(previous)) {
            const oldRef = previous._target.ref;
            if (Game.TargetCache.targets[oldRef]) {
                _.remove(Game.TargetCache.targets[oldRef], name => name === this.name);
            }
        }
        if (task) {
            memory.task = task.proto;
            const target = task.target;
            if (target && target.ref !== undefined) {
                const targetRef = target.ref;
                if (!Game.TargetCache.targets[targetRef]) {
                    Game.TargetCache.targets[targetRef] = [];
                }
                Game.TargetCache.targets[targetRef].push(this.name);
            }
            task.creep = this;
            this._task = task;
        }
        else {
            delete memory.task;
            this._task = null;
        }
    },
});
Creep.prototype.run = function () {
    const task = this.task;
    if (task) {
        return task.run();
    }
};
Object.defineProperties(Creep.prototype, {
    'hasValidTask': {
        get() {
            const task = this.task;
            return !!(task && typeof task.isValid === 'function' && task.isValid());
        }
    },
    'isIdle': {
        get() {
            return !this.hasValidTask;
        }
    }
});
// RoomObject prototypes ===============================================================================================
Object.defineProperty(RoomObject.prototype, 'ref', {
    get: function () {
        return this.id || this.name || '';
    },
});
Object.defineProperty(RoomObject.prototype, 'targetedBy', {
    get: function () {
        // Check that target cache has been initialized - you can move this to execute once per tick if you want
        TargetCache.assert();
        return _.map(Game.TargetCache.targets[this.ref], name => Game.creeps[name]);
    },
});
// RoomPosition prototypes =============================================================================================
Object.defineProperty(RoomPosition.prototype, 'isEdge', {
    get: function () {
        return this.x === 0 || this.x === 49 || this.y === 0 || this.y === 49;
    },
});
Object.defineProperty(RoomPosition.prototype, 'neighbors', {
    get: function () {
        const adjPos = [];
        for (const dx of [-1, 0, 1]) {
            for (const dy of [-1, 0, 1]) {
                if (!(dx === 0 && dy === 0)) {
                    const x = this.x + dx;
                    const y = this.y + dy;
                    if (0 < x && x < 49 && 0 < y && y < 49) {
                        adjPos.push(new RoomPosition(x, y, this.roomName));
                    }
                }
            }
        }
        return adjPos;
    }
});
RoomPosition.prototype.isPassible = function (ignoreCreeps = false) {
    // Is terrain passable?
    if (Game.map.getTerrainAt(this) === 'wall')
        return false;
    if (this.isVisible) {
        // Are there creeps?
        if (ignoreCreeps === false && this.lookFor(LOOK_CREEPS).length > 0)
            return false;
        // Are there structures?
        const impassibleStructures = _.filter(this.lookFor(LOOK_STRUCTURES), function (s) {
            return s.structureType !== STRUCTURE_ROAD &&
                s.structureType !== STRUCTURE_CONTAINER &&
                !(s.structureType === STRUCTURE_RAMPART && (s.my ||
                    s.isPublic));
        });
        return impassibleStructures.length === 0;
    }
    return true;
};
RoomPosition.prototype.availableNeighbors = function (ignoreCreeps = false) {
    return _.filter(this.neighbors, (pos) => pos.isPassible(ignoreCreeps));
};

const isRoomObject = (value) => {
    return typeof value === "object" && value !== null && "pos" in value;
};
const MOVE_OPTS = { reusePath: 5, visualizePathStyle: { stroke: "#ffaa00" } };
const registry = new Map();
const isRuntimeProto = (value) => {
    return value !== null && typeof value === "object" && "_creep" in value && "_target" in value;
};
const getTargetById = (id) => {
    var _a;
    if (typeof Game === "undefined" || !id) {
        return null;
    }
    return (_a = Game.getObjectById(id)) !== null && _a !== void 0 ? _a : null;
};
const clearTask = (creep) => {
    delete creep.memory.task;
    creep._task = null;
};
class BaseTask {
    constructor(proto) {
        this.proto = proto;
        this.creep = null;
    }
    get name() {
        return this.proto.name;
    }
    assign(creep) {
        this.creep = creep;
        this.creep._task = this;
    }
    run() {
        if (!this.creep) {
            return ERR_BUSY;
        }
        const target = this.resolveTarget();
        if (!target) {
            this.onTargetMissing();
            return ERR_INVALID_TARGET;
        }
        if (!this.ensureInRange(target)) {
            return this.creep.moveTo(target, MOVE_OPTS);
        }
        const result = this.perform(target);
        this.afterRun(result, target);
        return result;
    }
    isValid() {
        if (!this.creep) {
            return false;
        }
        const target = this.resolveTarget();
        if (!target) {
            this.onTargetMissing();
            return false;
        }
        return true;
    }
    get range() {
        var _a;
        return (_a = this.proto.range) !== null && _a !== void 0 ? _a : 1;
    }
    ensureInRange(target) {
        if (!this.creep) {
            return false;
        }
        if (target instanceof RoomPosition) {
            return target.isEqualTo(this.creep.pos);
        }
        return this.creep.pos.inRangeTo(target, this.range);
    }
    onTargetMissing() {
        if (this.creep) {
            clearTask(this.creep);
        }
    }
    complete() {
        if (this.creep) {
            clearTask(this.creep);
        }
    }
    afterRun(_result, _target) { }
}
class HarvestTask extends BaseTask {
    constructor(targetOrProto) {
        super(isRoomObject(targetOrProto)
            ? { name: HarvestTask.taskName, targetId: targetOrProto.id, range: 1 }
            : targetOrProto);
    }
    resolveTarget() {
        return getTargetById(this.proto.targetId);
    }
    perform(target) {
        if (!this.creep) {
            return ERR_BUSY;
        }
        if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            this.complete();
            return OK;
        }
        return this.creep.harvest(target);
    }
    afterRun(result, target) {
        if (!this.creep) {
            return;
        }
        if (result === OK) {
            if (this.creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || target.energy === 0) {
                this.complete();
            }
            return;
        }
        if (result === ERR_NOT_ENOUGH_RESOURCES ||
            result === ERR_INVALID_TARGET ||
            result === ERR_NO_BODYPART ||
            result === ERR_TIRED) {
            this.complete();
        }
    }
}
HarvestTask.taskName = "harvest";
class TransferTask extends BaseTask {
    constructor(targetOrProto, resourceType = RESOURCE_ENERGY, amount) {
        super(isRoomObject(targetOrProto)
            ? {
                name: TransferTask.taskName,
                targetId: targetOrProto.id,
                range: 1,
                resourceType,
                amount
            }
            : targetOrProto);
    }
    resolveTarget() {
        const target = getTargetById(this.proto.targetId);
        if (!target) {
            return null;
        }
        if (target.structureType === STRUCTURE_SPAWN) {
            return target;
        }
        if (target.structureType === STRUCTURE_EXTENSION) {
            return target;
        }
        return null;
    }
    perform(target) {
        var _a;
        if (!this.creep) {
            return ERR_BUSY;
        }
        const resourceType = (_a = this.proto.resourceType) !== null && _a !== void 0 ? _a : RESOURCE_ENERGY;
        if (this.creep.store.getUsedCapacity(resourceType) === 0) {
            this.complete();
            return ERR_NOT_ENOUGH_ENERGY;
        }
        return this.creep.transfer(target, resourceType, this.proto.amount);
    }
    afterRun(result, target) {
        if (!this.creep) {
            return;
        }
        if (result === OK || result === ERR_FULL || result === ERR_INVALID_TARGET || result === ERR_NOT_ENOUGH_ENERGY) {
            this.complete();
            return;
        }
        if (target instanceof StructureSpawn || target instanceof StructureExtension) {
            const store = target.store;
            if (store && store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                this.complete();
            }
        }
    }
}
TransferTask.taskName = "transfer";
class UpgradeTask extends BaseTask {
    constructor(targetOrProto) {
        super(isRoomObject(targetOrProto)
            ? { name: UpgradeTask.taskName, targetId: targetOrProto.id, range: 3 }
            : targetOrProto);
    }
    resolveTarget() {
        return getTargetById(this.proto.targetId);
    }
    perform(target) {
        if (!this.creep) {
            return ERR_BUSY;
        }
        if (this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            this.complete();
            return ERR_NOT_ENOUGH_ENERGY;
        }
        return this.creep.upgradeController(target);
    }
    afterRun(result, _target) {
        if (!this.creep) {
            return;
        }
        if (result === OK && this.creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            this.complete();
            return;
        }
        if (result === ERR_NOT_ENOUGH_ENERGY || result === ERR_INVALID_TARGET || result === ERR_NO_BODYPART) {
            this.complete();
        }
    }
}
UpgradeTask.taskName = "upgrade";
registry.set(HarvestTask.taskName, proto => new HarvestTask(proto));
registry.set(TransferTask.taskName, proto => new TransferTask(proto));
registry.set(UpgradeTask.taskName, proto => new UpgradeTask(proto));
const instantiateTask = (creep, proto) => {
    const factory = registry.get(proto.name);
    if (!factory) {
        return null;
    }
    const task = factory(proto);
    task.assign(creep);
    return task;
};
const installPrototypes = () => {
    if (typeof Creep === "undefined") {
        return;
    }
    const creepProto = Creep.prototype;
    if (!Object.getOwnPropertyDescriptor(creepProto, "task")) {
        Object.defineProperty(creepProto, "task", {
            get() {
                if (this._task) {
                    return this._task;
                }
                const stored = this.memory.task;
                if (!stored) {
                    return null;
                }
                if (isRuntimeProto(stored)) {
                    const runtimeTask = initializeTask(stored);
                    runtimeTask.creep = this;
                    this._task = runtimeTask;
                    return runtimeTask;
                }
                const task = instantiateTask(this, stored);
                if (!task) {
                    delete this.memory.task;
                    return null;
                }
                return task;
            },
            set(task) {
                if (!task) {
                    clearTask(this);
                    return;
                }
                if (typeof task.assign === "function") {
                    task.assign(this);
                }
                else if (task.creep !== this) {
                    task.creep = this;
                }
                this.memory.task = task.proto;
                this._task = task;
            }
        });
    }
    if (typeof creepProto.runTask !== "function") {
        creepProto.runTask = function runTask() {
            const task = this.task;
            if (!task) {
                return ERR_INVALID_TARGET;
            }
            const result = task.run();
            return typeof result === "number" ? result : OK;
        };
    }
};
installPrototypes();
class TasksFacade {
    chain(tasks = []) {
        return tasks.length > 0 ? tasks[0] : null;
    }
    harvest(target) {
        return new HarvestTask(target);
    }
    transfer(target, resourceType = RESOURCE_ENERGY, amount) {
        return new TransferTask(target, resourceType, amount);
    }
    upgrade(target) {
        return new UpgradeTask(target);
    }
}
const Tasks = new TasksFacade();

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
/**
 * Clear per-tick heap collections to prevent stale order or telemetry data from
 * leaking across ticks. Call once at tick start.
 */
const resetHeapForTick = () => {
    Heap.orders = new Map();
    Heap.snap = { rooms: new Map(), squads: new Map() };
    Heap.debug = { roomScans: {}, creepCpuSamples: [] };
};
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
        min: 2,
        max: 2,
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

/**
 * Worker squad coordinator. Translates mayor-issued directives and room state into
 * concrete creep-tasks, while tracking workforce metrics and maintaining population.
 *
 * The emphasis is on keeping creeps themselves logic-free (they simply run assigned
 * tasks) while this module manages lifecycle, task reuse, and instrumentation.
 */
/**
 * Produce a stable signature for a task, keyed by name and target reference. Used to
 * detect churn and maintain traceability back to directives.
 */
const signatureForTask = (task) => {
    var _a, _b, _c, _d;
    if (!task) {
        return "IDLE";
    }
    const taskWithTarget = task;
    const liveTarget = (_a = taskWithTarget.target) !== null && _a !== void 0 ? _a : null;
    let ref = "";
    if (liveTarget) {
        if ("id" in liveTarget && typeof liveTarget.id === "string") {
            ref = liveTarget.id;
        }
        else if (typeof RoomPosition !== "undefined" && liveTarget instanceof RoomPosition) {
            ref = `${(_b = liveTarget.roomName) !== null && _b !== void 0 ? _b : ""}:${liveTarget.x}:${liveTarget.y}`;
        }
    }
    if (!ref) {
        const proto = task.proto;
        ref = (_c = proto.targetId) !== null && _c !== void 0 ? _c : "";
        if (!ref) {
            const runtimeTarget = Reflect.get(proto, "_target");
            ref = (_d = runtimeTarget === null || runtimeTarget === void 0 ? void 0 : runtimeTarget.ref) !== null && _d !== void 0 ? _d : "";
            const storedPos = runtimeTarget
                ? Reflect.get(runtimeTarget, "_pos")
                : undefined;
            if (!ref && storedPos) {
                ref = `${storedPos.roomName}:${storedPos.x}:${storedPos.y}`;
            }
        }
    }
    return `${task.name.toUpperCase()}:${ref}`;
};
/**
 * Ensure Heap bookkeeping maps exist before mutation; keeps the hot path null-safe
 * when running outside of the Screeps VM (tests, scripts).
 */
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
/** Lightweight CPU helper so we can sample per-creep assignment cost. */
const cpuNow = () => (typeof Game !== "undefined" && Game.cpu ? Game.cpu.getUsed() : 0);
/**
 * Detect whether a spawn/extension can accept energy, supporting both Store API and
 * older energy/energyCapacity fields to keep tests simple.
 */
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
/**
 * Locate the highest-priority refill structure (spawn first, then extensions).
 */
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
/** Pick a harvest source, biasing toward those with current energy. */
const pickHarvestTarget = (snapshot) => {
    const active = snapshot.sources.find(source => source.energy > 0);
    return active !== null && active !== void 0 ? active : snapshot.sources[0];
};
/**
 * Core assignment routine: examine creep state, choose or reuse a task, and stamp
 * telemetry used elsewhere for churn / traceability.
 */
const assignTask = (creep, room, snapshot, _workerCount) => {
    var _a, _b;
    ensureHeapMaps();
    const used = creep.store.getUsedCapacity(RESOURCE_ENERGY);
    const free = creep.store.getFreeCapacity(RESOURCE_ENERGY);
    const isEmpty = used === 0;
    const isFull = free === 0;
    const controller = room.controller;
    const refillTarget = findRefillTarget(snapshot);
    const harvestTarget = pickHarvestTarget(snapshot);
    const controllerId = controller === null || controller === void 0 ? void 0 : controller.id;
    let task = null;
    let signature = "IDLE";
    const memory = creep.memory;
    const previousSignature = (_a = memory.taskSignature) !== null && _a !== void 0 ? _a : "";
    // Reuse the in-flight task when possible to avoid task churn and associated memory writes.
    const currentTask = creep.task;
    if (currentTask && typeof currentTask.isValid === "function" && currentTask.isValid()) {
        task = currentTask;
    }
    else {
        if (!isEmpty) {
            if (refillTarget) {
                task = Tasks.transfer(refillTarget, RESOURCE_ENERGY);
            }
            else if (controllerId) {
                task = Tasks.upgrade(controller);
            }
            else if (!isFull && harvestTarget) {
                task = Tasks.harvest(harvestTarget);
            }
        }
        else if (!isFull && harvestTarget) {
            task = Tasks.harvest(harvestTarget);
        }
        else if (controllerId) {
            task = Tasks.upgrade(controller);
        }
    }
    if (task) {
        signature = signatureForTask(task);
    }
    const changed = signature !== previousSignature;
    if (changed || memory.taskSignature === undefined) {
        memory.taskSignature = signature;
    }
    if ((memory.role === undefined || memory.role === "") && signature !== "IDLE") {
        memory.role = "worker";
    }
    if ((memory.squad === undefined || memory.squad === "") && signature !== "IDLE") {
        memory.squad = "worker";
    }
    if (Heap.orders) {
        const taskName = (_b = task === null || task === void 0 ? void 0 : task.name) !== null && _b !== void 0 ? _b : "idle";
        Heap.orders.set(creep.name, {
            id: `${creep.name}:${taskName}`,
            task: taskName,
            signature,
            persisted: !changed,
            assignedTick: Game.time
        });
    }
    return { changed, idle: signature === "IDLE", signature, task };
};
/**
 * Apply a task selection to the creep while minimizing unnecessary writes to
 * Creep.task, which in turn keeps Traveler cache churn low.
 */
const applyTaskAssignment = (creep, assignment) => {
    if (assignment.task) {
        if (assignment.changed || !creep.task) {
            creep.task = assignment.task;
        }
        return;
    }
    if (creep.task) {
        creep.task = null;
    }
};
/**
 * Persist squad metrics to Heap so downstream analytics (chronicle lines, dashboards)
 * have access to recent history without touching game objects.
 */
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
/**
 * Ensure the worker count stays within configured bounds by issuing spawn orders.
 */
const maintainPopulation = (context) => {
    var _a;
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
    const result = idleSpawn.spawnCreep(body, name, {
        memory: {
            role: "worker",
            squad: "worker"
        }
    });
    if (result !== OK && result !== ERR_BUSY) {
        const energyStatus = `${snapshot.energyAvailable}/${snapshot.energyCapacityAvailable}`;
        console.log(`[worker] spawn ${(_a = idleSpawn.name) !== null && _a !== void 0 ? _a : idleSpawn.id} failed to create ${name}: ${result}`, {
            energyStatus
        });
    }
};
/**
 * High-level coordinator orchestrating the worker squad for the tick. Handles
 * population upkeep, task assignment, task execution, and metrics in a single pass.
 */
class WorkerSquad {
    run(context) {
        maintainPopulation(context);
        const workerCreeps = context.snapshot.myCreeps.filter(creep => { var _a; return ((_a = creep.memory.role) !== null && _a !== void 0 ? _a : "") === "worker"; });
        let ordersIssued = 0;
        let ordersChanged = 0;
        let idleCount = 0;
        for (const creep of workerCreeps) {
            const before = cpuNow();
            const assignment = assignTask(creep, context.room, context.snapshot, workerCreeps.length);
            const after = cpuNow();
            const delta = after - before;
            ensureHeapMaps();
            if (!Heap.debug) {
                Heap.debug = {};
            }
            if (!Heap.debug.creepCpuSamples) {
                Heap.debug.creepCpuSamples = [];
            }
            Heap.debug.creepCpuSamples.push(delta);
            if (Heap.debug.creepCpuSamples.length > 250) {
                Heap.debug.creepCpuSamples.splice(0, Heap.debug.creepCpuSamples.length - 250);
            }
            ordersIssued += 1;
            if (assignment.changed) {
                ordersChanged += 1;
            }
            if (assignment.idle) {
                idleCount += 1;
                applyTaskAssignment(creep, assignment);
                continue;
            }
            // Execute the assigned task; creeps themselves do not branch on behaviors.
            applyTaskAssignment(creep, assignment);
            if (typeof creep.runTask === "function") {
                creep.runTask();
            }
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
    memory.alerts = memory.alerts.slice(-ALERT_LIMIT);
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
    resetHeapForTick();
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
    const scanCount = ((_a = Heap.debug.roomScans[room.name]) !== null && _a !== void 0 ? _a : 0) + 1;
    Heap.debug.roomScans[room.name] = scanCount;
    if (scanCount !== 1) {
        console.log(`[Diagnostics ${room.name}] multiple room scans in single tick count=${scanCount}`);
    }
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
const appendLog = (room, tag, body) => {
    const memory = room.memory;
    if (!memory.engine) {
        memory.engine = { enabled: false };
    }
    if (!memory.engine.logBuffer) {
        memory.engine.logBuffer = [];
    }
    const line = `[${tag} ${room.name}] ${body}`;
    const signature = `${tag}:${body}`;
    if (memory.engine.lastLogSignature === signature) {
        return;
    }
    memory.engine.lastLogSignature = signature;
    memory.engine.logBuffer.push(line);
    if (memory.engine.logBuffer.length > 12) {
        memory.engine.logBuffer.splice(0, memory.engine.logBuffer.length - 12);
    }
};
const flushLogs = (room) => {
    const memory = room.memory;
    const engine = memory.engine;
    if (!engine || !engine.logBuffer || engine.logBuffer.length === 0) {
        return;
    }
    for (const line of engine.logBuffer) {
        console.log(line);
    }
    engine.logBuffer = [];
    engine.lastLogSignature = undefined;
};
const logSense = (room, snapshot) => {
    const metrics = [
        `energy=${snapshot.energyAvailable}/${snapshot.energyCapacityAvailable}`,
        `workers=${snapshot.myCreeps.length}`,
        `hostiles=${snapshot.hostiles.length}`
    ].join(" ");
    appendLog(room, "Survey", metrics);
};
const logSynthesize = (room, policy) => {
    const summary = [
        `upgrade=${policy.upgrade}`,
        `threat=${policy.threatLevel}`,
        `nav.move=${policy.nav.moveRatioHint}`
    ].join(" ");
    appendLog(room, "Council", `policy: ${summary}`);
};
const logDecide = (room, directives) => {
    appendLog(room, "Mayor", `directives: refill=${directives.refill.slaTicks} upgrade=${directives.upgrade.mode}`);
};
const logAct = (room, report) => {
    const details = [
        `workers=${report.workers}/${report.targetMax}`,
        `queued=${report.queued}`,
        `ordersIssued=${report.ordersIssued}`,
        `ordersChanged=${report.ordersChanged}`,
        `idlePct=${report.idlePct.toFixed(2)}`
    ].join(" ");
    appendLog(room, "Foreman", details);
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
    appendLog(room, "Chronicler", chronicle);
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
        const engineMemory = room.memory.engine;
        if (!engineMemory || engineMemory.enabled !== true) {
            const shouldLog = !(engineMemory === null || engineMemory === void 0 ? void 0 : engineMemory.lastStatusLogTick) || Game.time - engineMemory.lastStatusLogTick >= 25;
            if (shouldLog) {
                if (engineMemory) {
                    engineMemory.lastStatusLogTick = Game.time;
                }
                else {
                    room.memory.engine = {
                        enabled: false,
                        lastStatusLogTick: Game.time
                    };
                }
                console.log(`[Engine ${room.name}] idle. Use Engine.start('${room.name}') to begin operations.`);
            }
            continue;
        }
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
        if (Game.time % 25 === 0) {
            flushLogs(room);
        }
    }
};

const getRoom = (roomName) => {
    if (typeof Game === "undefined") {
        return undefined;
    }
    if (roomName && Game.rooms[roomName]) {
        return Game.rooms[roomName];
    }
    const ownedSpawn = Object.values(Game.spawns)[0];
    if (ownedSpawn) {
        return ownedSpawn.room;
    }
    const firstRoom = Object.values(Game.rooms)[0];
    return firstRoom;
};
const ensureEngineMemory = (room) => {
    const memory = room.memory;
    if (!memory.engine) {
        memory.engine = { enabled: false };
    }
    return memory.engine;
};
const startEngine = (room) => {
    const engine = ensureEngineMemory(room);
    engine.enabled = true;
    engine.startedTick = Game.time;
    engine.lastStartCommandTick = Game.time;
    return `[Engine ${room.name}] start acknowledged at tick ${Game.time}`;
};
const stopEngine = (room) => {
    const engine = ensureEngineMemory(room);
    engine.enabled = false;
    engine.lastStopCommandTick = Game.time;
    return `[Engine ${room.name}] stop acknowledged at tick ${Game.time}`;
};
const statusEngine = (room) => {
    const engine = ensureEngineMemory(room);
    const state = {
        enabled: engine.enabled,
        startedTick: engine.startedTick,
        lastStartCommandTick: engine.lastStartCommandTick,
        lastStopCommandTick: engine.lastStopCommandTick
    };
    return `[Engine ${room.name}] status ${JSON.stringify(state)}`;
};
const registerEngineConsole = () => {
    const globalScope = global;
    globalScope.Engine = {
        start(roomName) {
            if (typeof Game === "undefined") {
                return "[Engine] start unavailable outside Screeps runtime";
            }
            const room = getRoom(roomName);
            if (!room) {
                return "[Engine] start failed: no owned rooms";
            }
            return startEngine(room);
        },
        stop(roomName) {
            if (typeof Game === "undefined") {
                return "[Engine] stop unavailable outside Screeps runtime";
            }
            const room = getRoom(roomName);
            if (!room) {
                return "[Engine] stop failed: no owned rooms";
            }
            return stopEngine(room);
        },
        status(roomName) {
            if (typeof Game === "undefined") {
                return "[Engine] status unavailable outside Screeps runtime";
            }
            const room = getRoom(roomName);
            if (!room) {
                return "[Engine] status failed: no owned rooms";
            }
            return statusEngine(room);
        }
    };
};

const bootstrapVendors = () => {
    global.Traveler = Traveler;
    global.Tasks = Tasks;
};
bootstrapVendors();
registerEngineConsole();
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
const getGitHash = () => {
    var _a;
    try {
        return (_a = Reflect.get(global, "__GIT_HASH__")) !== null && _a !== void 0 ? _a : "development";
    }
    catch (_error) {
        return "development";
    }
};
global.__GIT_HASH__ = "15c28b4";
const loop = () => {
    cleanupCreepMemory();
    runTick();
    if (typeof Game !== "undefined" && Game.time % 150 === 0) {
        const gitHash = getGitHash();
        console.log(`Loop tick=${Game.time} hash=${gitHash}`);
    }
};

exports.loop = loop;
//# sourceMappingURL=main.js.map
