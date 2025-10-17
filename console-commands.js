// Quick Console Commands for Screeps Debugging

// === CHECK CREEP MEMORY ===
// Usage: Replace 'worker_74134731' with your creep name
const c = Game.creeps['worker_74134731'];
console.log('Memory:', JSON.stringify(c.memory, null, 2));
console.log('Energy:', c.store[RESOURCE_ENERGY], '/', c.store.getCapacity(RESOURCE_ENERGY));
console.log('Body:', c.body.map(p => p.type).join(','));

// === CHECK ROOM TASKS ===
const room = Game.rooms['W44N42']; // Replace with your room name
const tasks = room.memory.tasks || [];
console.log(`Tasks (${tasks.length}):`);
tasks.forEach(t => console.log(`[${t.priority}] ${t.type} - ${t.assignedCreeps.length}/${t.creepsNeeded} - ${t.id}`));

// === CHECK ALL CREEP ASSIGNMENTS ===
Object.values(Game.creeps).forEach(c => {
  console.log(`${c.name}: task=${c.memory.task}, energy=${c.store[RESOURCE_ENERGY]}/${c.store.getCapacity(RESOURCE_ENERGY)}`);
});

// === CHECK DROPPED RESOURCES ===
const dropped = room.find(FIND_DROPPED_RESOURCES);
console.log(`Dropped resources: ${dropped.length}`);
dropped.forEach(r => console.log(`  ${r.resourceType}: ${r.amount} at ${r.pos}`));

// === FORCE REASSIGN A CREEP ===
// Usage: This clears the creep's task so it gets reassigned next tick
const creepToReassign = Game.creeps['worker_74134731'];
creepToReassign.memory.task = undefined;
creepToReassign.memory.targetId = undefined;
console.log(`✅ Cleared task for ${creepToReassign.name} - will reassign next tick`);

// === CHECK TASK ASSIGNMENT LOGIC ===
// Simulate what Legion Commander sees for a specific creep
const creep = Game.creeps['worker_74134731'];
const roomTasks = Game.rooms[creep.room.name].memory.tasks || [];
const workParts = creep.body.filter(p => p.type === WORK).length;
const carryParts = creep.body.filter(p => p.type === CARRY).length;
const isSpecializedHarvester = workParts > carryParts;
const hasEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
const hasSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;

console.log(`${creep.name} - WORK:${workParts} CARRY:${carryParts} Specialized:${isSpecializedHarvester} Energy:${hasEnergy} Space:${hasSpace}`);
console.log('Qualified tasks:');
roomTasks.filter(t => {
  if (t.assignedCreeps.length >= t.creepsNeeded) return false;
  if (t.type === 'PICKUP_ENERGY' && isSpecializedHarvester) return false;
  if (['REFILL_SPAWN', 'HAUL_ENERGY'].includes(t.type) && !hasEnergy) return false;
  if (['HARVEST_ENERGY', 'PICKUP_ENERGY'].includes(t.type) && !hasSpace) return false;
  if (['UPGRADE_CONTROLLER', 'BUILD', 'REPAIR'].includes(t.type) && !hasEnergy) return false;
  return true;
}).sort((a, b) => b.priority - a.priority).forEach(t => {
  console.log(`  [${t.priority}] ${t.type} - ${t.assignedCreeps.length}/${t.creepsNeeded}`);
});
