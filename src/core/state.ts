import type { RoomState } from '../types/contracts';

export type RoomSenseSnapshot = {
  tick: number;
  structures: Structure[];
  hostiles: Creep[];
  myCreeps: Creep[];
  sources: Source[];
  energyAvailable: number;
  energyCapacityAvailable: number;
};

const energyFromStructure = (structure: Structure): number => {
  if ('store' in structure && structure.store) {
    const store = structure.store as Store<ResourceConstant, false> & { [key: string]: number | undefined };
    if (typeof store.getUsedCapacity === 'function') {
      const capacity = store.getUsedCapacity(RESOURCE_ENERGY);
      return typeof capacity === 'number' ? capacity : 0;
    }

    return store[RESOURCE_ENERGY] ?? 0;
  }

  if ('energy' in structure) {
    return (structure as StructureExtension | StructureSpawn).energy ?? 0;
  }

  return 0;
};

const calculateRoadCoverage = (structures: Structure[]): number => {
  const roadCount = structures.filter((structure) => structure.structureType === STRUCTURE_ROAD).length;
  if (roadCount === 0) {
    return 0;
  }

  return Math.min(1, roadCount / 100);
};

export const buildRoomState = (_room: Room, snapshot: RoomSenseSnapshot): RoomState => {
  const energyBank = snapshot.structures.reduce((total, structure) => {
    if (
      structure.structureType === STRUCTURE_SPAWN ||
      structure.structureType === STRUCTURE_EXTENSION ||
      structure.structureType === STRUCTURE_CONTAINER
    ) {
      return total + energyFromStructure(structure);
    }

    return total;
  }, 0);

  const state: RoomState = {
    hostiles: { count: snapshot.hostiles.length },
    energy: { bank: energyBank },
    infra: { roadsPct: calculateRoadCoverage(snapshot.structures) },
    flags: { linksOnline: Boolean(((_room.memory as any)?.flags)?.linksOnline) }
  };

  return state;
};
