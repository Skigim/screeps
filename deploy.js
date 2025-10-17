const fs = require('fs');

// Basic deployment script
// In a real setup, this would use screeps API to upload code
console.log('Deployment script placeholder - configure screeps.json for actual deployment');

if (!fs.existsSync('screeps.json')) {
  console.log('⚠️  No screeps.json found. Copy screeps.sample.json to screeps.json and configure your credentials.');
  process.exit(1);
}

console.log('✓ Build complete. Ready for deployment.');
