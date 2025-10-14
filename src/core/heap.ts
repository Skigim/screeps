import type { Directives, Policy, RoomState, SquadMetrics } from "../types/contracts";
import type { RoomSenseSnapshot } from "./state";

export type RoomHeapFrame = {
  snapshot?: RoomSenseSnapshot;
  state?: RoomState;
  policy?: Policy;
  directives?: Directives;
};

export type RoomRuntimeFrame = {
  upgradeSuccess: number[];
  spawnStarved: number[];
  cpuMedians: number[];
  workerCounts: number[];
  refillDurations: number[];
  refillActiveSince?: number;
};

interface HeapSnap {
  rooms: Map<string, RoomHeapFrame>;
  squads: Map<string, SquadMetrics[]>;
}

interface HeapRuntime {
  rooms: Map<string, RoomRuntimeFrame>;
}

type HeapDebug = {
  roomScans?: Record<string, number>;
  creepCpuSamples?: number[];
};

interface HeapGlobals extends NodeJS.Global {
  orders?: Map<string, unknown>;
  snap?: HeapSnap;
  runtime?: HeapRuntime;
  debug?: HeapDebug;
}

export const Heap = global as unknown as HeapGlobals;

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

export const ensureRoomFrame = (roomName: string): RoomHeapFrame => {
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

export const getRoomRuntimeFrame = (roomName: string): RoomRuntimeFrame => {
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
