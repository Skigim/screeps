export const RCL1Config = {
  worker: {
    min: 2,
    max: 2,
    bodyPlan: "worker-basic"
  },
  spawn: {
    energyBuffer: 200
  }
};

export type RCL1ConfigType = typeof RCL1Config;
