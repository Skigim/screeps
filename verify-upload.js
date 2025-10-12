const { ScreepsAPI } = require('screeps-api');
const fs = require('fs');
const path = require('path');

const config = require('./screeps.json').main;

console.log('Testing Screeps API connection...');
console.log(`Server: ${config.protocol}://${config.hostname}:${config.port}`);
console.log(`Branch: ${config.branch}`);
console.log(`Token: ***${config.token.slice(-4)}`);

const api = new ScreepsAPI(config);

// Read the compiled code
const code = {};
const distPath = path.join(__dirname, 'dist');
const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js') && !f.endsWith('.map.js'));

files.forEach(file => {
  const moduleName = file.replace(/\.js$/i, '');
  code[moduleName] = fs.readFileSync(path.join(distPath, file), 'utf8');
  console.log(`📦 Module: ${moduleName} (${code[moduleName].length} bytes)`);
});

// Test upload
console.log('\n📤 Uploading code...');

api.code.set(config.branch, code)
  .then((result) => {
    console.log('✅ Upload successful!');
    console.log('Response:', result);
  })
  .catch((error) => {
    console.log('❌ Upload failed!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  });
