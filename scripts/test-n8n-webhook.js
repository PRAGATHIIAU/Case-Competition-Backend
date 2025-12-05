/**
 * Test Script for N8N Webhook
 * 
 * This script helps diagnose webhook connectivity issues
 * Run with: node scripts/test-n8n-webhook.js
 */

require('dotenv').config();
const axios = require('axios');
const { N8N_WEBHOOK_JUDGE_REGISTERED_URL } = require('../config/aws');

async function testWebhook() {
  console.log('🔍 Testing N8N Webhook Configuration...\n');

  // Check if webhook URL is configured
  if (!N8N_WEBHOOK_JUDGE_REGISTERED_URL) {
    console.log('❌ ERROR: N8N_WEBHOOK_JUDGE_REGISTERED_URL is not configured in .env file');
    console.log('\n📝 Solution:');
    console.log('1. Open your .env file');
    console.log('2. Add: N8N_WEBHOOK_JUDGE_REGISTERED_URL=https://your-n8n-instance.com/webhook/alumni_judge_registered');
    console.log('3. Replace with your actual n8n webhook URL');
    console.log('4. Restart backend server\n');
    return;
  }

  console.log('✅ Webhook URL is configured:');
  console.log(`   ${N8N_WEBHOOK_JUDGE_REGISTERED_URL}\n`);

  // Test payload
  const testPayload = {
    judgeId: '123',
    eventId: 'EVT-TEST-123'
  };

  console.log('📤 Sending test webhook request...');
  console.log('   Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  try {
    const response = await axios.post(
      N8N_WEBHOOK_JUDGE_REGISTERED_URL,
      testPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('✅ SUCCESS: Webhook call successful!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, response.data || 'No response data');
    console.log('\n📋 Next steps:');
    console.log('1. Check n8n workflow executions tab');
    console.log('2. Verify workflow executed successfully');
    console.log('3. Check if emails were sent\n');
  } catch (error) {
    console.log('❌ ERROR: Webhook call failed!\n');

    if (error.code === 'ECONNREFUSED') {
      console.log('🔴 Connection Refused:');
      console.log('   - n8n instance might not be running');
      console.log('   - Webhook URL might be incorrect');
      console.log('   - Backend cannot reach n8n server');
      console.log('\n📝 Solutions:');
      console.log('1. Verify n8n instance is running');
      console.log('2. Check webhook URL is correct');
      console.log('3. Verify network connectivity');
    } else if (error.response) {
      console.log(`🔴 HTTP Error ${error.response.status}:`);
      console.log('   Response:', error.response.data);
      console.log('\n📝 Solutions:');
      if (error.response.status === 404) {
        console.log('1. Webhook URL is incorrect');
        console.log('2. Workflow path might be wrong');
        console.log('3. Verify webhook URL in n8n matches .env');
      } else if (error.response.status === 401 || error.response.status === 403) {
        console.log('1. Webhook might require authentication');
        console.log('2. Check n8n webhook security settings');
      }
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log('🔴 Timeout Error:');
      console.log('   - n8n server is too slow or unreachable');
      console.log('   - Network connectivity issues');
      console.log('\n📝 Solutions:');
      console.log('1. Check n8n server status');
      console.log('2. Verify network connectivity');
      console.log('3. Check firewall rules');
    } else {
      console.log('🔴 Unknown Error:');
      console.log('   Message:', error.message);
      console.log('   Code:', error.code);
    }

    console.log('\n📋 Check:');
    console.log('1. Backend logs for more details');
    console.log('2. n8n workflow is activated');
    console.log('3. Webhook node is active in n8n\n');
  }
}

// Run test
testWebhook().catch(console.error);

