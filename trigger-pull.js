const https = require('https');
const config = require('./screeps.json').main;

console.log('Triggering Screeps to pull from GitHub...');
console.log(`Branch: ${config.branch}`);
console.log(`Token: ***${config.token.slice(-4)}`);

const data = JSON.stringify({});

const options = {
  hostname: config.hostname,
  port: config.port,
  path: `/api/user/code?branch=${config.branch}`,
  method: 'GET',
  headers: {
    'X-Token': config.token,
    'X-Username': config.token
  }
};

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(parsed, null, 2));
      if (res.statusCode === 200) {
        console.log('✅ Screeps updated successfully!');
      } else {
        console.log('❌ Failed to trigger update');
      }
    } catch (e) {
      console.log('Response (raw):', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.end();
