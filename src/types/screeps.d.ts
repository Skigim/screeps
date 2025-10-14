import type {
  HealthAlert,
  Policy,
  RoomMetricsMemory,
  RoomTestsMemory
} from './contracts';

declare global {
  interface CreepMemory {
    _trav?: unknown;
    _travel?: unknown;
    role?: string;
    squad?: string;
    orderId?: string;
  }

  interface Creep {
    travelTo(destination: RoomPosition | { pos: RoomPosition }, options?: any): number;
  }

  interface RoomMemory {
    avoid?: number;
    policy?: Policy;
    metrics?: RoomMetricsMemory;
    alerts?: HealthAlert[];
    tests?: RoomTestsMemory;
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
