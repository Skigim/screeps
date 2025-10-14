import { RCL1Config } from '../config/rcl1';
import { compileBody, estimateSpawnTime } from '../core/bodyFactory';
import type { Policy, RoomTestsMemory } from '../types/contracts';
import type { TickContext } from './check';

const RECENT_LIMIT = 10;

type AugmentedRoomMemory = RoomMemory & {
  tests?: RoomTestsMemory;
  policy?: Policy;
};

const ensureTestsMemory = (memory: AugmentedRoomMemory): RoomTestsMemory => {
  if (!memory.tests) {
    memory.tests = { pass: 0, fail: 0, recent: [] };
  }

  if (!memory.tests.recent) {
    memory.tests.recent = [];
  }

  return memory.tests;
};

const recordAssertion = (memory: AugmentedRoomMemory, name: string, pass: boolean, details?: string): void => {
  const tests = ensureTestsMemory(memory);

  if (pass) {
    tests.pass += 1;
  } else {
    tests.fail += 1;
  }

  tests.lastTick = Game.time;
  tests.recent = tests.recent ?? [];
  tests.recent.push({ name, pass, tick: Game.time, details });

  if (tests.recent.length > RECENT_LIMIT) {
    tests.recent.splice(0, tests.recent.length - RECENT_LIMIT);
  }
};

export const runRoomAssertions = (room: Room, context: TickContext): void => {
  const memory = room.memory as AugmentedRoomMemory;

  recordAssertion(memory, 'policy-energy-low', context.policy.energy.low === 200, `low=${context.policy.energy.low}`);
  recordAssertion(memory, 'policy-nav-hint', context.policy.nav.moveRatioHint === 0.5, `hint=${context.policy.nav.moveRatioHint}`);

  const body = compileBody('worker', RCL1Config.worker.bodyPlan, room.energyCapacityAvailable, context.policy);
  const spawnTime = estimateSpawnTime(body);
  recordAssertion(memory, 'worker-spawn-time', spawnTime <= 300, `spawnTime=${spawnTime}`);
};
