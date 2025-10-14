import type { RoomEngineMemory } from "../types/contracts";

const getRoom = (roomName?: string): Room | undefined => {
  if (typeof Game === "undefined") {
    return undefined;
  }

  if (roomName && Game.rooms[roomName]) {
    return Game.rooms[roomName];
  }

  const ownedSpawn = Object.values(Game.spawns)[0];
  if (ownedSpawn) {
    return ownedSpawn.room;
  }

  const firstRoom = Object.values(Game.rooms)[0];
  return firstRoom;
};

const ensureEngineMemory = (room: Room): RoomEngineMemory => {
  const memory = room.memory as RoomMemory & { engine?: RoomEngineMemory };
  if (!memory.engine) {
    memory.engine = { enabled: false };
  }

  return memory.engine;
};

const startEngine = (room: Room): string => {
  const engine = ensureEngineMemory(room);
  engine.enabled = true;
  engine.startedTick = Game.time;
  engine.lastStartCommandTick = Game.time;

  return `[Engine ${room.name}] start acknowledged at tick ${Game.time}`;
};

const stopEngine = (room: Room): string => {
  const engine = ensureEngineMemory(room);
  engine.enabled = false;
  engine.lastStopCommandTick = Game.time;

  return `[Engine ${room.name}] stop acknowledged at tick ${Game.time}`;
};

const statusEngine = (room: Room): string => {
  const engine = ensureEngineMemory(room);
  const state = {
    enabled: engine.enabled,
    startedTick: engine.startedTick,
    lastStartCommandTick: engine.lastStartCommandTick,
    lastStopCommandTick: engine.lastStopCommandTick
  };

  return `[Engine ${room.name}] status ${JSON.stringify(state)}`;
};

export const registerEngineConsole = (): void => {
  const globalScope = global as NodeJS.Global & {
    Engine?: {
      start: (roomName?: string) => string;
      stop: (roomName?: string) => string;
      status: (roomName?: string) => string;
    };
  };

  globalScope.Engine = {
    start(roomName?: string): string {
      if (typeof Game === "undefined") {
        return "[Engine] start unavailable outside Screeps runtime";
      }

      const room = getRoom(roomName);
      if (!room) {
        return "[Engine] start failed: no owned rooms";
      }

      return startEngine(room);
    },
    stop(roomName?: string): string {
      if (typeof Game === "undefined") {
        return "[Engine] stop unavailable outside Screeps runtime";
      }

      const room = getRoom(roomName);
      if (!room) {
        return "[Engine] stop failed: no owned rooms";
      }

      return stopEngine(room);
    },
    status(roomName?: string): string {
      if (typeof Game === "undefined") {
        return "[Engine] status unavailable outside Screeps runtime";
      }

      const room = getRoom(roomName);
      if (!room) {
        return "[Engine] status failed: no owned rooms";
      }

      return statusEngine(room);
    }
  };
};
