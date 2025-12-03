/**
 * API Response Validator
 * Validates that external APIs provide all required fields for successful mapping
 */

// Required fields for each API type
const REQUIRED_FIELDS = {
  bookingConfirmation: {
    mandatory: ['name', 'phone', 'store', 'bookingNo', 'securityAmount', 'enquiryDate', 'functionDate'],
    optional: ['enquiryType', 'remarks'],
    fieldVariations: {
      name: ['name', 'Name', 'customerName', 'CustomerName', 'customer_name'],
      phone: ['phoneNo', 'phone', 'Phone', 'mobile', 'Mobile', 'customerPhone', 'contact', 'Contact'],
      store: ['store', 'Store', 'storeName', 'StoreName', 'store_location', 'location', 'Location'],
      bookingNo: ['bookingNo', 'bookingNumber', 'BookingNo', 'booking_no'],
      securityAmount: ['price', 'securityAmount', 'security', 'SecurityAmount', 'deposit', 'advance'],
      enquiryDate: ['enquiryDate', 'bookingDate', 'date', 'enquiry_date'],
      functionDate: ['functionDate', 'eventDate', 'function_date', 'event_date', 'deliveryDate', 'trialDate']
    }
  },
  rentOutFeedback: {
    mandatory: ['name', 'phone', 'store', 'bookingNo', 'returnDate', 'securityAmount'],
    optional: ['attendedBy', 'enquiryDate', 'functionDate', 'enquiryType', 'remarks'],
    fieldVariations: {
      name: ['name', 'Name', 'customerName', 'CustomerName', 'customer_name'],
      phone: ['phoneNo', 'phone', 'Phone', 'mobile', 'Mobile', 'customerPhone', 'contact', 'Contact'],
      store: ['store', 'Store', 'storeName', 'StoreName', 'store_location', 'location', 'Location'],
      bookingNo: ['bookingNo', 'bookingNumber', 'BookingNo', 'booking_no'],
      returnDate: ['returnDate', 'return_date', 'expectedReturnDate'],
      securityAmount: ['price', 'securityAmount', 'security', 'SecurityAmount', 'deposit', 'advance'],
      attendedBy: ['attendedBy', 'attended_by', 'staff', 'Staff', 'handledBy', 'bookingBy'],
      enquiryDate: ['enquiryDate', 'rentDate', 'rentOutDate', 'rent_date', 'enquiry_date'],
      functionDate: ['functionDate', 'eventDate', 'function_date', 'event_date', 'deliveryDate', 'trialDate']
    }
  },
  lossOfSale: {
    mandatory: ['name', 'phone', 'store', 'visitDate', 'functionDate', 'attendedBy'],
    optional: ['reason', 'closingStatus', 'remarks'],
    fieldVariations: {
      name: ['name', 'Name', 'customerName', 'CustomerName', 'customer_name'],
      phone: ['phone', 'Phone', 'mobile', 'Mobile', 'customerPhone', 'contact', 'Contact'],
      store: ['store', 'Store', 'storeName', 'StoreName', 'store_location', 'location'],
      visitDate: ['visitDate', 'visit_date', 'date', 'Date'],
      functionDate: ['functionDate', 'function_date', 'eventDate', 'event_date'],
      attendedBy: ['attendedBy', 'attended_by', 'staff', 'Staff', 'handledBy']
    }
  },
  justDial: {
    mandatory: ['name', 'phone', 'store', 'enquiryDate', 'functionDate'],
    optional: ['closingStatus', 'reason', 'remarks'],
    fieldVariations: {
      name: ['name', 'Name', 'customerName', 'CustomerName', 'customer_name'],
      phone: ['phone', 'Phone', 'mobile', 'Mobile', 'customerPhone', 'contact', 'Contact'],
      store: ['store', 'Store', 'storeName', 'StoreName', 'store_location', 'location'],
      enquiryDate: ['enquiryDate', 'enquiry_date', 'date', 'Date', 'createdDate'],
      functionDate: ['functionDate', 'function_date', 'eventDate', 'event_date']
    }
  }
};

/**
 * Check if a field exists in the data using all possible variations
 */
const findField = (data, fieldName, variations) => {
  for (const variation of variations) {
    if (data[variation] !== undefined && data[variation] !== null && data[variation] !== '') {
      return { found: true, field: variation, value: data[variation] };
    }
  }
  return { found: false, field: fieldName, value: null };
};

/**
 * Validate phone number format (must be 10 digits after cleaning)
 * Handles international formats by extracting last 10 digits
 */
const validatePhone = (phone) => {
  if (!phone) return { valid: false, reason: 'Missing' };
  const cleaned = String(phone).replace(/\D/g, '');
  
  // If exactly 10 digits, valid
  if (cleaned.length === 10) {
    return { valid: true, cleaned };
  }
  
  // If more than 10 digits (international format), extract last 10 digits
  if (cleaned.length > 10) {
    const last10 = cleaned.slice(-10);
    return { valid: true, cleaned: last10, note: `Extracted last 10 digits from ${cleaned.length}-digit number` };
  }
  
  // If 9 digits, try padding with leading zero
  if (cleaned.length === 9) {
    return { valid: true, cleaned: '0' + cleaned, note: 'Padded with leading zero' };
  }
  
  // If less than 9 digits, invalid
  return { valid: false, reason: `Invalid length: ${cleaned.length} digits (expected 10, got ${cleaned})` };
};

/**
 * Validate date format
 */
const validateDate = (date) => {
  if (!date) return { valid: false, reason: 'Missing' };
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    return { valid: true, parsed };
  }
  return { valid: false, reason: 'Invalid date format' };
};

/**
 * Validate number format
 */
const validateNumber = (num) => {
  if (num === undefined || num === null || num === '') return { valid: false, reason: 'Missing' };
  const parsed = parseFloat(num);
  if (!isNaN(parsed)) {
    return { valid: true, parsed };
  }
  return { valid: false, reason: 'Invalid number format' };
};

/**
 * Validate a single record against requirements
 */
export const validateRecord = (record, apiType) => {
  const requirements = REQUIRED_FIELDS[apiType];
  if (!requirements) {
    return {
      valid: false,
      error: `Unknown API type: ${apiType}`
    };
  }

  const validation = {
    valid: true,
    apiType,
    record: record,
    missingFields: [],
    invalidFields: [],
    foundFields: {},
    warnings: []
  };

  // Check mandatory fields
  for (const fieldName of requirements.mandatory) {
    const variations = requirements.fieldVariations[fieldName] || [fieldName];
    const fieldCheck = findField(record, fieldName, variations);

    if (!fieldCheck.found) {
      validation.valid = false;
      validation.missingFields.push({
        field: fieldName,
        tried: variations,
        message: `Required field '${fieldName}' not found (tried: ${variations.join(', ')})`
      });
    } else {
      validation.foundFields[fieldName] = {
        apiField: fieldCheck.field,
        value: fieldCheck.value
      };

      // Validate field value based on type
      if (fieldName === 'phone') {
        const phoneValidation = validatePhone(fieldCheck.value);
        if (!phoneValidation.valid) {
          validation.valid = false;
          validation.invalidFields.push({
            field: fieldName,
            apiField: fieldCheck.field,
            value: fieldCheck.value,
            reason: phoneValidation.reason
          });
        }
      } else if (fieldName.includes('Date') || fieldName === 'enquiryDate' || fieldName === 'functionDate' || fieldName === 'returnDate' || fieldName === 'visitDate') {
        const dateValidation = validateDate(fieldCheck.value);
        if (!dateValidation.valid) {
          validation.valid = false;
          validation.invalidFields.push({
            field: fieldName,
            apiField: fieldCheck.field,
            value: fieldCheck.value,
            reason: dateValidation.reason
          });
        }
      } else if (fieldName === 'securityAmount') {
        const numberValidation = validateNumber(fieldCheck.value);
        if (!numberValidation.valid) {
          validation.valid = false;
          validation.invalidFields.push({
            field: fieldName,
            apiField: fieldCheck.field,
            value: fieldCheck.value,
            reason: numberValidation.reason
          });
        }
      } else if (fieldName === 'name' || fieldName === 'store' || fieldName === 'attendedBy') {
        // String fields - check if empty
        if (!String(fieldCheck.value).trim()) {
          validation.valid = false;
          validation.invalidFields.push({
            field: fieldName,
            apiField: fieldCheck.field,
            value: fieldCheck.value,
            reason: 'Empty or whitespace only'
          });
        }
      }
    }
  }

  // Check optional fields (warnings only)
  for (const fieldName of requirements.optional) {
    const variations = requirements.fieldVariations[fieldName] || [fieldName];
    const fieldCheck = findField(record, fieldName, variations);
    if (!fieldCheck.found) {
      validation.warnings.push({
        field: fieldName,
        message: `Optional field '${fieldName}' not found`
      });
    }
  }

  return validation;
};

/**
 * Validate an entire API response
 */
export const validateApiResponse = (apiResponse, apiType) => {
  const result = {
    valid: true,
    apiType,
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    records: [],
    summary: {
      missingFields: {},
      invalidFields: {},
      fieldCoverage: {}
    }
  };

  // Extract data array from response
  let dataArray = [];
  if (Array.isArray(apiResponse)) {
    dataArray = apiResponse;
  } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
    dataArray = apiResponse.data;
  } else if (apiResponse.dataSet && apiResponse.dataSet.data && Array.isArray(apiResponse.dataSet.data)) {
    dataArray = apiResponse.dataSet.data;
  } else if (apiResponse.data && Array.isArray(apiResponse.data[0])) {
    // Handle nested arrays
    dataArray = apiResponse.data.flat();
  } else {
    return {
      valid: false,
      error: 'Invalid API response format. Expected array or object with data/dataSet.data property',
      response: apiResponse
    };
  }

  result.totalRecords = dataArray.length;

  // Validate each record
  for (let i = 0; i < dataArray.length; i++) {
    const record = dataArray[i];
    const validation = validateRecord(record, apiType);
    
    result.records.push({
      index: i,
      ...validation
    });

    if (validation.valid) {
      result.validRecords++;
    } else {
      result.invalidRecords++;
      result.valid = false;

      // Aggregate missing fields
      validation.missingFields.forEach(mf => {
        if (!result.summary.missingFields[mf.field]) {
          result.summary.missingFields[mf.field] = 0;
        }
        result.summary.missingFields[mf.field]++;
      });

      // Aggregate invalid fields
      validation.invalidFields.forEach(inf => {
        const key = `${inf.field}:${inf.reason}`;
        if (!result.summary.invalidFields[key]) {
          result.summary.invalidFields[key] = {
            field: inf.field,
            reason: inf.reason,
            count: 0,
            examples: []
          };
        }
        result.summary.invalidFields[key].count++;
        if (result.summary.invalidFields[key].examples.length < 3) {
          result.summary.invalidFields[key].examples.push({
            value: inf.value,
            apiField: inf.apiField
          });
        }
      });
    }

    // Track field coverage
    Object.keys(validation.foundFields).forEach(field => {
      if (!result.summary.fieldCoverage[field]) {
        result.summary.fieldCoverage[field] = {
          found: 0,
          apiFields: new Set()
        };
      }
      result.summary.fieldCoverage[field].found++;
      result.summary.fieldCoverage[field].apiFields.add(validation.foundFields[field].apiField);
    });
  }

  return result;
};

/**
 * Print validation report
 */
export const printValidationReport = (validation) => {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 API Validation Report: ${validation.apiType}`);
  console.log('='.repeat(80));
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Records: ${validation.totalRecords}`);
  console.log(`   ✅ Valid: ${validation.validRecords}`);
  console.log(`   ❌ Invalid: ${validation.invalidRecords}`);
  console.log(`   Success Rate: ${validation.totalRecords > 0 ? ((validation.validRecords / validation.totalRecords) * 100).toFixed(2) : 0}%`);

  if (validation.validRecords < validation.totalRecords) {
    console.log(`\n❌ Missing Fields Summary:`);
    Object.entries(validation.summary.missingFields)
      .sort((a, b) => b[1] - a[1])
      .forEach(([field, count]) => {
        console.log(`   - ${field}: Missing in ${count} record(s)`);
      });

    console.log(`\n⚠️  Invalid Fields Summary:`);
    Object.values(validation.summary.invalidFields)
      .sort((a, b) => b.count - a.count)
      .forEach(field => {
        console.log(`   - ${field.field}: ${field.reason} (${field.count} record(s))`);
        if (field.examples.length > 0) {
          console.log(`     Examples: ${field.examples.map(e => `${e.apiField}="${e.value}"`).join(', ')}`);
        }
      });
  }

  console.log(`\n📋 Field Coverage:`);
  Object.entries(validation.summary.fieldCoverage)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([field, coverage]) => {
      const percentage = ((coverage.found / validation.totalRecords) * 100).toFixed(1);
      const apiFields = Array.from(coverage.apiFields).join(', ');
      console.log(`   - ${field}: ${coverage.found}/${validation.totalRecords} (${percentage}%) - Found as: ${apiFields}`);
    });

  // Show first few invalid records
  if (validation.invalidRecords > 0) {
    console.log(`\n🔍 Sample Invalid Records (first 3):`);
    validation.records
      .filter(r => !r.valid)
      .slice(0, 3)
      .forEach((record, idx) => {
        console.log(`\n   Record ${record.index + 1}:`);
        if (record.missingFields.length > 0) {
          console.log(`     Missing: ${record.missingFields.map(mf => mf.field).join(', ')}`);
        }
        if (record.invalidFields.length > 0) {
          record.invalidFields.forEach(inf => {
            console.log(`     Invalid ${inf.field}: ${inf.reason} (value: ${inf.value})`);
          });
        }
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');
};

