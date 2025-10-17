/// <reference types="screeps" />

import { TaskType } from './TaskType';

/**
 * A Task represents a job that needs to be done
 * Created by the Legatus Officio (Taskmaster)
 * Consumed by the Legatus Genetor (Broodmother) and eventually assigned to creeps
 */
export interface Task {
  /** Unique identifier for this task */
  id: string;
  
  /** The type of work to be performed */
  type: TaskType;
  
  /** Priority (higher = more urgent). Range: 1-100 */
  priority: number;
  
  /** Target game object ID (e.g., source, construction site, controller) */
  targetId?: Id<any>;
  
  /** Target position (for movement tasks) */
  targetPos?: { x: number; y: number; roomName: string };
  
  /** Estimated number of creeps needed for this task */
  creepsNeeded: number;
  
  /** Currently assigned creep names */
  assignedCreeps: string[];
  
  /** Additional metadata for the task */
  metadata?: {
    energyRequired?: number;
    structureType?: StructureConstant;
    [key: string]: any;
  };
}
