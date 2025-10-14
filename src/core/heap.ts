import type { SquadMetrics } from '../types/contracts';

interface HeapSnap {
  rooms: Map<string, unknown>;
  squads: Map<string, SquadMetrics[]>;
}

type HeapDebug = {
  roomScans?: Record<string, number>;
  creepCpuSamples?: number[];
};

interface HeapGlobals extends NodeJS.Global {
  orders?: Map<string, unknown>;
  snap?: HeapSnap;
  debug?: HeapDebug;
}

export const Heap = (global as unknown as HeapGlobals);

if (!Heap.orders) {
  Heap.orders = new Map();
}

if (!Heap.snap) {
  Heap.snap = { rooms: new Map(), squads: new Map() };
}

if (!Heap.debug) {
  Heap.debug = {};
}
