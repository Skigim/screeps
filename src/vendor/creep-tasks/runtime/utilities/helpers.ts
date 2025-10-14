// Universal reference properties

export function deref(ref: string): RoomObject | null {
    return Game.getObjectById(ref as Id<any>) || Game.flags[ref] || Game.creeps[ref] || Game.spawns[ref] || null;
}

export function derefRoomPosition(protoPos: protoPos): RoomPosition {
    return new RoomPosition(protoPos.x, protoPos.y, protoPos.roomName);
}

export interface EnergyStructure extends Structure {
    energy: number;
    energyCapacity: number;
}

export interface StoreStructure extends Structure {
    store: StoreDefinition;
    storeCapacity: number;
}

export function isEnergyStructure(structure: Structure): structure is EnergyStructure {
    return (structure as any).energy !== undefined && (structure as any).energyCapacity !== undefined;
}

export function isStoreStructure(structure: Structure): structure is StoreStructure {
    return (structure as any).store !== undefined;
}
