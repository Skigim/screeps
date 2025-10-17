/**
 * All possible task types in the Empire
 * These represent the fundamental actions a creep can be assigned
 */
export enum TaskType {
  // Energy Management
  HARVEST_ENERGY = 'HARVEST_ENERGY',
  HAUL_ENERGY = 'HAUL_ENERGY',
  WITHDRAW_ENERGY = 'WITHDRAW_ENERGY',
  
  // Construction & Repair
  BUILD = 'BUILD',
  REPAIR = 'REPAIR',
  
  // Controller Operations
  UPGRADE_CONTROLLER = 'UPGRADE_CONTROLLER',
  
  // Defense
  DEFEND_ROOM = 'DEFEND_ROOM',
  TOWER_DEFENSE = 'TOWER_DEFENSE',
  
  // Logistics
  REFILL_SPAWN = 'REFILL_SPAWN',
  REFILL_EXTENSION = 'REFILL_EXTENSION',
  REFILL_TOWER = 'REFILL_TOWER',
  
  // Special Operations
  CLAIM_CONTROLLER = 'CLAIM_CONTROLLER',
  RESERVE_CONTROLLER = 'RESERVE_CONTROLLER',
  SCOUT_ROOM = 'SCOUT_ROOM',
  
  // Idle/Default
  IDLE = 'IDLE'
}
