/**
 * SPAWN MODULE EXPORTS
 * 
 * Re-exports spawn management functions for easy importing.
 * This keeps the public API clean and organized.
 */

export { manageSpawn, getBody, getSpawnStatus } from './manager';

export {
  registerBody,
  getBodyConfig,
  listBodyConfigs,
  deleteBodyConfig,
  getBodyCost,
  registerDefaultBodies,
  type BodyConfig
} from './bodies';
