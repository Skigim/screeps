export type SquadName = "worker" | "miner" | "hauler" | "upgrader" | "builder" | "tower";

export type RoomState = {
  hostiles: { count: number };
  energy: { bank: number };
  infra: { roadsPct: number };
  flags: { linksOnline: boolean };
};

export type Policy = {
  threatLevel: "none" | "poke" | "raid" | "siege";
  upgrade: "conserve" | "steady" | "burn";
  energy: { low: number; high: number };
  cpu: { minBucket: number };
  nav: { moveRatioHint: number };
};

export type Directives = {
  refill: { slaTicks: number };
  upgrade: { mode: Policy["upgrade"] };
};

export type SquadMetrics = {
  tick: number;
  room: string;
  squad: SquadName;
  throughput?: number;
  idlePct?: number;
  slaBreaches?: number;
  ordersIssued?: number;
  ordersChanged?: number;
  headcount?: number;
  queued?: number;
};

export type HealthAlert = { tick: number; type: "WARN" | "FAIL"; msg: string };

export type Order<T = unknown> = {
  id: string;
  type: string;
  payload?: T;
};

export type RoomMetricsMemory = {
  upgradeContinuityPct?: number;
  spawnStarvationTicks?: number;
  lastControllerProgress?: number;
  lastSpawnTick?: number;
  creepCpuMedian?: number;
  cpuP95?: number;
  refillSlaMedian?: number;
  workerCount?: number;
};

export type RoomTestsMemory = {
  pass: number;
  fail: number;
  lastTick?: number;
  recent?: { name: string; pass: boolean; tick: number; details?: string }[];
};

export type RoomEngineMemory = {
  enabled: boolean;
  startedTick?: number;
  lastStartCommandTick?: number;
  lastStopCommandTick?: number;
  lastStatusLogTick?: number;
  logBuffer?: string[];
  lastLogSignature?: string;
};
