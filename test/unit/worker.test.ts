import { assert } from "chai";
import { workerInternals } from "../../src/squads/worker";
import type { TaskInstance } from "../../src/vendor/creep-tasks";
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
    if (typeof OK !== "number") {
      Object.defineProperty(global, "OK", { value: 0, writable: false, configurable: true });
    }

    if (typeof RESOURCE_ENERGY !== "string") {
      Object.defineProperty(global, "RESOURCE_ENERGY", {
        value: "energy" as ResourceConstant,
        writable: false,
        configurable: true
      });
    }
  });

  beforeEach(() => {
    Heap.orders = undefined;
    Heap.snap = undefined;
    Heap.debug = undefined;

    (Tasks as Mutable<typeof Tasks>).harvest = ((target: Source) => ({
      name: "harvest",
      target,
      proto: { name: "harvest", targetId: target.id },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK,
      isValid: () => true
    })) as typeof Tasks.harvest;

    (Tasks as Mutable<typeof Tasks>).upgrade = ((controller: StructureController) => ({
      name: "upgrade",
      target: controller,
      proto: { name: "upgrade", targetId: controller.id },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK,
      isValid: () => true
    })) as typeof Tasks.upgrade;

    (Tasks as Mutable<typeof Tasks>).transfer = ((target: Structure) => ({
      name: "transfer",
      target,
      proto: { name: "transfer", targetId: target.id },
      assign: () => {
        /* noop for tests */
      },
      run: () => OK,
      isValid: () => true
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

  it("harvests when empty", () => {
    const creep = makeCreep(0, 50);
    const snapshot = makeSnapshot();

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task?.name, "harvest");
    const memory = creep.memory as CreepMemory & { taskSignature?: string };
    assert.strictEqual(memory.taskSignature, "HARVEST:source-1");
  });

  it("upgrades when carrying energy", () => {
    const creep = makeCreep(25, 50);
    const snapshot = makeSnapshot();

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task?.name, "upgrade");
    const memory = creep.memory as CreepMemory & { taskSignature?: string };
    assert.strictEqual(memory.taskSignature, "UPGRADE:controller-1");
  });

  it("upgrades when carry is full", () => {
    const creep = makeCreep(50, 50);
    const snapshot = makeSnapshot();

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task?.name, "upgrade");
    const memory = creep.memory as CreepMemory & { taskSignature?: string };
    assert.strictEqual(memory.taskSignature, "UPGRADE:controller-1");
  });

  it("retains existing upgrade task until energy is spent", () => {
    const creep = makeCreep(40, 50);
    const snapshot = makeSnapshot();

    const existingTask = {
      name: "upgrade",
      proto: { name: "upgrade", _target: { ref: "controller-1" } },
      target: { ref: "controller-1" },
      isValid: () => true,
      run: () => OK
    } as unknown as TaskInstance;

    let upgradeCalls = 0;
    const upgradeStub = (() => {
      upgradeCalls += 1;
      return {
        name: "upgrade",
        proto: { name: "upgrade" },
        assign: () => {
          /* noop */
        },
        run: () => OK,
        isValid: () => true
      };
    }) as unknown as typeof Tasks.upgrade;

    (Tasks as Mutable<typeof Tasks>).upgrade = upgradeStub;

    (creep.memory as CreepMemory & { taskSignature?: string }).taskSignature = "UPGRADE:controller-1";
    (creep as unknown as { task: TaskInstance | null }).task = existingTask;

    const assignment = workerInternals.assignTask(creep, room, snapshot, RCL1Config.worker.min);

    assert.strictEqual(assignment.task, existingTask);
    assert.isFalse(assignment.changed);
    const memory = creep.memory as CreepMemory & { taskSignature?: string };
    assert.strictEqual(memory.taskSignature, "UPGRADE:controller-1");
    assert.strictEqual(upgradeCalls, 0, "should not create a new upgrade task while current task remains valid");
  });
});
