/**
 * Test API Validation Script
 * Tests external APIs to verify they provide all required fields
 */

import dotenv from 'dotenv';
import { postAPI, fetchAPI } from '../sync/utils/apiClient.js';
import { validateApiResponse, printValidationReport } from '../utils/apiValidator.js';

dotenv.config();

// API configurations
const APIs = {
  booking: {
    name: 'Booking Confirmation API',
    type: 'bookingConfirmation',
    url: process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || 'https://rentalapi.rootments.live',
    endpoint: '/api/Reports/GetBookingReport',
    method: 'POST',
    token: process.env.BOOKING_API_KEY || process.env.API_TOKEN,
    body: {
      bookingNo: '',
      dateFrom: process.env.BOOKING_DATE_FROM || '',
      dateTo: process.env.BOOKING_DATE_TO || '',
      userName: '',
      months: process.env.BOOKING_MONTHS || '',
      fromLocation: '',
      userID: '',
      locationID: '' // Will be set per store
    }
  },
  rentOut: {
    name: 'Rent-Out API',
    type: 'rentOutFeedback',
    url: process.env.RENTOUT_API_BASE_URL || process.env.BOOKING_API_BASE_URL || process.env.API_BASE_URL || 'https://rentalapi.rootments.live',
    endpoint: '/api/Reports/GetBookingReport',
    method: 'POST',
    token: process.env.RENTOUT_API_KEY || process.env.BOOKING_API_KEY || process.env.API_TOKEN,
    body: {
      bookingNo: '',
      dateFrom: process.env.RENTOUT_DATE_FROM || '',
      dateTo: process.env.RENTOUT_DATE_TO || '',
      userName: '',
      months: process.env.RENTOUT_MONTHS || '',
      fromLocation: '',
      userID: '',
      locationID: '' // Will be set per store
    }
  }
};

/**
 * Test a single API
 */
const testAPI = async (apiConfig, locationId = '') => {
  console.log(`\n🔍 Testing ${apiConfig.name}...`);
  console.log(`   URL: ${apiConfig.url}${apiConfig.endpoint}`);
  console.log(`   Method: ${apiConfig.method}`);
  if (locationId) {
    console.log(`   Location ID: ${locationId}`);
  }

  try {
    let response;
    const requestBody = { ...apiConfig.body };
    if (locationId) {
      requestBody.locationID = locationId.toString();
    }

    if (apiConfig.method === 'POST') {
      response = await postAPI(
        `${apiConfig.url}${apiConfig.endpoint}`,
        requestBody,
        {
          headers: {
            Authorization: apiConfig.token ? `Bearer ${apiConfig.token}` : undefined,
            'Content-Type': 'application/json-patch+json',
            accept: 'text/plain'
          },
          timeout: 10000
        }
      );
    } else {
      response = await fetchAPI(
        `${apiConfig.url}${apiConfig.endpoint}`,
        {
          headers: {
            Authorization: apiConfig.token ? `Bearer ${apiConfig.token}` : undefined,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
    }

    if (!response) {
      console.log(`   ❌ No response received from API`);
      return null;
    }

    // Validate the response
    const validation = validateApiResponse(response, apiConfig.type);
    printValidationReport(validation);

    return validation;
  } catch (error) {
    console.error(`   ❌ Error testing API: ${error.message}`);
    return null;
  }
};

/**
 * Test all APIs
 */
const testAllAPIs = async () => {
  console.log('🚀 Starting API Validation Tests...\n');
  console.log('='.repeat(80));

  const results = {};

  // Test Booking API
  if (APIs.booking.url && APIs.booking.endpoint) {
    results.booking = await testAPI(APIs.booking);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Test Rent-Out API
  if (APIs.rentOut.url && APIs.rentOut.endpoint) {
    results.rentOut = await testAPI(APIs.rentOut);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 Overall Summary');
  console.log('='.repeat(80));

  Object.entries(results).forEach(([key, validation]) => {
    if (validation) {
      const apiName = APIs[key].name;
      const successRate = validation.totalRecords > 0 
        ? ((validation.validRecords / validation.totalRecords) * 100).toFixed(2) 
        : 0;
      
      console.log(`\n${apiName}:`);
      console.log(`   Status: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Records: ${validation.validRecords}/${validation.totalRecords} valid (${successRate}%)`);
      
      if (!validation.valid) {
        console.log(`   ⚠️  Issues found - see detailed report above`);
      }
    }
  });

  console.log('\n' + '='.repeat(80) + '\n');
};

// Run tests
testAllAPIs().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

