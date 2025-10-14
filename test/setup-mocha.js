/* eslint-disable */
// inject mocha globally to allow custom interface refer without direct import - bypass bundle issue
const lodash = require("lodash");
const mochaLib = require("mocha");
const chaiLib = require("chai");
const sinonLib = require("sinon");
const sinonChai = require("sinon-chai");

global._ = lodash;
global.mocha = mochaLib;
global.chai = chaiLib;
global.sinon = sinonLib;
global.chai.use(sinonChai);

// Provide Screeps globals required by vendor libraries during test bootstrap
const bodyPartConstants = {
	ATTACK: "attack",
	MOVE: "move",
	WORK: "work",
	CARRY: "carry",
	TOUGH: "tough",
	HEAL: "heal",
	RANGED_ATTACK: "ranged_attack",
	CLAIM: "claim"
};

Object.entries(bodyPartConstants).forEach(([key, value]) => {
	if (!(key in global)) {
		global[key] = value;
	}
});

if (!global.BODYPART_COST) {
	global.BODYPART_COST = {
		attack: 80,
		move: 50,
		work: 100,
		carry: 50,
		tough: 10,
		heal: 250,
		ranged_attack: 150,
		claim: 600
	};
}

if (!global.RESOURCE_ENERGY) {
	global.RESOURCE_ENERGY = "energy";
}

if (!global.Game) {
	global.Game = {
		creeps: {},
		rooms: {},
		spawns: {},
		time: 0,
		cpu: {
			getUsed: () => 0
		},
		getObjectById: () => null,
		TargetCache: {
			targets: {},
			tick: 0,
			build: () => {}
		}
	};
}

if (!global.Memory) {
	global.Memory = {
		creeps: {}
	};
}

if (!global.Creep) {
	global.Creep = function Creep() {};
}

if (!global.Creep.prototype) {
	global.Creep.prototype = {};
}

if (!global.RoomObject) {
	global.RoomObject = function RoomObject() {};
}

if (!global.RoomObject.prototype) {
	global.RoomObject.prototype = {};
}

if (!global.RoomPosition) {
	const RoomPosition = function RoomPosition(x = 0, y = 0, roomName = "W0N0") {
		this.x = x;
		this.y = y;
		this.roomName = roomName;
	};

	RoomPosition.prototype = {
		isEqualTo(position) {
			return position && this.x === position.x && this.y === position.y && this.roomName === position.roomName;
		},
		inRangeTo(position, range = 1) {
			return position ? Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y)) <= range : false;
		},
		getRangeTo(position) {
			return position ? Math.max(Math.abs(this.x - position.x), Math.abs(this.y - position.y)) : Infinity;
		},
		lookFor() {
			return [];
		}
	};

	global.RoomPosition = RoomPosition;
}

// Override ts-node compiler options
process.env.TS_NODE_PROJECT = "tsconfig.test.json";
