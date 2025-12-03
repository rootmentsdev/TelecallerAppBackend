# API Validation Guide

This guide explains how to check if external APIs are providing all required data for successful mapping to the UI.

---

## 🎯 Quick Start

### Run Validation Test

```bash
# Test all APIs
node scripts/test-api-validation.js

# Or add to package.json
npm run test:api
```

---

## 📋 Validation Methods

### Method 1: Automated Validation Script

The validation script automatically:
- ✅ Tests API endpoints
- ✅ Validates all required fields
- ✅ Checks data formats (phone, dates, numbers)
- ✅ Generates detailed reports
- ✅ Shows missing/invalid fields

**Run it:**
```bash
node scripts/test-api-validation.js
```

**Output includes:**
- Total records tested
- Valid vs invalid records
- Missing fields summary
- Invalid fields with examples
- Field coverage statistics

---

### Method 2: Manual API Testing

#### Step 1: Call the API

```bash
# Example: Test Booking API
curl -X POST https://rentalapi.rootments.live/api/Reports/GetBookingReport \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json-patch+json" \
  -d '{
    "bookingNo": "",
    "dateFrom": "",
    "dateTo": "",
    "locationID": "1"
  }'
```

#### Step 2: Check Response Structure

Verify the response has:
```json
{
  "status": "success",
  "data": [
    {
      // Check for required fields here
    }
  ]
}
```

#### Step 3: Validate Required Fields

For **Booking Confirmation API**, check for:
- ✅ `name` or `customerName`
- ✅ `phone` or `mobile` (10 digits)
- ✅ `store` or `storeName`
- ✅ `bookingNo` or `bookingNumber`
- ✅ `securityAmount` or `security` (number)
- ✅ `enquiryDate` or `bookingDate` (valid date)
- ✅ `functionDate` or `eventDate` (valid date)

---

### Method 3: Check Import Logs

When running sync scripts, check console output:

```bash
npm run sync:booking
```

**Look for:**
- ✅ `saved` - Record successfully imported
- ⚠️ `skipped` - Record missing required fields
- ❌ `errors` - Record has invalid data

**Example output:**
```
✅ Booking API sync completed: 95 saved, 5 skipped, 0 errors
```

If you see `skipped` or `errors`, those records are missing required fields.

---

### Method 4: Database Verification

Check imported data in MongoDB:

```bash
npm run verify:data
```

This shows:
- Total leads imported
- Leads by source/type
- Sample records with all fields
- Missing field indicators

---

## 🔍 What to Check

### 1. Required Fields Presence

For each API type, verify these fields exist:

#### Booking Confirmation API
```
✅ name / customerName
✅ phone / mobile (10 digits)
✅ store / storeName
✅ bookingNo / bookingNumber
✅ securityAmount / security
✅ enquiryDate / bookingDate
✅ functionDate / eventDate
```

#### Rent-Out API
```
✅ name / customerName
✅ phone / mobile (10 digits)
✅ store / storeName
✅ bookingNo / bookingNumber
✅ returnDate / return_date
✅ securityAmount / security
✅ attendedBy / staff
```

#### Loss of Sale API
```
✅ name / customerName
✅ phone / mobile (10 digits)
✅ store / storeName
✅ visitDate / date
✅ functionDate / eventDate
✅ attendedBy / staff
```

#### Just Dial API
```
✅ name / customerName
✅ phone / mobile (10 digits)
✅ store / storeName
✅ enquiryDate / date
✅ functionDate / eventDate
```

---

### 2. Data Format Validation

#### Phone Numbers
- ✅ Must be 10 digits (any format accepted, will be cleaned)
- ❌ Invalid: `"123"`, `"12345678901"`, `"abc123"`

#### Dates
- ✅ Valid: `"2024-01-15"`, `"15-01-2024"`, ISO format, timestamp
- ❌ Invalid: `"invalid-date"`, `""`, `null`

#### Numbers
- ✅ Valid: `5000`, `"5000"`, `5000.50`
- ❌ Invalid: `"abc"`, `""`, `null`

#### Strings
- ✅ Valid: `"John Doe"`, `"Mumbai"`
- ❌ Invalid: `""`, `"   "` (whitespace only), `null`

---

### 3. Field Name Variations

The system accepts multiple field name variations. Check if your API uses:

**Customer Name:**
- `name`, `Name`, `customerName`, `CustomerName`, `customer_name`

**Phone:**
- `phone`, `Phone`, `mobile`, `Mobile`, `customerPhone`, `contact`, `Contact`

**Store:**
- `store`, `Store`, `storeName`, `StoreName`, `store_location`, `location`

**Booking Number:**
- `bookingNo`, `bookingNumber`, `BookingNo`, `booking_no`

**Security Amount:**
- `securityAmount`, `security`, `SecurityAmount`, `deposit`

**Dates:**
- `enquiryDate`, `bookingDate`, `date`, `enquiry_date`
- `functionDate`, `eventDate`, `function_date`, `event_date`
- `returnDate`, `return_date`
- `visitDate`, `visit_date`

---

## 📊 Validation Report Example

When you run the validation script, you'll see:

```
================================================================================
📊 API Validation Report: bookingConfirmation
================================================================================

📈 Summary:
   Total Records: 100
   ✅ Valid: 95
   ❌ Invalid: 5
   Success Rate: 95.00%

❌ Missing Fields Summary:
   - securityAmount: Missing in 3 record(s)
   - functionDate: Missing in 2 record(s)

⚠️  Invalid Fields Summary:
   - phone: Invalid length: 9 digits (expected 10) (2 record(s))
     Examples: phone="123456789", mobile="987654321"

📋 Field Coverage:
   - bookingNo: 100/100 (100.0%) - Found as: bookingNumber
   - enquiryDate: 100/100 (100.0%) - Found as: bookingDate
   - functionDate: 98/100 (98.0%) - Found as: functionDate
   - name: 100/100 (100.0%) - Found as: customerName
   - phone: 98/100 (98.0%) - Found as: phone, mobile
   - securityAmount: 97/100 (97.0%) - Found as: securityAmount
   - store: 100/100 (100.0%) - Found as: storeName

🔍 Sample Invalid Records (first 3):

   Record 1:
     Missing: securityAmount
     Invalid phone: Invalid length: 9 digits (expected 10) (value: 123456789)

   Record 2:
     Missing: functionDate

================================================================================
```

---

## 🛠️ Troubleshooting

### Issue: All Records Invalid

**Check:**
1. API response format - is it an array or object with `data` property?
2. Field names - do they match accepted variations?
3. API authentication - is the token valid?

**Solution:**
- Review API response structure
- Check field name variations in `EXTERNAL_API_SPECIFICATION.md`
- Verify API credentials

---

### Issue: Missing Fields

**Check:**
1. Are fields named differently than expected?
2. Are fields nested in a different structure?
3. Are fields empty/null?

**Solution:**
- Check accepted field name variations
- Update data mapper if needed
- Contact API team to add missing fields

---

### Issue: Invalid Data Formats

**Check:**
1. Phone numbers - are they 10 digits?
2. Dates - are they in valid format?
3. Numbers - are they valid numeric values?

**Solution:**
- Clean phone numbers to 10 digits
- Format dates consistently
- Ensure numbers are numeric, not strings

---

### Issue: Low Success Rate

**Check:**
1. How many records are invalid?
2. What fields are missing?
3. What data formats are invalid?

**Solution:**
- Review validation report
- Fix missing fields in API
- Correct data format issues

---

## 📝 Validation Checklist

Before deploying, verify:

- [ ] All required fields are present in API response
- [ ] Phone numbers are 10 digits (any format)
- [ ] Dates are in valid format
- [ ] Numbers are valid numeric values
- [ ] Strings are not empty or whitespace-only
- [ ] Field names match accepted variations
- [ ] API response structure is correct
- [ ] Validation script shows >95% success rate

---

## 🔄 Continuous Monitoring

### Add to Sync Scripts

You can add validation to your sync scripts:

```javascript
import { validateApiResponse, printValidationReport } from '../utils/apiValidator.js';

// After fetching API data
const validation = validateApiResponse(apiResponse, 'bookingConfirmation');
if (!validation.valid) {
  console.warn('⚠️  API validation failed - some records may not import correctly');
  printValidationReport(validation);
}
```

### Schedule Regular Tests

Set up a cron job to test APIs regularly:

```bash
# Daily at 2 AM
0 2 * * * cd /path/to/backend && node scripts/test-api-validation.js >> logs/api-validation.log
```

---

## 📞 Support

If validation fails:
1. Review the validation report
2. Check `EXTERNAL_API_SPECIFICATION.md` for required fields
3. Contact API team with specific missing/invalid fields
4. Update data mapper if field names differ

---

## 🎯 Quick Commands

```bash
# Test all APIs
node scripts/test-api-validation.js

# Test specific sync
npm run sync:booking

# Verify imported data
npm run verify:data

# Check API response manually
curl -X POST API_URL -H "Authorization: Bearer TOKEN" -d '{}'
```

