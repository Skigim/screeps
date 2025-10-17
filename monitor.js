const fs = require('fs');
const path = require('path');

const CAMPAIGN_STATUS_FILE = path.join(__dirname, 'CAMPAIGN_STATUS.md');
const POLL_INTERVAL = 30000; // 30 seconds
const CHECK_STRINGS = [
  'Agent Secundus: Phase II COMPLETE',
  'AGENT SECUNDUS DISPATCH',
  'Agent Secundus.*Phase II'
];

let pollCount = 0;
let lastContent = '';

function readCampaignStatus() {
  try {
    return fs.readFileSync(CAMPAIGN_STATUS_FILE, 'utf8');
  } catch (error) {
    console.error('❌ Failed to read CAMPAIGN_STATUS.md:', error.message);
    return '';
  }
}

function checkForCompletion(content) {
  // Check for explicit Phase II completion signal
  if (content.includes('Agent Secundus: Phase II COMPLETE')) {
    return 'EXPLICIT_PHASE_II_COMPLETE';
  }
  
  // Check for any dispatch indicating progress
  if (content.includes('AGENT SECUNDUS DISPATCH')) {
    const match = content.match(/Phase:\s*([^\n]+)/);
    if (match) {
      const phase = match[1].trim();
      if (phase.includes('II') && content.includes('Status: COMPLETE')) {
        return 'DISPATCH_PHASE_II_COMPLETE';
      }
    }
  }
  
  return null;
}

function formatTime() {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function poll() {
  pollCount++;
  const timestamp = formatTime();
  const content = readCampaignStatus();
  
  if (content !== lastContent) {
    lastContent = content;
    console.log(`\n📋 [${timestamp}] CAMPAIGN_STATUS.md updated (Poll #${pollCount})`);
  } else {
    process.stdout.write('.');
  }
  
  const completion = checkForCompletion(content);
  
  if (completion) {
    console.log(`\n\n✅ [${timestamp}] AGENT SECUNDUS PHASE II COMPLETE!`);
    console.log(`   Signal Type: ${completion}`);
    console.log(`   Poll Count: ${pollCount}`);
    console.log('\n🎯 Agent Tertius is now UNBLOCKED and ready to begin operations!\n');
    clearInterval(pollInterval);
    process.exit(0);
  }
}

console.log('🔍 Agent Tertius Monitoring System Active');
console.log(`📍 Watching: ${CAMPAIGN_STATUS_FILE}`);
console.log(`⏱️  Poll Interval: 30 seconds`);
console.log(`🎯 Waiting for: Agent Secundus Phase II COMPLETE\n`);
console.log(`${formatTime()} Starting monitor...\n`);

// Initial check
poll();

// Poll every 30 seconds
const pollInterval = setInterval(poll, POLL_INTERVAL);

// Allow graceful shutdown
process.on('SIGINT', () => {
  clearInterval(pollInterval);
  console.log(`\n\n⏹️  Monitor stopped after ${pollCount} polls`);
  process.exit(0);
});
