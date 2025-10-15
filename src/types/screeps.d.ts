import type { HealthAlert, Policy, RoomEngineMemory, RoomMetricsMemory, RoomTestsMemory } from "./contracts";
import type { TaskInstance, TaskMemory } from "../vendor/creep-tasks";
import type { Task } from "../vendor/creep-tasks/runtime/Task";

declare global {
  interface CreepMemory {
    _trav?: unknown;
    _travel?: unknown;
    role?: string;
    squad?: string;
    orderId?: string;
    task?: TaskMemory | protoTask;
    taskSignature?: string;
  }

  interface Creep {
    travelTo(destination: RoomPosition | { pos: RoomPosition }, options?: any): number;
    task: TaskInstance | Task | ITask | null;
    runTask(): ScreepsReturnCode;
  }

  interface RoomMemory {
    avoid?: number;
    policy?: Policy;
    metrics?: RoomMetricsMemory;
    alerts?: HealthAlert[];
    tests?: RoomTestsMemory;
    engine?: RoomEngineMemory;
    flags?: {
      linksOnline?: boolean;
      roadsPlanned?: boolean;
    };
  }

  interface Memory {
    architectPlans?: Record<string, number>;
  }
}

export {};
