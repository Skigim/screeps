import '../types';
import type { TaskMemory } from '../../index';

export const isRuntimeProto = (value: TaskMemory | protoTask | null | undefined): value is protoTask => {
    return value !== undefined && value !== null && typeof value === 'object' && '_creep' in value && '_target' in value;
};
