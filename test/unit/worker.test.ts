import { assert } from "chai";
import { workerInternals } from "../../src/squads/worker";
import { RCL1Config } from "../../src/config/rcl1";
import { Heap } from "../../src/core/heap";
import Tasks from "../../src/vendor/creep-tasks";
import type { RoomSenseSnapshot } from "../../src/core/state";

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe("worker assignTask", () => {
  const originalHarvest = Tasks.harvest;
  const originalUpgrade = Tasks.upgrade;
  const originalTransfer = Tasks.transfer;

  before(() => {
    (global as { OK?: number }).OK = typeof OK === "number" ? OK : 0;
    (global as { RESOURCE_ENERGY?: ResourceConstant }).RESOURCE_ENERGY =
      typeof RESOURCE_ENERGY === "string" ? RESOURCE_ENERGY : ("energy" as ResourceConstant);
  });

  beforeEach(() => {
    Heap.orders = undefined;
    Heap.snap = undefined;
    Heap.debug = undefined;

    (Tasks as Mutable<typeof Tasks>).harvest = (() => ({
      name: "harvest",
      proto: { name: "harvest" },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK
    })) as typeof Tasks.harvest;

    (Tasks as Mutable<typeof Tasks>).upgrade = (() => ({
      name: "upgrade",
      proto: { name: "upgrade" },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK
    })) as typeof Tasks.upgrade;

    (Tasks as Mutable<typeof Tasks>).transfer = (() => ({
      name: "transfer",
      proto: { name: "transfer" },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK
    })) as typeof Tasks.transfer;
  });

  afterEach(() => {
    (Tasks as Mutable<typeof Tasks>).harvest = originalHarvest;
    (Tasks as Mutable<typeof Tasks>).upgrade = originalUpgrade;
    (Tasks as Mutable<typeof Tasks>).transfer = originalTransfer;
  });

  const makeCreep = (used: number, capacity: number): Creep => {
    const memory = {} as CreepMemory & { taskSignature?: string };
    return {
      name: `test-${used}-${capacity}`,
      memory,
      store: {
        getUsedCapacity: () => used,
        getFreeCapacity: () => capacity - used
      } as Store<ResourceConstant, false>,
      task: null,
      runTask: () => OK
    } as unknown as Creep;
  };

  const makeSnapshot = (): RoomSenseSnapshot => ({
    tick: 0,
    structures: [],
    hostiles: [],
    myCreeps: [],
    sources: [
      {
        id: "source-1",
        energy: 300
      } as unknown as Source
    ],
    energyAvailable: 0,
    energyCapacityAvailable: 0
  });

  const room = {
    controller: {
      id: "controller-1"
    }
  } as Room;

  it("continues harvesting until carry is full", () => {
    const creep = makeCreep(25, 50);
    const snapshot = makeSnapshot();

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task?.name, "harvest");
    assert.strictEqual(creep.memory.taskSignature, "HARVEST:source-1");
  });

  it("upgrades when carry is full", () => {
    const creep = makeCreep(50, 50);
    const snapshot = makeSnapshot();

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task?.name, "upgrade");
    assert.strictEqual(creep.memory.taskSignature, "UPGRADE:controller-1");
  });
});
