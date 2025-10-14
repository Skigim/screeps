import { derivePolicy } from "./core/policy";
import { buildRoomState, type RoomSenseSnapshot } from "./core/state";
import { Heap, ensureRoomFrame } from "./core/heap";
import type {
  Directives,
  HealthAlert,
  Policy,
  RoomEngineMemory,
  RoomMetricsMemory,
  RoomState
} from "./types/contracts";
import { WorkerSquad, type WorkerSquadReport } from "./squads/worker";
import { runTickMonitors, type TickContext } from "./health/check";
import { runRoomAudit } from "./health/audit";
import { runRoomAssertions } from "./health/assert";

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

  const frame = ensureRoomFrame(room.name);
  frame.snapshot = snapshot;

  if (!Heap.debug) {
    Heap.debug = {};
  }
  if (!Heap.debug.roomScans) {
    Heap.debug.roomScans = {};
  }
  Heap.debug.roomScans[room.name] = (Heap.debug.roomScans[room.name] ?? 0) + 1;

  return snapshot;
};

const writeCompactState = (room: Room, state: RoomState): void => {
  const compact = {
    bank: state.energy.bank,
    hostiles: state.hostiles.count,
    roads: Number(state.infra.roadsPct.toFixed(2)),
    links: state.flags.linksOnline ? 1 : 0
  };
  (room.memory as RoomMemory & { state?: typeof compact }).state = compact;
};

const synthesize = (room: Room, snapshot: RoomSenseSnapshot): { state: RoomState; policy: Policy } => {
  const state = buildRoomState(room, snapshot);
  const policy = derivePolicy(room, state);
  writeCompactState(room, state);

  const frame = ensureRoomFrame(room.name);
  frame.state = state;
  frame.policy = policy;

  return { state, policy };
};

const decide = (room: Room, policy: Policy): Directives => {
  const directives: Directives = {
    refill: { slaTicks: 300 },
    upgrade: { mode: policy.upgrade }
  };

  const frame = ensureRoomFrame(room.name);
  frame.directives = directives;

  return directives;
};

const appendLog = (room: Room, tag: string, body: string): void => {
  const memory = room.memory as RoomMemory & { engine?: RoomEngineMemory };
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

const flushLogs = (room: Room): void => {
  const memory = room.memory as RoomMemory & { engine?: RoomEngineMemory };
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

const logSense = (room: Room, snapshot: RoomSenseSnapshot): void => {
  const metrics = [
    `energy=${snapshot.energyAvailable}/${snapshot.energyCapacityAvailable}`,
    `workers=${snapshot.myCreeps.length}`,
    `hostiles=${snapshot.hostiles.length}`
  ].join(" ");
  appendLog(room, "Survey", metrics);
};

const logSynthesize = (room: Room, policy: Policy): void => {
  const summary = [
    `upgrade=${policy.upgrade}`,
    `threat=${policy.threatLevel}`,
    `nav.move=${policy.nav.moveRatioHint}`
  ].join(" ");
  appendLog(room, "Council", `policy: ${summary}`);
};

const logDecide = (room: Room, directives: Directives): void => {
  appendLog(room, "Mayor", `directives: refill=${directives.refill.slaTicks} upgrade=${directives.upgrade.mode}`);
};

const logAct = (room: Room, report: WorkerSquadReport): void => {
  const details = [
    `workers=${report.workers}/${report.targetMax}`,
    `queued=${report.queued}`,
    `ordersIssued=${report.ordersIssued}`,
    `ordersChanged=${report.ordersChanged}`,
    `idlePct=${report.idlePct.toFixed(2)}`
  ].join(" ");
  appendLog(room, "Foreman", details);
};

const logChronicler = (room: Room, context: TickContext, report: WorkerSquadReport): void => {
  const memory = room.memory as RoomMemory & { metrics?: RoomMetricsMemory; alerts?: HealthAlert[] };
  const metrics = memory.metrics ?? {};
  const alerts = memory.alerts ?? [];
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

const act = (room: Room, context: TickContext): WorkerSquadReport => {
  const workerSquad = new WorkerSquad();
  return workerSquad.run({
    room,
    policy: context.policy,
    directives: context.directives,
    state: context.state,
    snapshot: context.snapshot
  });
};

export const runTick = (): void => {
  if (typeof Game === "undefined") {
    return;
  }

  initializeTick();

  const rooms = Object.values(Game.rooms);
  for (const room of rooms) {
    const engineMemory = (room.memory as RoomMemory & { engine?: RoomEngineMemory }).engine;
    if (!engineMemory || engineMemory.enabled !== true) {
      const shouldLog = !engineMemory?.lastStatusLogTick || Game.time - engineMemory.lastStatusLogTick >= 25;
      if (shouldLog) {
        if (engineMemory) {
          engineMemory.lastStatusLogTick = Game.time;
        } else {
          (room.memory as RoomMemory & { engine?: RoomEngineMemory }).engine = {
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

    const tickContext: TickContext = {
      state,
      policy,
      directives,
      snapshot
    };

    const report = act(room, tickContext);
    logAct(room, report);
    runTickMonitors(room, tickContext);

    if (Game.time % 50 === 0) {
      runRoomAudit(room, tickContext);
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
