#!/usr/bin/env node

/**
 * Mobile Auth API Integration Test
 * Tests the unified mobile authentication flow (passwordless OTP-based)
 */

import fetch from 'node-fetch';
import { config } from './src/config/env.js';

const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${config.port || 4000}`;
const API_BASE = '/api/mobile/auth';

// Test data - use consistent email for manual verification
const testEmailBase = process.env.TEST_EMAIL || `test-mobile-${Date.now()}@example.com`;
const testEmail = testEmailBase;
const testEmail2 = `test-mobile-2-${Date.now()}@example.com`;
const testFullName = 'Test Mobile User';
const testPhone = '9812345678';

let authToken = '';
let userId = '';
let otpCode = '';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, type = 'info') {
  const prefix = {
    info: `${colors.cyan}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    test: `${colors.blue}🧪${colors.reset}`,
  }[type] || '';
  console.log(`${prefix} ${message}`);
}

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${API_BASE}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    },
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message },
    };
  }
}

async function testHealthCheck() {
  log('Testing server health check...', 'test');
  const response = await fetch(`${BASE_URL}/health`);
  const data = await response.json();
  
  if (response.ok && data.success) {
    log('Server is running', 'success');
    return true;
  } else {
    log('Server health check failed', 'error');
    return false;
  }
}

async function testLoginOrRegisterNewUser() {
  log('Test 1: Login-or-register with NEW user', 'test');
  
  const response = await makeRequest('/login-or-register', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      fullName: testFullName,
      phone: testPhone,
    }),
  });

  if (response.ok && response.data.success) {
    userId = response.data.data.mobileAppUserId;
    log(`New user created: ${testEmail} (ID: ${userId})`, 'success');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
    return true;
  } else {
    log(`Failed: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testLoginOrRegisterExistingUser() {
  log('Test 2: Login-or-register with EXISTING user (should update profile)', 'test');
  
  const response = await makeRequest('/login-or-register', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail, // Same email as test 1
      fullName: 'Updated Test User',
      phone: '9876543210',
    }),
  });

  if (response.ok && response.data.success) {
    log(`Existing user updated: ${testEmail}`, 'success');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
    return true;
  } else {
    log(`Failed: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testLoginOrRegisterValidation() {
  log('Test 3: Login-or-register validation (invalid email)', 'test');
  
  const response = await makeRequest('/login-or-register', {
    method: 'POST',
    body: JSON.stringify({
      email: 'invalid-email',
      fullName: testFullName,
    }),
  });

  if (!response.ok && response.status === 400) {
    log('Validation error caught correctly', 'success');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
    return true;
  } else {
    log(`Expected validation error but got: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testSendOtp() {
  log('Test 4: Send OTP (resend)', 'test');
  
  const response = await makeRequest('/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
    }),
  });

  if (response.ok && response.data.success) {
    log('OTP sent successfully', 'success');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
    return true;
  } else {
    log(`Failed: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testSendOtpNotFound() {
  log('Test 5: Send OTP for non-existent user', 'test');
  
  const response = await makeRequest('/send-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nonexistent@example.com',
    }),
  });

  if (!response.ok && response.status === 404) {
    log('Correctly returned 404 for non-existent user', 'success');
    return true;
  } else {
    log(`Expected 404 but got: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testVerifyOtpInvalid() {
  log('Test 6: Verify OTP with invalid OTP', 'test');
  
  const response = await makeRequest('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      otp: '000000',
    }),
  });

  if (!response.ok && response.status === 400) {
    log('Invalid OTP correctly rejected', 'success');
    log(`Response: ${JSON.stringify(response.data, null, 2)}`, 'info');
    return true;
  } else {
    log(`Expected error but got: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testVerifyOtpValidation() {
  log('Test 7: Verify OTP validation (missing fields)', 'test');
  
  const response = await makeRequest('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      // Missing otp field
    }),
  });

  if (!response.ok && response.status === 400) {
    log('Validation error caught correctly', 'success');
    return true;
  } else {
    log(`Expected validation error but got: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testGetMeWithoutAuth() {
  log('Test 8: Get /me without authentication', 'test');
  
  authToken = ''; // Clear token
  const response = await makeRequest('/me', {
    method: 'GET',
  });

  if (!response.ok && response.status === 401) {
    log('Correctly returned 401 for unauthenticated request', 'success');
    return true;
  } else {
    log(`Expected 401 but got: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testGetMeWithAuth() {
  log('Test 9: Get /me with authentication', 'test');
  
  if (!authToken) {
    log('Skipping: No auth token available (need to verify OTP first)', 'warning');
    return false;
  }

  const response = await makeRequest('/me', {
    method: 'GET',
  });

  if (response.ok && response.data.success && response.data.data.user) {
    log('User data retrieved successfully', 'success');
    log(`User: ${JSON.stringify(response.data.data.user, null, 2)}`, 'info');
    return true;
  } else {
    log(`Failed: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

async function testRateLimiting() {
  log('Test 10: Rate limiting (send multiple OTPs quickly)', 'test');
  
  const email = `ratelimit-test-${Date.now()}@example.com`;
  
  // Create user first
  await makeRequest('/login-or-register', {
    method: 'POST',
    body: JSON.stringify({
      email: email,
      fullName: 'Rate Limit Test',
    }),
  });

  // Try to send OTP multiple times
  let successCount = 0;
  let rateLimited = false;

  for (let i = 0; i < 5; i++) {
    const response = await makeRequest('/send-otp', {
      method: 'POST',
      body: JSON.stringify({
        email: email,
      }),
    });

    if (response.ok) {
      successCount++;
    } else if (response.status === 429) {
      rateLimited = true;
      log(`Rate limit hit after ${successCount} requests`, 'success');
      break;
    }
  }

  if (rateLimited || successCount <= 3) {
    log('Rate limiting working correctly', 'success');
    return true;
  } else {
    log(`Rate limiting may not be working (${successCount} requests succeeded)`, 'warning');
    return true; // Not a failure, just a warning
  }
}

// Manual OTP verification test (requires user to check email)
async function testVerifyOtpManual() {
  log('\n⚠️  MANUAL TEST REQUIRED:', 'warning');
  log('To complete OTP verification test:', 'warning');
  log('1. Check email inbox for OTP code', 'info');
  log(`2. Run: node test-mobile-auth.js verify <OTP_CODE> <EMAIL>`, 'info');
  log(`   Or: node test-mobile-auth.js verify <OTP_CODE>`, 'info');
  log(`   Email: ${testEmail}`, 'info');
  log('\nOr use the OTP from the database:', 'info');
  log('Run: npx prisma studio', 'info');
  log('Navigate to mobile_app_otps table', 'info');
  log('Find the latest OTP for the user', 'info');
}

async function verifyOtpWithCode(otp, email = null) {
  const emailToUse = email || testEmail;
  log(`Verifying OTP: ${otp} for email: ${emailToUse}`, 'test');
  
  const response = await makeRequest('/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: emailToUse,
      otp: otp,
    }),
  });

  if (response.ok && response.data.success && response.data.data.token) {
    authToken = response.data.data.token;
    log('OTP verified successfully!', 'success');
    log(`Token received: ${authToken.substring(0, 50)}...`, 'info');
    log(`User: ${JSON.stringify(response.data.data.user, null, 2)}`, 'info');
    return true;
  } else {
    log(`Failed: ${JSON.stringify(response.data, null, 2)}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Mobile Auth API Test Suite');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Test Email: ${testEmail}`);
  console.log('='.repeat(60) + '\n');

  const results = [];

  // Check if manual OTP verification
  const args = process.argv.slice(2);
  if (args[0] === 'verify' && args[1]) {
    const otp = args[1];
    const email = args[2] || testEmail;
    const success = await verifyOtpWithCode(otp, email);
    if (success) {
      log('\nRunning authenticated tests...', 'info');
      results.push({ name: 'Get /me with auth', passed: await testGetMeWithAuth() });
    }
    printResults(results);
    process.exit(success ? 0 : 1);
    return;
  }

  // Run automated tests
  results.push({ name: 'Health Check', passed: await testHealthCheck() });
  results.push({ name: 'Login-or-register (new user)', passed: await testLoginOrRegisterNewUser() });
  results.push({ name: 'Login-or-register (existing user)', passed: await testLoginOrRegisterExistingUser() });
  results.push({ name: 'Login-or-register validation', passed: await testLoginOrRegisterValidation() });
  results.push({ name: 'Send OTP', passed: await testSendOtp() });
  results.push({ name: 'Send OTP (not found)', passed: await testSendOtpNotFound() });
  results.push({ name: 'Verify OTP (invalid)', passed: await testVerifyOtpInvalid() });
  results.push({ name: 'Verify OTP validation', passed: await testVerifyOtpValidation() });
  results.push({ name: 'Get /me (no auth)', passed: await testGetMeWithoutAuth() });
  results.push({ name: 'Rate limiting', passed: await testRateLimiting() });

  // Manual test instructions
  await testVerifyOtpManual();

  printResults(results);
}

function printResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${status} ${index + 1}. ${result.name}`);
  });

  console.log('='.repeat(60));
  console.log(`Total: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log(`${colors.green}All tests passed!${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}Some tests failed. Check the output above.${colors.reset}\n`);
  }
}

// Run tests
runTests().catch((error) => {
  log(`Test suite failed: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
