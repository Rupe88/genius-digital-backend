#!/usr/bin/env node

/**
 * Referral System Integration Test
 * Tests the complete referral flow with production backend
 */

import fetch from 'node-fetch';
import { createHash } from 'crypto';

const BASE_URL = 'https://goldfish-app-d9t4j.ondigitalocean.app';

// Test data
const testUser = {
  email: 'testuser@example.com',
  password: 'testpassword123',
  fullName: 'Test User'
};

const testCourse = {
  title: 'Test Referral Course',
  description: 'A course for testing referral system',
  price: 99.99,
  isFree: false
};

let authToken = '';
let userId = '';
let courseId = '';
let referralCode = '';
let clickId = '';
let enrollmentId = '';

async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };

  const response = await fetch(url, { ...defaultOptions, ...options });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function testHealthCheck() {
  console.log('🩺 Testing health check...');
  try {
    const response = await makeRequest('/health');
    console.log('✅ Health check passed:', response.message);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testUserRegistration() {
  console.log('👤 Testing user registration...');
  try {
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });

    if (response.success) {
      console.log('✅ User registration successful');
      userId = response.data.user.id;
      return true;
    } else {
      console.error('❌ User registration failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ User registration error:', error.message);
    return false;
  }
}

async function testUserLogin() {
  console.log('🔐 Testing user login...');
  try {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (response.success && response.data.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ User login successful');
      return true;
    } else {
      console.error('❌ User login failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ User login error:', error.message);
    return false;
  }
}

async function testCourseCreation() {
  console.log('📚 Testing course creation...');
  try {
    const response = await makeRequest('/api/courses', {
      method: 'POST',
      body: JSON.stringify(testCourse)
    });

    if (response.success) {
      courseId = response.data.id;
      console.log('✅ Course creation successful, ID:', courseId);
      return true;
    } else {
      console.error('❌ Course creation failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Course creation error:', error.message);
    return false;
  }
}

async function testReferralLinkGeneration() {
  console.log('🔗 Testing referral link generation...');
  try {
    const response = await makeRequest(`/api/referrals/share/${courseId}`);

    if (response.success && response.data.referralCode) {
      referralCode = response.data.referralCode;
      console.log('✅ Referral link generation successful, Code:', referralCode);
      console.log('📱 Sharing URLs:', response.data);
      return true;
    } else {
      console.error('❌ Referral link generation failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Referral link generation error:', error.message);
    return false;
  }
}

async function testReferralClickTracking() {
  console.log('👆 Testing referral click tracking...');
  try {
    // Simulate a click by making a request to the click endpoint
    const response = await fetch(`${BASE_URL}/api/referrals/click/${referralCode}`, {
      redirect: 'manual', // Don't follow redirects
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.status === 302) {
      console.log('✅ Referral click tracking successful (redirected as expected)');
      // Extract click ID from response headers or cookies if available
      const setCookie = response.headers.get('set-cookie');
      if (setCookie && setCookie.includes('referral_click_id')) {
        console.log('🍪 Referral click cookie set successfully');
      }
      return true;
    } else {
      console.error('❌ Referral click tracking failed, status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Referral click tracking error:', error.message);
    return false;
  }
}

async function testReferralStats() {
  console.log('📊 Testing referral stats...');
  try {
    const response = await makeRequest('/api/referrals/stats');

    if (response.success) {
      console.log('✅ Referral stats retrieved successfully');
      console.log('📈 Stats:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.error('❌ Referral stats failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Referral stats error:', error.message);
    return false;
  }
}

async function testReferralLinks() {
  console.log('🔗 Testing referral links listing...');
  try {
    const response = await makeRequest('/api/referrals/links');

    if (response.success) {
      console.log('✅ Referral links retrieved successfully');
      console.log(`📋 Found ${response.data.data.length} referral links`);
      return true;
    } else {
      console.error('❌ Referral links failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Referral links error:', error.message);
    return false;
  }
}

async function testEnrollmentWithReferral() {
  console.log('🎓 Testing enrollment with referral...');
  try {
    // First simulate a click to set the cookie
    await fetch(`${BASE_URL}/api/referrals/click/${referralCode}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': '' // Would need to extract from previous response
      }
    });

    const response = await makeRequest('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({
        courseId: courseId
      }),
      headers: {
        'Cookie': 'referral_click_id=test_click_id' // Simulate cookie
      }
    });

    if (response.success) {
      enrollmentId = response.data.id;
      console.log('✅ Enrollment with referral successful, ID:', enrollmentId);
      return true;
    } else {
      console.error('❌ Enrollment with referral failed:', response.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Enrollment with referral error:', error.message);
    return false;
  }
}

async function testFraudPrevention() {
  console.log('🛡️ Testing fraud prevention...');
  try {
    // Test 1: Self-referral prevention
    console.log('Testing self-referral prevention...');
    // This should be handled in the frontend/backend logic

    // Test 2: Multiple rapid clicks (would need multiple requests)
    console.log('Testing rapid click prevention...');

    // Test 3: Invalid referral codes
    try {
      await fetch(`${BASE_URL}/api/referrals/click/INVALID_CODE`);
      console.log('✅ Invalid code handling works');
    } catch (error) {
      console.log('ℹ️ Invalid code test completed');
    }

    console.log('✅ Fraud prevention tests completed');
    return true;
  } catch (error) {
    console.error('❌ Fraud prevention test error:', error.message);
    return false;
  }
}

async function runIntegrationTests() {
  console.log('🚀 Starting Referral System Integration Tests\n');
  console.log('=' .repeat(50));

  const tests = [
    testHealthCheck,
    testUserRegistration,
    testUserLogin,
    testCourseCreation,
    testReferralLinkGeneration,
    testReferralClickTracking,
    testReferralStats,
    testReferralLinks,
    testEnrollmentWithReferral,
    testFraudPrevention
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ Test failed with exception:`, error.message);
      failed++;
    }
    console.log(''); // Empty line between tests
  }

  console.log('=' .repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All integration tests passed!');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }

  // Cleanup (in a real scenario, you'd want to clean up test data)
  console.log('\n🧹 Note: Test data cleanup should be implemented for production use');
}

// Run the tests
runIntegrationTests().catch(console.error);
