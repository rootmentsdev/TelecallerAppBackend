/**
 * Inspect API Response Structure
 * Shows the actual field names in the API response
 */

import dotenv from 'dotenv';
import { postAPI } from '../sync/utils/apiClient.js';

dotenv.config();

const inspectAPI = async () => {
  console.log('🔍 Inspecting API Response Structure...\n');

  const apiUrl = process.env.RENTOUT_API_BASE_URL || process.env.API_BASE_URL || 'https://rentalapi.rootments.live';
  const endpoint = '/api/Reports/GetReturnReport';
  const apiToken = process.env.RENTOUT_API_KEY || process.env.API_TOKEN;

  console.log(`📡 Calling: ${apiUrl}${endpoint}\n`);

  try {
    const response = await postAPI(
      `${apiUrl}${endpoint}`,
      {
        bookingNo: '',
        dateFrom: '',
        dateTo: '',
        userName: '',
        months: '',
        fromLocation: '',
        userID: '',
        locationID: '1' // Sample location
      },
      {
        headers: {
          Authorization: apiToken ? `Bearer ${apiToken}` : undefined,
          'Content-Type': 'application/json-patch+json',
          accept: 'text/plain'
        },
        timeout: 10000
      }
    );

    if (!response) {
      console.log('❌ No response received');
      return;
    }

    // Extract data array
    let dataArray = [];
    if (Array.isArray(response)) {
      dataArray = response;
    } else if (response.data && Array.isArray(response.data)) {
      dataArray = response.data;
    } else if (response.dataSet && response.dataSet.data && Array.isArray(response.dataSet.data)) {
      dataArray = response.dataSet.data;
    } else if (response.dataSet && Array.isArray(response.dataSet)) {
      dataArray = response.dataSet;
    }

    if (dataArray.length === 0) {
      console.log('⚠️  No data in response');
      console.log('Response structure:', JSON.stringify(response, null, 2).substring(0, 500));
      return;
    }

    console.log(`✅ Found ${dataArray.length} records\n`);
    console.log('='.repeat(80));
    console.log('📋 Sample Record Structure (First Record):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(dataArray[0], null, 2));
    console.log('='.repeat(80));

    // Analyze all field names
    console.log('\n📊 All Field Names Found in Records:');
    console.log('='.repeat(80));

    const allFields = new Set();
    dataArray.slice(0, 100).forEach(record => {
      Object.keys(record).forEach(key => allFields.add(key));
    });

    console.log('\nField Names:');
    Array.from(allFields).sort().forEach(field => {
      const sampleValue = dataArray[0][field];
      const valueType = typeof sampleValue;
      const valuePreview = String(sampleValue).substring(0, 50);
      console.log(`  - ${field}: ${valueType} = "${valuePreview}"`);
    });

    // Check for phone-related fields
    console.log('\n📱 Phone Number Fields:');
    const phoneFields = Array.from(allFields).filter(f =>
      /phone|mobile|contact|tel|number/i.test(f)
    );
    phoneFields.forEach(field => {
      const sample = dataArray[0][field];
      console.log(`  - ${field}: "${sample}"`);
    });

    // Check for security/deposit fields
    console.log('\n💰 Security/Deposit Fields:');
    const securityFields = Array.from(allFields).filter(f =>
      /security|deposit|amount|advance|payment/i.test(f)
    );
    securityFields.forEach(field => {
      const sample = dataArray[0][field];
      console.log(`  - ${field}: "${sample}"`);
    });

    // Check for date fields
    console.log('\n📅 Date Fields:');
    const dateFields = Array.from(allFields).filter(f =>
      /date|time|day/i.test(f)
    );
    dateFields.forEach(field => {
      const sample = dataArray[0][field];
      console.log(`  - ${field}: "${sample}"`);
    });

    // Check for staff/attended fields
    console.log('\n👤 Staff/Attended Fields:');
    const staffFields = Array.from(allFields).filter(f =>
      /staff|attended|handled|employee|user|person/i.test(f)
    );
    staffFields.forEach(field => {
      const sample = dataArray[0][field];
      console.log(`  - ${field}: "${sample}"`);
    });

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

inspectAPI();

