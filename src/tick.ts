import { derivePolicy } from './core/policy';
import { buildRoomState, type RoomSenseSnapshot } from './core/state';
import { Heap } from './core/heap';
import type { Directives, Policy, RoomState } from './types/contracts';
import { WorkerSquad } from './squads/worker';
import { runTickMonitors, type TickContext } from './health/check';
import { runRoomAudit } from './health/audit';
import { runRoomAssertions } from './health/assert';

const initializeTick = (): void => {
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

const sense = (room: Room): RoomSenseSnapshot => {
  const snapshot: RoomSenseSnapshot = {
    tick: Game.time,
    structures: room.find(FIND_STRUCTURES),
    hostiles: room.find(FIND_HOSTILE_CREEPS),
    myCreeps: room.find(FIND_MY_CREEPS),
    sources: room.find(FIND_SOURCES),
    energyAvailable: room.energyAvailable,
    energyCapacityAvailable: room.energyCapacityAvailable
  };

  if (!Heap.snap) {
    Heap.snap = { rooms: new Map(), squads: new Map() };
  }
  Heap.snap.rooms.set(room.name, snapshot);

  if (!Heap.debug) {
    Heap.debug = {};
  }
  if (!Heap.debug.roomScans) {
    Heap.debug.roomScans = {};
  }
  Heap.debug.roomScans[room.name] = (Heap.debug.roomScans[room.name] ?? 0) + 1;

  return snapshot;
};

const synthesize = (room: Room, snapshot: RoomSenseSnapshot): { state: RoomState; policy: Policy } => {
  const state = buildRoomState(room, snapshot);
  const policy = derivePolicy(room, state);
  return { state, policy };
};

const decide = (_room: Room, policy: Policy): Directives => {
  return {
    refill: { slaTicks: 200 },
    upgrade: { mode: policy.upgrade }
  };
};

const act = (room: Room, context: TickContext): void => {
  const workerSquad = new WorkerSquad();
  workerSquad.run({
    room,
    policy: context.policy,
    directives: context.directives,
    state: context.state,
    snapshot: context.snapshot
  });
};

export const runTick = (): void => {
  if (typeof Game === 'undefined') {
    return;
  }

  initializeTick();

  const rooms = Object.values(Game.rooms);
  for (const room of rooms) {
    const snapshot = sense(room);
    const { state, policy } = synthesize(room, snapshot);
    const directives = decide(room, policy);

    const tickContext: TickContext = {
      state,
      policy,
      directives,
      snapshot
    };

    act(room, tickContext);
    runTickMonitors(room, tickContext);

    if (Game.time % 50 === 0) {
      runRoomAudit(room, tickContext);
    }

    if (Game.time % 500 === 0) {
      runRoomAssertions(room, tickContext);
    }
  }
};
