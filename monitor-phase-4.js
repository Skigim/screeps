const fs = require('fs');
const path = require('path');

const CAMPAIGN_STATUS_FILE = path.join(__dirname, 'CAMPAIGN_STATUS.md');
const POLL_INTERVAL = 30000; // 30 seconds
const CHECK_STRINGS = [
  'Agent Secundus: Phase IV-B COMPLETE',
  'PHASE IV-B COMPLETE',
  'EXECUTOR IMPLEMENTATIONS COMPLETE'
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
  // Check for Phase IV-B completion signal
  if (content.includes('Agent Secundus: Phase IV-B COMPLETE')) {
    return 'EXPLICIT_PHASE_IVB_COMPLETE';
  }
  
  if (content.includes('PHASE IV-B COMPLETE')) {
    return 'DISPATCH_PHASE_IVB_COMPLETE';
  }
  
  if (content.includes('EXECUTOR IMPLEMENTATIONS COMPLETE')) {
    return 'EXECUTOR_IMPLEMENTATIONS_COMPLETE';
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
    console.log(`\n\n✅ [${timestamp}] AGENT SECUNDUS PHASE IV-B COMPLETE!`);
    console.log(`   Signal Type: ${completion}`);
    console.log(`   Poll Count: ${pollCount}`);
    console.log('\n🎖️ Agent Tertius is now UNBLOCKED for Phase IV-C!\n');
    clearInterval(pollInterval);
    process.exit(0);
  }
}

console.log('🔍 Agent Tertius Phase IV Monitoring System Active');
console.log(`📍 Watching: ${CAMPAIGN_STATUS_FILE}`);
console.log(`⏱️  Poll Interval: 30 seconds`);
console.log(`🎯 Waiting for: Agent Secundus Phase IV-B COMPLETE\n`);
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
