const https = require('https');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync('screeps.json', 'utf8'));
const serverConfig = config.main;

// Read the built code
const code = fs.readFileSync('dist/main.js', 'utf8');

// Prepare the upload payload
const payload = JSON.stringify({
  branch: serverConfig.branch || 'main',
  modules: {
    main: code
  }
});

// Prepare request options
const options = {
  hostname: serverConfig.hostname,
  port: serverConfig.port || 443,
  path: '/api/user/code',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'X-Token': serverConfig.token
  }
};

console.log('🚀 Deploying Project Imperium to Screeps...');
console.log(`📦 Code size: ${code.length} bytes`);
console.log(`🎯 Target: ${serverConfig.hostname}`);
console.log(`🌿 Branch: ${serverConfig.branch || 'main'}\n`);

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(responseData);
      
      if (response.ok === 1 || res.statusCode === 200) {
        console.log('✅ DEPLOYMENT SUCCESSFUL!');
        console.log('🏛️  Project Imperium is now live on Screeps!');
        console.log('\n📊 Next steps:');
        console.log('   1. Open https://screeps.com');
        console.log('   2. Navigate to your colony');
        console.log('   3. Monitor the console for first tick');
        console.log('   4. Watch your creeps spawn and execute tasks!');
        console.log('\n⚔️  Ave Imperator! The legion marches!\n');
      } else {
        console.error('❌ Deployment failed:', response);
        if (response.error) {
          console.error('Error:', response.error);
        }
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error parsing response:', e.message);
      console.error('Raw response:', responseData);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.write(payload);
req.end();
