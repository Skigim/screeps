import type { Policy } from "../types/contracts";

export const compileBody = (
  _plan: string,
  _profile: string,
  _energyCap: number,
  _policy: Policy
): BodyPartConstant[] => {
  return [WORK, CARRY, MOVE];
};

export const estimateSpawnTime = (body: BodyPartConstant[]): number => body.length * 3;

export const calculateBodyCost = (body: BodyPartConstant[]): number =>
  body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
