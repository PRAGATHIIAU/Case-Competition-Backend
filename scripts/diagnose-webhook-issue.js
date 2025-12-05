/**
 * Webhook Diagnostic Script
 * 
 * Helps diagnose why n8n webhook is not being called
 * Run: node scripts/diagnose-webhook-issue.js
 */

require('dotenv').config();
const { N8N_WEBHOOK_JUDGE_REGISTERED_URL } = require('../config/aws');

console.log('🔍 N8N Webhook Diagnostic Tool\n');
console.log('='.repeat(50));
console.log('');

// Check 1: Environment Variable Configuration
console.log('1️⃣ Checking Environment Variable Configuration...');
if (!process.env.N8N_WEBHOOK_JUDGE_REGISTERED_URL) {
  console.log('   ❌ N8N_WEBHOOK_JUDGE_REGISTERED_URL is NOT set in .env file');
  console.log('');
  console.log('   📝 SOLUTION:');
  console.log('   1. Open your .env file');
  console.log('   2. Add this line:');
  console.log('      N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered');
  console.log('   3. Replace with your actual n8n webhook URL');
  console.log('   4. Restart your backend server\n');
} else {
  console.log('   ✅ N8N_WEBHOOK_JUDGE_REGISTERED_URL is configured');
  console.log(`   📍 URL: ${process.env.N8N_WEBHOOK_JUDGE_REGISTERED_URL}\n`);
}

// Check 2: Config Export
console.log('2️⃣ Checking Config Export...');
if (!N8N_WEBHOOK_JUDGE_REGISTERED_URL) {
  console.log('   ❌ Webhook URL is not exported from config/aws.js');
  console.log('   📝 Check config/aws.js file\n');
} else {
  console.log('   ✅ Webhook URL is exported from config');
  console.log(`   📍 URL: ${N8N_WEBHOOK_JUDGE_REGISTERED_URL}\n`);
}

// Check 3: URL Format
console.log('3️⃣ Checking URL Format...');
if (N8N_WEBHOOK_JUDGE_REGISTERED_URL) {
  if (N8N_WEBHOOK_JUDGE_REGISTERED_URL.startsWith('http://') || 
      N8N_WEBHOOK_JUDGE_REGISTERED_URL.startsWith('https://')) {
    console.log('   ✅ URL format is valid (starts with http:// or https://)\n');
  } else {
    console.log('   ⚠️  URL format might be invalid');
    console.log('   📝 URL should start with http:// or https://\n');
  }
  
  if (N8N_WEBHOOK_JUDGE_REGISTERED_URL.includes('your-n8n-instance.com') ||
      N8N_WEBHOOK_JUDGE_REGISTERED_URL.includes('example.com')) {
    console.log('   ⚠️  WARNING: URL contains placeholder values!');
    console.log('   📝 Replace with your actual n8n webhook URL\n');
  }
}

console.log('='.repeat(50));
console.log('');
console.log('📋 NEXT STEPS:');
console.log('');
console.log('1. Verify webhook URL in n8n:');
console.log('   - Open Workflow 1 in n8n');
console.log('   - Click "Judge Registration Webhook" node');
console.log('   - Copy the webhook URL');
console.log('');
console.log('2. Compare with .env file:');
console.log('   - Webhook URL in .env should match n8n exactly');
console.log('');
console.log('3. Check if workflow is activated:');
console.log('   - In n8n, toggle switch should be ON (green)');
console.log('');
console.log('4. Test webhook manually:');
console.log('   node scripts/test-n8n-webhook.js');
console.log('');
console.log('5. Check backend logs after registering a judge');
console.log('   Look for these messages:');
console.log('   ✅ N8N webhook called successfully');
console.log('   ⚠️  N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured');
console.log('   ⚠️  Failed to call n8n webhook: [error]');
console.log('');

