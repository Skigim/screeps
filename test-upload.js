const https = require('https');
const fs = require('fs');
const path = require('path');

const config = require('./screeps.json').main;
const code = fs.readFileSync(path.join(__dirname, 'dist', 'main.js'), 'utf8');

const data = JSON.stringify({
  branch: config.branch,
  modules: {
    main: code
  }
});

const options = {
  hostname: config.hostname,
  port: config.port,
  path: '/api/user/code',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'X-Token': config.token
  }
};

console.log('Uploading to Screeps...');
console.log(`Server: ${config.protocol}://${config.hostname}:${config.port}`);
console.log(`Branch: ${config.branch}`);

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Response:', responseData);
    if (res.statusCode === 200) {
      console.log('✅ Upload successful!');
    } else {
      console.log('❌ Upload failed!');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(data);
req.end();
