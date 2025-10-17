/// <reference types="screeps" />

import { Task } from './Task';

/**
 * A request to spawn a new creep
 * Created by Legatus Genetor (The Broodmother)
 * Used to design and spawn creeps optimized for specific tasks
 */
export interface CreepRequest {
  /** Priority (higher = spawn sooner) */
  priority: number;
  
  /** Body parts for the creep */
  body: BodyPartConstant[];
  
  /** Memory to initialize the creep with */
  memory: CreepMemory;
  
  /** The task this creep will immediately begin */
  initialTask: Task;
  
  /** Estimated energy cost */
  cost: number;
  
  /** Role/type identifier */
  role: string;
}

/**
 * Extension of Screeps CreepMemory interface
 * Define what we store in each creep's memory
 */
declare global {
  interface CreepMemory {
    role: string;
    room: string;
    task?: string; // Task ID
    working?: boolean;
    targetId?: string;
    [key: string]: any;
  }
}
