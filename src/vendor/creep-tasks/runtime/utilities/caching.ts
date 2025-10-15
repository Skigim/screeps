// Caches targets every tick to allow for RoomObject.targetedBy property

import './types';
import type { TaskMemory } from '../../index';
import { isRuntimeProto } from './typeGuards';

export class TargetCache {
    public targets: { [ref: string]: string[] } = {};
    public tick: number;

    constructor() {
        this.tick = Game.time; // record last refresh
    }

    // Generates a hash table for targets: key: TargetRef, val: targeting creep names
    private cacheTargets(): void {
        this.targets = {};
        for (const i in Game.creeps) {
            const creep = Game.creeps[i];
            const memory = creep.memory as CreepMemory & { task?: TaskMemory | protoTask };
            let task: protoTask | null = null;
            const stored = memory.task;
            if (stored && isRuntimeProto(stored)) {
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
    public static assert(): void {
        if (!(Game.TargetCache && Game.TargetCache.tick === Game.time)) {
            Game.TargetCache = new TargetCache();
            Game.TargetCache.build();
        }
    }

    // Build the target cache
    public build(): void {
        this.cacheTargets();
    }
}
