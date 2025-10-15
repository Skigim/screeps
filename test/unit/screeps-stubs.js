/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

const globalAny = global;

const setConst = (name, value) => {
  if (typeof globalAny[name] === "undefined") {
    Object.defineProperty(globalAny, name, { value, writable: false, configurable: true });
  }
};

const resultCodes = {
  OK: 0,
  ERR_NOT_OWNER: -1,
  ERR_NO_PATH: -2,
  ERR_NAME_EXISTS: -3,
  ERR_BUSY: -4,
  ERR_NOT_FOUND: -5,
  ERR_NOT_ENOUGH_ENERGY: -6,
  ERR_INVALID_TARGET: -7,
  ERR_FULL: -8,
  ERR_NOT_IN_RANGE: -9,
  ERR_INVALID_ARGS: -10,
  ERR_TIRED: -11,
  ERR_NO_BODYPART: -12,
  ERR_NOT_ENOUGH_EXTENSIONS: -6,
  ERR_NOT_ENOUGH_RESOURCES: -6
};
Object.entries(resultCodes).forEach(([key, value]) => setConst(key, value));

const bodyParts = {
  ATTACK: "attack",
  RANGED_ATTACK: "ranged_attack",
  WORK: "work",
  CARRY: "carry",
  HEAL: "heal",
  MOVE: "move",
  TOUGH: "tough",
  CLAIM: "claim"
};
Object.entries(bodyParts).forEach(([key, value]) => setConst(key, value));

const resources = {
  RESOURCE_ENERGY: "energy",
  RESOURCE_POWER: "power",
  RESOURCE_GHODIUM: "ghodium"
};
Object.entries(resources).forEach(([key, value]) => setConst(key, value));

const lookConstants = {
  LOOK_CREEPS: "creeps",
  LOOK_STRUCTURES: "structures",
  LOOK_RESOURCES: "resources",
  LOOK_TERRAIN: "terrain"
};
Object.entries(lookConstants).forEach(([key, value]) => setConst(key, value));

const structureConstants = {
  STRUCTURE_ROAD: "road",
  STRUCTURE_CONTAINER: "container",
  STRUCTURE_RAMPART: "rampart",
  STRUCTURE_WALL: "constructedWall",
  STRUCTURE_LAB: "lab",
  STRUCTURE_NUKER: "nuker",
  STRUCTURE_POWER_SPAWN: "powerSpawn",
  STRUCTURE_SPAWN: "spawn",
  STRUCTURE_EXTENSION: "extension"
};
Object.entries(structureConstants).forEach(([key, value]) => setConst(key, value));

const findConstants = {
  FIND_STRUCTURES: 0,
  FIND_MY_CREEPS: 1,
  FIND_HOSTILE_CREEPS: 2,
  FIND_SOURCES: 3
};
Object.entries(findConstants).forEach(([key, value]) => setConst(key, value));

setConst("CREEP_LIFE_TIME", 1500);
setConst("CREEP_CLAIM_LIFE_TIME", 600);
setConst("LAB_BOOST_MINERAL", 30);
setConst("LAB_BOOST_ENERGY", 20);
setConst("REPAIR_POWER", 100);

if (typeof globalAny.RoomPosition === "undefined") {
  class RoomPosition {
    constructor(x, y, roomName) {
      this.x = x;
      this.y = y;
      this.roomName = roomName;
    }
    isEqualTo(pos) {
      return pos && this.x === pos.x && this.y === pos.y && this.roomName === pos.roomName;
    }
    inRangeTo(target, range = 1) {
      return this.getRangeTo(target) <= range;
    }
    getRangeTo(target) {
      const pos = target instanceof RoomPosition ? target : target.pos;
      if (!pos) {
        return 0;
      }
      const dx = this.x - pos.x;
      const dy = this.y - pos.y;
      return Math.max(Math.abs(dx), Math.abs(dy));
    }
    isNearTo(target) {
      return this.inRangeTo(target, 1);
    }
    getDirectionTo() {
      return 1;
    }
    lookFor() {
      return [];
    }
  }
  globalAny.RoomPosition = RoomPosition;
}

const createStore = () => {
  const data = Object.create(null);
  const base = {
    getFreeCapacity(resource) {
      if (resource && typeof data[resource] === "number") {
        return Math.max(0, Infinity - data[resource]);
      }
      return Infinity;
    },
    getUsedCapacity(resource) {
      if (resource) {
        return data[resource] || 0;
      }
      return Object.values(data).reduce((sum, value) => sum + value, 0);
    },
    getCapacity() {
      return Infinity;
    }
  };

  return new Proxy(base, {
    get(target, key) {
      if (key in target) {
        return target[key];
      }
      if (typeof key === "string") {
        return data[key] || 0;
      }
      return undefined;
    },
    set(target, key, value) {
      if (key in target) {
        target[key] = value;
      } else if (typeof key === "string") {
        data[key] = value;
      }
      return true;
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).concat(Object.keys(data));
    },
    getOwnPropertyDescriptor(target, key) {
      if (key in target) {
        return Object.getOwnPropertyDescriptor(target, key);
      }
      if (typeof key === "string" && key in data) {
        return { configurable: true, enumerable: true, writable: true, value: data[key] };
      }
      return undefined;
    }
  });
};

if (typeof globalAny.RoomObject === "undefined") {
  class RoomObject {
    constructor(pos = new globalAny.RoomPosition(25, 25, "W0N0")) {
      this.pos = pos;
    }
  }
  globalAny.RoomObject = RoomObject;
}

if (typeof globalAny.Structure === "undefined") {
  class Structure extends globalAny.RoomObject {
    constructor(structureType) {
      super();
      this.structureType = structureType;
      this.id = `${structureType}-${Math.random().toString(16).slice(2)}`;
      this.my = true;
      this.store = createStore();
      this.energy = 0;
      this.energyCapacity = Infinity;
    }
  }
  globalAny.Structure = Structure;
}

const ensureStructureSubclass = (name, init) => {
  if (typeof globalAny[name] === "undefined") {
    class CustomStructure extends globalAny.Structure {
      constructor() {
        super(structureConstants[`STRUCTURE_${name.replace("Structure", "").toUpperCase()}`] || name);
        if (typeof init === "function") {
          init(this);
        }
      }
    }
    globalAny[name] = CustomStructure;
  }
};

ensureStructureSubclass("StructureRoad");
ensureStructureSubclass("StructureContainer");
ensureStructureSubclass("StructureRampart", instance => {
  instance.isPublic = false;
});
ensureStructureSubclass("StructureWall");
ensureStructureSubclass("StructureLab", instance => {
  instance.mineralType = null;
  instance.mineralAmount = 0;
  instance.energy = 0;
  instance.boostCreep = () => globalAny.OK;
});
ensureStructureSubclass("StructureNuker", instance => {
  instance.ghodium = 0;
  instance.ghodiumCapacity = Infinity;
});
ensureStructureSubclass("StructurePowerSpawn", instance => {
  instance.power = 0;
  instance.powerCapacity = Infinity;
});
ensureStructureSubclass("StructureSpawn");
ensureStructureSubclass("StructureExtension");
ensureStructureSubclass("StructureController", instance => {
  instance.owner = { username: "tester" };
  instance.reservation = { username: "tester", ticksToEnd: 5000 };
  instance.sign = undefined;
});

if (typeof globalAny.Source === "undefined") {
  class Source extends globalAny.RoomObject {
    constructor() {
      super();
      this.energy = 0;
      this.id = `source-${Math.random().toString(16).slice(2)}`;
    }
  }
  globalAny.Source = Source;
}

if (typeof globalAny.Mineral === "undefined") {
  class Mineral extends globalAny.RoomObject {
    constructor() {
      super();
      this.mineralAmount = 0;
      this.mineralType = resources.RESOURCE_GHODIUM;
    }
  }
  globalAny.Mineral = Mineral;
}

if (typeof globalAny.Resource === "undefined") {
  class Resource extends globalAny.RoomObject {
    constructor(resourceType = resources.RESOURCE_ENERGY, amount = 0) {
      super();
      this.resourceType = resourceType;
      this.amount = amount;
    }
  }
  globalAny.Resource = Resource;
}

if (typeof globalAny.Tombstone === "undefined") {
  class Tombstone extends globalAny.RoomObject {
    constructor() {
      super();
      this.store = createStore();
    }
  }
  globalAny.Tombstone = Tombstone;
}

if (typeof globalAny.Ruin === "undefined") {
  class Ruin extends globalAny.RoomObject {
    constructor() {
      super();
      this.store = createStore();
    }
  }
  globalAny.Ruin = Ruin;
}

if (typeof globalAny.Creep === "undefined") {
  class Creep extends globalAny.RoomObject {
    constructor(name = "creep") {
      super();
      this.name = name;
      this.body = [];
      this.carry = {};
      this.carryCapacity = 0;
      this.store = createStore();
      this.memory = {};
      this.ticksToLive = globalAny.CREEP_LIFE_TIME;
    }
    getActiveBodyparts(type) {
      return this.body.filter(part => part.type === type).length;
    }
    moveTo() {
      return globalAny.OK;
    }
    attack() {
      return globalAny.OK;
    }
    rangedAttack() {
      return globalAny.OK;
    }
    heal() {
      return globalAny.OK;
    }
    rangedHeal() {
      return globalAny.OK;
    }
    dismantle() {
      return globalAny.OK;
    }
    harvest() {
      return globalAny.OK;
    }
    build() {
      return globalAny.OK;
    }
    upgradeController() {
      return globalAny.OK;
    }
    claimController() {
      return globalAny.OK;
    }
    reserveController() {
      return globalAny.OK;
    }
    repair() {
      return globalAny.OK;
    }
    transfer() {
      return globalAny.OK;
    }
    withdraw() {
      return globalAny.OK;
    }
    pickup() {
      return globalAny.OK;
    }
    drop() {
      return globalAny.OK;
    }
    signController() {
      return globalAny.OK;
    }
    travelTo() {
      return globalAny.OK;
    }
  }
  globalAny.Creep = Creep;
}

if (typeof globalAny.Game === "undefined") {
  globalAny.Game = {
    creeps: {},
    rooms: {},
    spawns: {},
    time: 1,
    getObjectById: () => null,
    map: {
      getTerrainAt: () => "plain"
    }
  };
}

if (typeof globalAny.Memory === "undefined") {
  globalAny.Memory = { creeps: {} };
}
