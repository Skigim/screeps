export const RCL1Config = {
  worker: {
    min: 3,
    max: 4,
    bodyPlan: "worker-basic"
  },
  spawn: {
    energyBuffer: 200
  }
};

export type RCL1ConfigType = typeof RCL1Config;
