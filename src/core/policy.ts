import type { Policy, RoomState } from '../types/contracts';

const MIN_ENERGY_LOW = 200;
const DEFAULT_HIGH_ENERGY = 10000;

export const derivePolicy = (room: Room, state: RoomState): Policy => {
  const nextPolicy: Policy = {
    threatLevel: state.hostiles.count > 0 ? 'poke' : 'none',
    upgrade: state.energy.bank < MIN_ENERGY_LOW ? 'conserve' : 'steady',
    energy: {
      low: MIN_ENERGY_LOW,
      high: Math.max(DEFAULT_HIGH_ENERGY, state.energy.bank)
    },
    cpu: { minBucket: 3000 },
    nav: { moveRatioHint: 0.5 }
  };

  if (!room.memory.policy) {
    room.memory.policy = nextPolicy as any;
  } else {
    room.memory.policy = Object.assign({}, room.memory.policy, nextPolicy) as any;
  }

  return room.memory.policy as Policy;
};
