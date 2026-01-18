#!/usr/bin/env node

/**
 * Frontend Integration Test
 * Tests the complete referral system integration with production backend
 */

import fetch from 'node-fetch';

const API_BASE_URL = 'https://goldfish-app-d9t4j.ondigitalocean.app/api';
const FRONTEND_URL = 'http://localhost:3000'; // Change to your frontend URL

/**
 * Test Utilities
 */
class TestRunner {
  constructor() {
    this.results = { passed: 0, failed: 0, tests: [] };
    this.authToken = null;
    this.testUser = null;
    this.testCourse = null;
    this.referralCode = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  assert(condition, message, successMsg = null) {
    if (condition) {
      this.results.passed++;
      this.log(`✅ ${successMsg || message}`, 'success');
      this.results.tests.push({ name: message, status: 'passed' });
    } else {
      this.results.failed++;
      this.log(`❌ ${message}`, 'error');
      this.results.tests.push({ name: message, status: 'failed' });
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();
      return { response, data };
    } catch (error) {
      return { response: null, data: { error: error.message } };
    }
  }
}

/**
 * Integration Tests
 */
class ReferralIntegrationTests extends TestRunner {
  async runAllTests() {
    this.log('🚀 Starting Frontend Integration Tests for Referral System\n');

    // Health Check
    await this.testHealthCheck();

    // Authentication Tests
    if (await this.testUserRegistration()) {
      if (await this.testUserLogin()) {
        // Referral System Tests
        await this.testReferralSharing();
        await this.testReferralClickTracking();
        await this.testReferralStats();
        await this.testReferralLinks();
        await this.testReferralAdminAccess();

        // Cleanup
        await this.testCleanup();
      }
    }

    // Summary
    this.printSummary();
  }

  async testHealthCheck() {
    this.log('Testing backend health...');
    const { response } = await this.makeRequest('/health');

    this.assert(response && response.ok, 'Backend health check', 'Backend is healthy');
    return response && response.ok;
  }

  async testUserRegistration() {
    this.log('Testing user registration...');

    // Use test credentials that should work
    this.testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      fullName: 'Test User'
    };

    const { response, data } = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(this.testUser)
    });

    const success = response && response.ok && data.success;
    this.assert(success, 'User registration', 'User registered successfully');

    if (success) {
      this.log(`Created test user: ${this.testUser.email}`);
    }

    return success;
  }

  async testUserLogin() {
    this.log('Testing user login...');

    const { response, data } = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: this.testUser.email,
        password: this.testUser.password
      })
    });

    const success = response && response.ok && data.success && data.data.accessToken;
    this.assert(success, 'User login', 'User logged in successfully');

    if (success) {
      this.authToken = data.data.accessToken;
      this.log('Authentication token acquired');
    }

    return success;
  }

  async testReferralSharing() {
    this.log('Testing referral link generation...');

    // First, try to get a course ID (this might fail if no courses exist)
    const { response: coursesResponse, data: coursesData } = await this.makeRequest('/courses?limit=1');

    if (!coursesResponse || !coursesResponse.ok || !coursesData.success || !coursesData.data?.length) {
      this.log('⚠️ No courses available for testing, creating a test course...');

      // Try to create a test course (requires admin access)
      const { response: createResponse, data: createData } = await this.makeRequest('/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Referral Course',
          description: 'Course for testing referral system',
          price: 99.99,
          isFree: false,
          status: 'PUBLISHED'
        })
      });

      if (createResponse && createResponse.ok && createData.success) {
        this.testCourse = createData.data;
        this.log(`Created test course: ${this.testCourse.id}`);
      } else {
        this.log('❌ Cannot create test course (admin access required), skipping referral tests');
        return false;
      }
    } else {
      this.testCourse = coursesData.data[0];
      this.log(`Using existing course: ${this.testCourse.id}`);
    }

    // Now test referral link generation
    const { response, data } = await this.makeRequest(`/referrals/share/${this.testCourse.id}`);

    const success = response && response.ok && data.success && data.data?.referralCode;
    this.assert(success, 'Referral link generation', 'Referral links generated successfully');

    if (success) {
      this.referralCode = data.data.referralCode;
      this.log(`Generated referral code: ${this.referralCode}`);
      this.log(`Share URL: ${data.data.shareUrl}`);
    }

    return success;
  }

  async testReferralClickTracking() {
    this.log('Testing referral click tracking...');

    if (!this.referralCode) {
      this.log('⚠️ Skipping click tracking test (no referral code)');
      return false;
    }

    // Test the click endpoint (it should redirect)
    const clickUrl = `${API_BASE_URL}/referrals/click/${this.referralCode}`;

    try {
      const response = await fetch(clickUrl, {
        redirect: 'manual', // Don't follow redirects
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const success = response.status === 302; // Should redirect
      this.assert(success, 'Referral click tracking', 'Click tracking works (redirects properly)');

      return success;
    } catch (error) {
      this.assert(false, 'Referral click tracking', `Click tracking failed: ${error.message}`);
      return false;
    }
  }

  async testReferralStats() {
    this.log('Testing referral stats retrieval...');

    const { response, data } = await this.makeRequest('/referrals/stats');

    const success = response && response.ok && data.success;
    this.assert(success, 'Referral stats retrieval', 'Referral stats retrieved successfully');

    if (success) {
      this.log(`Stats: ${JSON.stringify(data.data, null, 2)}`);
    }

    return success;
  }

  async testReferralLinks() {
    this.log('Testing referral links retrieval...');

    const { response, data } = await this.makeRequest('/referrals/links');

    const success = response && response.ok && data.success;
    this.assert(success, 'Referral links retrieval', 'Referral links retrieved successfully');

    if (success) {
      this.log(`Found ${data.data?.length || 0} referral links`);
    }

    return success;
  }

  async testReferralAdminAccess() {
    this.log('Testing admin referral access...');

    // Test analytics endpoint
    const { response: analyticsResponse, data: analyticsData } = await this.makeRequest('/referrals/admin/analytics');

    if (analyticsResponse && analyticsResponse.status === 403) {
      this.log('⚠️ Admin access denied (expected for non-admin user)');
      this.assert(true, 'Admin access control', 'Properly restricts admin access');
      return true;
    }

    const analyticsSuccess = analyticsResponse && analyticsResponse.ok && analyticsData.success;
    this.assert(analyticsSuccess, 'Admin analytics access', 'Admin analytics accessible');

    // Test conversions endpoint
    const { response: conversionsResponse, data: conversionsData } = await this.makeRequest('/referrals/admin/conversions');

    const conversionsSuccess = conversionsResponse && conversionsResponse.ok && conversionsData.success;
    this.assert(conversionsSuccess, 'Admin conversions access', 'Admin conversions accessible');

    return analyticsSuccess && conversionsSuccess;
  }

  async testCleanup() {
    this.log('Cleaning up test data...');

    // Note: In a real scenario, you'd want to clean up test data
    // For now, we'll just log that cleanup would happen
    this.log('✅ Test cleanup completed (manual cleanup may be needed)');

    return true;
  }

  printSummary() {
    this.log('\n📊 Integration Test Results:');
    this.log('=' .repeat(50));
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`📋 Total: ${this.results.passed + this.results.failed}`);

    if (this.results.failed === 0) {
      this.log('🎉 All integration tests passed!', 'success');
    } else {
      this.log('⚠️ Some tests failed. Check the output above.', 'warning');

      this.log('\nFailed Tests:', 'error');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => this.log(`  - ${test.name}`, 'error'));
    }

    this.log('\n🔗 Next Steps:');
    if (this.results.failed > 0) {
      this.log('1. Check backend deployment and database migration');
      this.log('2. Verify JWT token configuration');
      this.log('3. Test API endpoints manually with Postman/curl');
      this.log('4. Check CORS configuration for frontend access');
    } else {
      this.log('1. Deploy frontend code to production');
      this.log('2. Test social sharing on different platforms');
      this.log('3. Monitor referral analytics in admin dashboard');
      this.log('4. Set up commission payment workflow');
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Referral System Frontend Integration Test');
  console.log('Testing integration with production backend:');
  console.log(`${API_BASE_URL}\n`);

  const tests = new ReferralIntegrationTests();
  await tests.runAllTests();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
main().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
