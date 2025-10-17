// Diagnostic script to check creep memory and available tasks
// Run in Screeps console: copy and paste this code

const creepName = 'worker_74134731';
const creep = Game.creeps[creepName];

if (!creep) {
  console.log(`❌ Creep ${creepName} not found`);
} else {
  console.log(`\n=== CREEP DIAGNOSTICS: ${creepName} ===`);
  
  // Creep memory
  console.log('\n📝 Memory:');
  console.log(JSON.stringify(creep.memory, null, 2));
  
  // Creep body composition
  const workParts = creep.body.filter(p => p.type === WORK).length;
  const carryParts = creep.body.filter(p => p.type === CARRY).length;
  const moveParts = creep.body.filter(p => p.type === MOVE).length;
  const isSpecializedHarvester = workParts > carryParts;
  
  console.log('\n💪 Body Composition:');
  console.log(`  WORK: ${workParts}, CARRY: ${carryParts}, MOVE: ${moveParts}`);
  console.log(`  Specialized Harvester: ${isSpecializedHarvester}`);
  
  // Creep energy state
  const hasEnergy = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
  const hasSpace = creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
  const energyUsed = creep.store.getUsedCapacity(RESOURCE_ENERGY);
  const energyCapacity = creep.store.getCapacity(RESOURCE_ENERGY);
  
  console.log('\n⚡ Energy State:');
  console.log(`  Energy: ${energyUsed}/${energyCapacity}`);
  console.log(`  Has Energy: ${hasEnergy}, Has Space: ${hasSpace}`);
  
  // Room tasks
  const room = creep.room;
  const tasks = room.memory.tasks || [];
  
  console.log(`\n📋 Available Tasks (${tasks.length} total):`);
  tasks.forEach(t => {
    const assigned = t.assignedCreeps.length;
    const needed = t.creepsNeeded;
    const available = needed - assigned;
    console.log(`  [${t.priority}] ${t.type} - ${assigned}/${needed} assigned (${available} slots) - ${t.id}`);
  });
  
  // Check which tasks this creep qualifies for
  console.log('\n✅ Qualified Tasks:');
  tasks.forEach(t => {
    // Skip if fully assigned
    if (t.assignedCreeps.length >= t.creepsNeeded) return;
    if (t.assignedCreeps.includes(creepName)) return;
    
    // Check specialized harvester filter
    if (t.type === 'PICKUP_ENERGY' && isSpecializedHarvester) {
      console.log(`  ❌ ${t.type} (${t.priority}) - Specialized harvester, skipping pickup`);
      return;
    }
    
    // Check energy requirements
    if (['REFILL_SPAWN', 'REFILL_EXTENSION', 'REFILL_TOWER', 'HAUL_ENERGY'].includes(t.type)) {
      if (!hasEnergy) {
        console.log(`  ❌ ${t.type} (${t.priority}) - Needs energy`);
        return;
      }
    }
    
    if (['HARVEST_ENERGY', 'PICKUP_ENERGY', 'WITHDRAW_ENERGY'].includes(t.type)) {
      if (!hasSpace) {
        console.log(`  ❌ ${t.type} (${t.priority}) - Needs space`);
        return;
      }
    }
    
    if (['UPGRADE_CONTROLLER', 'BUILD', 'REPAIR'].includes(t.type)) {
      if (!hasEnergy) {
        console.log(`  ❌ ${t.type} (${t.priority}) - Needs energy`);
        return;
      }
    }
    
    console.log(`  ✅ ${t.type} (${t.priority}) - QUALIFIED - ${t.id}`);
  });
  
  console.log('\n=== END DIAGNOSTICS ===\n');
}
