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

import { initializeTask } from './utilities/initializer';
import { deref, derefRoomPosition } from './utilities/helpers';

export type targetType = {
    ref: string;
    pos: RoomPosition;
};

/* An abstract class for encapsulating creep actions. This generalizes the concept of "do action X to thing Y until
 * condition Z is met" and saves a lot of convoluted and duplicated code in creep logic. A Task object contains
 * the necessary logic for traveling to a target, performing a task, and realizing when a task is no longer sensible
 * to continue.*/
export abstract class Task implements ITask {
    public static taskName: string;
    public name: string;
    public _creep: {
        name: string;
    };
    public _target: {
        ref: string;
        _pos: protoPos;
    };
    public _parent: protoTask | null;
    public tick: number;
    public settings: TaskSettings;
    public options: TaskOptions;
    public data: TaskData;

    constructor(taskName: string, target: targetType | null, options: TaskOptions = {}) {
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
        } else {
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

    get proto(): protoTask {
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

    set proto(protoTask: protoTask) {
        // Don't write to this.name; used in task switcher
        this._creep = protoTask._creep;
        this._target = protoTask._target;
        this._parent = protoTask._parent;
        this.options = protoTask.options;
        this.data = protoTask.data;
        this.tick = protoTask.tick;
    }

    // Getter/setter for task.creep
    get creep(): Creep {
        return Game.creeps[this._creep.name];
    }

    set creep(creep: Creep) {
        this._creep.name = creep.name;
    }

    // Dereferences the target
    get target(): RoomObject | null {
        return deref(this._target.ref);
    }

    // Dereferences the saved target position; useful for situations where you might lose vision
    get targetPos(): RoomPosition {
        // refresh if you have visibility of the target
        if (this.target) {
            this._target._pos = this.target.pos;
        }
        return derefRoomPosition(this._target._pos);
    }

    // Getter/setter for task parent
    get parent(): Task | null {
        return (this._parent ? initializeTask(this._parent) : null);
    }

    set parent(parentTask: Task | null) {
        this._parent = parentTask ? parentTask.proto : null;
        // If the task is already assigned to a creep, update their memory
        if (this.creep) {
            this.creep.task = this;
        }
    }

    // Return a list of [this, this.parent, this.parent.parent, ...] as tasks
    get manifest(): Task[] {
        const manifest: Task[] = [this];
        let parent = this.parent;
        while (parent) {
            manifest.push(parent);
            parent = parent.parent;
        }
        return manifest;
    }

    // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
    get targetManifest(): (RoomObject | null)[] {
        const targetRefs = [this._target.ref];
        let parent = this._parent;
        while (parent) {
            targetRefs.push(parent._target.ref);
            parent = parent._parent;
        }
        return _.map(targetRefs, ref => deref(ref));
    }

    // Return a list of [this.target, this.parent.target, ...] without fully instantiating the list of tasks
    get targetPosManifest(): RoomPosition[] {
        const targetPositions = [this._target._pos];
        let parent = this._parent;
        while (parent) {
            targetPositions.push(parent._target._pos);
            parent = parent._parent;
        }
        return _.map(targetPositions, protoPos => derefRoomPosition(protoPos));
    }

    // Fork the task, assigning a new task to the creep with this task as its parent
    fork(newTask: Task): Task {
        newTask.parent = this;
        if (this.creep) {
            this.creep.task = newTask;
        }
        return newTask;
    }

    abstract isValidTask(): boolean;

    abstract isValidTarget(): boolean;

    isValid(): boolean {
        let validTask = false;
        if (this.creep) {
            validTask = this.isValidTask();
        }
        let validTarget = false;
        if (this.target) {
            validTarget = this.isValidTarget();
        } else if (this.options.blind && !Game.rooms[this.targetPos.roomName]) {
            // If you can't see the target's room but you have blind enabled, then that's okay
            validTarget = true;
        }
        // Return if the task is valid; if not, finalize/delete the task and return false
        if (validTask && validTarget) {
            return true;
        } else {
            // Switch to parent task if there is one
            this.finish();
            return this.parent ? this.parent.isValid() : false;
        }
    }

    moveToTarget(range = this.settings.targetRange): number {
        if (this.options.moveOptions && !this.options.moveOptions.range) {
            this.options.moveOptions.range = range;
        }
        return this.creep.moveTo(this.targetPos, this.options.moveOptions);
        // return this.creep.travelTo(this.targetPos, this.options.moveOptions); // <- switch if you use Traveler
    }

    /* Moves to the next position on the agenda if specified - call this in some tasks after work() is completed */
    moveToNextPos(): number | undefined {
        if (this.options.nextPos) {
            const nextPos = derefRoomPosition(this.options.nextPos);
            return this.creep.moveTo(nextPos);
            // return this.creep.travelTo(nextPos); // <- switch if you use Traveler
        }
    }

    // Return expected number of ticks until creep arrives at its first destination; this requires Traveler to work!
    get eta(): number | undefined {
        if (this.creep && (this.creep.memory as any)._trav) {
            return (this.creep.memory as any)._trav.path.length;
        }
    }

    // Execute this task each tick. Returns nothing unless work is done.
    run(): number | undefined {
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
        } else {
            this.moveToTarget();
        }
    }

    /* Bundled form of Zerg.park(); adapted from BonzAI codebase*/
    protected parkCreep(creep: Creep, pos: RoomPosition = creep.pos, maintainDistance = false): number {
        const road = _.find(creep.pos.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_ROAD);
        if (!road) return OK;

        let positions = _.sortBy(creep.pos.availableNeighbors(), (p: RoomPosition) => p.getRangeTo(pos));
        if (maintainDistance) {
            const currentRange = creep.pos.getRangeTo(pos);
            positions = _.filter(positions, (p: RoomPosition) => p.getRangeTo(pos) <= currentRange);
        }

        let swampPosition: RoomPosition | undefined;
        for (const position of positions) {
            if (_.find(position.lookFor(LOOK_STRUCTURES), s => s.structureType === STRUCTURE_ROAD)) continue;
            const terrain = position.lookFor(LOOK_TERRAIN)[0];
            if (terrain === 'swamp') {
                swampPosition = position;
            } else {
                return creep.move(creep.pos.getDirectionTo(position));
            }
        }
        if (swampPosition) {
            return creep.move(creep.pos.getDirectionTo(swampPosition));
        }
        return creep.moveTo(pos);
        // return creep.travelTo(pos); // <-- Switch if you use Traveler
    }

    abstract work(): number;

    // Finalize the task and switch to parent task (or null if there is none)
    finish(): void {
        this.moveToNextPos();
        if (this.creep) {
            this.creep.task = this.parent;
        } else {
            console.log(`No creep executing ${this.name}!`);
        }
    }
}
