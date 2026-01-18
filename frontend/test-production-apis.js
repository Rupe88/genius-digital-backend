#!/usr/bin/env node

/**
 * Comprehensive Production API Test
 * Tests all frontend API integrations with production backend
 */

const API_BASE_URL = 'https://goldfish-app-d9t4j.ondigitalocean.app/api';

/**
 * Test Utilities
 */
class ProductionAPITester {
  constructor() {
    this.results = { passed: 0, failed: 0, tests: [] };
    this.authToken = null;
    this.testUser = null;
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

  printSummary() {
    this.log('\n📊 Production API Test Results:');
    this.log('=' .repeat(50));
    this.log(`✅ Passed: ${this.results.passed}`);
    this.log(`❌ Failed: ${this.results.failed}`);
    this.log(`📋 Total: ${this.results.passed + this.results.failed}`);

    if (this.results.failed === 0) {
      this.log('🎉 All production APIs working perfectly!', 'success');
    } else {
      this.log('⚠️ Some APIs need attention. Check the output above.', 'warning');

      this.log('\nFailed Tests:', 'error');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => this.log(`  - ${test.name}`, 'error'));
    }

    this.log('\n🔗 Next Steps:');
    if (this.results.failed > 0) {
      this.log('1. Check backend deployment status');
      this.log('2. Verify database migrations');
      this.log('3. Check CORS configuration');
      this.log('4. Review authentication setup');
    } else {
      this.log('1. All APIs are production-ready! 🎉');
      this.log('2. Frontend can now connect seamlessly');
      this.log('3. Start building user features');
    }
  }
}

/**
 * API Integration Tests
 */
class APIIntegrationTests extends ProductionAPITester {
  async runAllTests() {
    this.log('🚀 Starting Production API Integration Tests\n');

    // Core API Tests
    await this.testHealthCheck();
    await this.testUserRegistration();
    await this.testUserLogin();

    if (this.authToken) {
      // Course-related API Tests
      await this.testCoursesAPI();
      await this.testChaptersAPI();
      await this.testLessonsAPI();
      await this.testEnrollmentsAPI();

      // Referral System Tests
      await this.testReferralAPI();

      // Admin API Tests (if user is admin)
      if (this.testUser?.role === 'ADMIN') {
        await this.testAdminAPIs();
      }
    }

    this.printSummary();
  }

  async testHealthCheck() {
    this.log('Testing backend health...');
    const { response } = await this.makeRequest('/health');

    this.assert(response && response.ok, 'Backend health check', 'Backend is healthy and responding');
    return response && response.ok;
  }

  async testUserRegistration() {
    this.log('Testing user registration...');

    this.testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      fullName: 'Production Test User'
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
      this.testUser = { ...this.testUser, ...data.data.user };
      this.log('Authentication token acquired');
    }

    return success;
  }

  async testCoursesAPI() {
    this.log('Testing courses API endpoints...');

    // Test getting all courses
    const { response: listResponse, data: listData } = await this.makeRequest('/courses');
    const listSuccess = listResponse && listResponse.ok && listData.success;
    this.assert(listSuccess, 'Courses list endpoint', 'Courses list API working');

    // Test course filtering
    const { response: filterResponse, data: filterData } = await this.makeRequest('/courses/filter?limit=5');
    const filterSuccess = filterResponse && filterResponse.ok && filterData.success;
    this.assert(filterSuccess, 'Courses filter endpoint', 'Courses filter API working');

    // Test ongoing courses
    const { response: ongoingResponse, data: ongoingData } = await this.makeRequest('/courses/ongoing');
    const ongoingSuccess = ongoingResponse && ongoingResponse.ok && ongoingData.success;
    this.assert(ongoingSuccess, 'Ongoing courses endpoint', 'Ongoing courses API working');

    return listSuccess && filterSuccess && ongoingSuccess;
  }

  async testChaptersAPI() {
    this.log('Testing chapters API endpoints...');

    // First get a course to test chapters
    const { response: coursesResponse, data: coursesData } = await this.makeRequest('/courses?limit=1');

    if (!coursesResponse?.ok || !coursesData?.success || !coursesData?.data?.length) {
      this.log('⚠️ No courses available for chapter testing');
      return false;
    }

    const courseId = coursesData.data[0].id;

    // Test getting course chapters
    const { response, data } = await this.makeRequest(`/chapters/course/${courseId}`);
    const success = response && response.ok && data.success;
    this.assert(success, 'Course chapters endpoint', 'Course chapters API working');

    return success;
  }

  async testLessonsAPI() {
    this.log('Testing lessons API endpoints...');

    // First get a course to test lessons
    const { response: coursesResponse, data: coursesData } = await this.makeRequest('/courses?limit=1');

    if (!coursesResponse?.ok || !coursesData?.success || !coursesData?.data?.length) {
      this.log('⚠️ No courses available for lesson testing');
      return false;
    }

    const courseId = coursesData.data[0].id;

    // Test getting course lessons
    const { response, data } = await this.makeRequest(`/lessons/course/${courseId}`);
    const success = response && response.ok && data.success;
    this.assert(success, 'Course lessons endpoint', 'Course lessons API working');

    return success;
  }

  async testEnrollmentsAPI() {
    this.log('Testing enrollments API endpoints...');

    // Test getting user enrollments
    const { response: myEnrollmentsResponse, data: myEnrollmentsData } = await this.makeRequest('/enrollments/my-enrollments');
    const myEnrollmentsSuccess = myEnrollmentsResponse && myEnrollmentsResponse.ok && myEnrollmentsData.success;
    this.assert(myEnrollmentsSuccess, 'My enrollments endpoint', 'My enrollments API working');

    return myEnrollmentsSuccess;
  }

  async testReferralAPI() {
    this.log('Testing referral system API endpoints...');

    // Test referral stats
    const { response: statsResponse, data: statsData } = await this.makeRequest('/referrals/stats');
    const statsSuccess = statsResponse && statsResponse.ok && statsData.success;
    this.assert(statsSuccess, 'Referral stats endpoint', 'Referral stats API working');

    // Test referral links
    const { response: linksResponse, data: linksData } = await this.makeRequest('/referrals/links');
    const linksSuccess = linksResponse && linksResponse.ok && linksData.success;
    this.assert(linksSuccess, 'Referral links endpoint', 'Referral links API working');

    return statsSuccess && linksSuccess;
  }

  async testAdminAPIs() {
    this.log('Testing admin API endpoints...');

    // Test referral analytics
    const { response: analyticsResponse, data: analyticsData } = await this.makeRequest('/referrals/admin/analytics');
    const analyticsSuccess = analyticsResponse && analyticsResponse.ok && analyticsData.success;
    this.assert(analyticsSuccess, 'Admin referral analytics', 'Admin analytics API working');

    // Test referral conversions
    const { response: conversionsResponse, data: conversionsData } = await this.makeRequest('/referrals/admin/conversions');
    const conversionsSuccess = conversionsResponse && conversionsResponse.ok && conversionsData.success;
    this.assert(conversionsSuccess, 'Admin referral conversions', 'Admin conversions API working');

    return analyticsSuccess && conversionsSuccess;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Production API Integration Test');
  console.log('Testing all frontend API integrations with:');
  console.log(`${API_BASE_URL}\n`);

  const tests = new APIIntegrationTests();
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
