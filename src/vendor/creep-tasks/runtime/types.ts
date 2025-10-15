export {};

declare global {
    type protoPos = {
        x: number;
        y: number;
        roomName: string;
    };

    interface TaskOptions {
        blind?: boolean;
        moveOptions?: MoveToOpts;
        nextPos?: protoPos;
    }

    interface TaskSettings {
        targetRange: number;
        workOffRoad: boolean;
        oneShot: boolean;
    }

    interface TaskData {
        quiet?: boolean;
        resourceType?: ResourceConstant;
        amount?: number;
        skipEnergy?: boolean;
        [key: string]: unknown;
    }

    interface protoTask {
        name: string;
        _creep: {
            name: string;
        };
        _target: {
            ref: string;
            _pos: protoPos;
        };
        _parent: protoTask | null;
        options: TaskOptions;
        data: TaskData;
        tick: number;
    }

    interface ITask {
        name: string;
        options: TaskOptions;
        data: TaskData;
        settings: TaskSettings;
        proto: protoTask;
        creep: Creep;
        parent: import('./Task').Task | null;
        target: RoomObject | RoomPosition | null;
        targetPos: RoomPosition;
        fork(task: import('./Task').Task): import('./Task').Task;
        isValid(): boolean;
        moveToTarget(range?: number): number;
        moveToNextPos(): number | undefined;
        run(): number | undefined;
        work(): number;
        finish(): void;
    }

    interface Creep {
        readonly hasValidTask: boolean;
        readonly isIdle: boolean;
        run(): number | ScreepsReturnCode | void;
    }

    interface RoomObject {
        readonly ref: string;
        readonly targetedBy: Creep[];
    }

    interface RoomPosition {
        readonly isEdge: boolean;
        readonly neighbors: RoomPosition[];
        availableNeighbors(ignoreCreeps?: boolean): RoomPosition[];
        isPassible(ignoreCreeps?: boolean): boolean;
    }

    interface Game {
        TargetCache: import('./utilities/caching').TargetCache;
    }
}
