// This binds a getter/setter creep.task property

import './types';
import type { TaskMemory } from '../index';
import { initializeTask } from './utilities/initializer';
import { TargetCache } from './utilities/caching';
import { isRuntimeProto } from './utilities/typeGuards';

Object.defineProperty(Creep.prototype, 'task', {
    get(this: Creep & { _task?: ITask | null }): ITask | null {
        if (!this._task) {
            const memory = this.memory as CreepMemory & { task?: TaskMemory | protoTask };
            const stored = memory.task;
            if (stored && isRuntimeProto(stored)) {
                this._task = initializeTask(stored);
            } else {
                this._task = null;
            }
        }
        return this._task || null;
    },
    set(this: Creep & { _task?: ITask | null }, task: ITask | null) {
        // Assert that there is an up-to-date target cache
        TargetCache.assert();
        const memory = this.memory as CreepMemory & { task?: TaskMemory | protoTask };
        const previous = memory.task;
        if (previous && isRuntimeProto(previous)) {
            const oldRef = previous._target.ref;
            if (Game.TargetCache.targets[oldRef]) {
                _.remove(Game.TargetCache.targets[oldRef], name => name === this.name);
            }
        }
        if (task) {
            memory.task = task.proto;
            const target = task.target;
            if (target && (target as RoomObject).ref !== undefined) {
                const targetRef = (target as RoomObject).ref;
                if (!Game.TargetCache.targets[targetRef]) {
                    Game.TargetCache.targets[targetRef] = [];
                }
                Game.TargetCache.targets[targetRef].push(this.name);
            }
            task.creep = this;
            this._task = task;
        } else {
            delete memory.task;
            this._task = null;
        }
    },
});

Creep.prototype.run = function (this: Creep): number | void {
    const task = this.task as ITask | null;
    if (task) {
        return task.run();
    }
};

Object.defineProperties(Creep.prototype, {
    'hasValidTask': {
        get(this: Creep): boolean {
            const task = this.task as ITask | null;
            return !!(task && typeof task.isValid === 'function' && task.isValid());
        }
    },
    'isIdle': {
        get(this: Creep): boolean {
            return !this.hasValidTask;
        }
    }
});

// RoomObject prototypes ===============================================================================================

Object.defineProperty(RoomObject.prototype, 'ref', {
    get: function (this: RoomObject): string {
        return (this as any).id || (this as any).name || '';
    },
});

Object.defineProperty(RoomObject.prototype, 'targetedBy', {
    get: function (this: RoomObject): Creep[] {
        // Check that target cache has been initialized - you can move this to execute once per tick if you want
        TargetCache.assert();
        return _.map(Game.TargetCache.targets[this.ref], name => Game.creeps[name]);
    },
});

// RoomPosition prototypes =============================================================================================

Object.defineProperty(RoomPosition.prototype, 'isEdge', {
    get: function (this: RoomPosition): boolean {
        return this.x === 0 || this.x === 49 || this.y === 0 || this.y === 49;
    },
});

Object.defineProperty(RoomPosition.prototype, 'neighbors', {
    get: function (this: RoomPosition): RoomPosition[] {
        const adjPos: RoomPosition[] = [];
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

RoomPosition.prototype.isPassible = function (this: RoomPosition, ignoreCreeps = false): boolean {
    // Is terrain passable?
    if (Game.map.getTerrainAt(this) === 'wall') return false;
    if ((this as any).isVisible) {
        // Are there creeps?
        if (ignoreCreeps === false && this.lookFor(LOOK_CREEPS).length > 0) return false;
        // Are there structures?
        const impassibleStructures = _.filter(this.lookFor(LOOK_STRUCTURES), function (s: Structure): boolean {
            return s.structureType !== STRUCTURE_ROAD &&
                s.structureType !== STRUCTURE_CONTAINER &&
                !(s.structureType === STRUCTURE_RAMPART && ((s as StructureRampart).my ||
                    (s as StructureRampart).isPublic));
        });
        return impassibleStructures.length === 0;
    }
    return true;
};

RoomPosition.prototype.availableNeighbors = function (this: RoomPosition, ignoreCreeps = false): RoomPosition[] {
    return _.filter((this as any).neighbors, (pos: RoomPosition) => pos.isPassible(ignoreCreeps));
};

export { };
