# Data Import Guide - External APIs & CSV Files

This guide explains how data is imported from external APIs and CSV files, and how it maps to the UI pages.

## Overview

The backend supports importing lead data from:
1. **External APIs** - Booking, Rent-Out, Store List
2. **CSV Files** - Loss of Sale, Walk-in data

All imported data is stored in MongoDB and automatically mapped to the appropriate UI pages.

---

## Data Flow Diagram

```
External Sources
    ├─→ External APIs
    │   ├─→ Booking API → Booking Confirmation Page
    │   ├─→ Rent-Out API → Rent-Out Page
    │   └─→ Store List API → Store Management
    │
    └─→ CSV Files
        ├─→ Loss of Sale CSV → Loss of Sale Page
        └─→ Walk-in CSV → General Leads (can be filtered)
            │
            └─→ MongoDB (Lead Collection)
                │
                └─→ UI Pages
                    ├─→ Loss of Sale Page
                    ├─→ Rent-Out Page
                    ├─→ Booking Confirmation Page
                    ├─→ Just Dial Page
                    └─→ Add Lead Page (Manual Entry)
```

---

## 1. External API Imports

### Booking API Import

**Source:** External Booking API  
**Destination:** Booking Confirmation Page  
**Lead Type:** `bookingConfirmation`

#### API Configuration
```env
BOOKING_API_BASE_URL=https://rentalapi.rootments.live
BOOKING_API_KEY=your-api-token
BOOKING_DATE_FROM=  # Optional: YYYY-MM-DD
BOOKING_DATE_TO=    # Optional: YYYY-MM-DD
BOOKING_MONTHS=     # Optional: number of months
```

#### Data Mapping
| External API Field | Database Field | UI Field (GET) |
|-------------------|----------------|----------------|
| `name` / `customerName` | `name` | `lead_name` |
| `phone` / `mobile` | `phone` | `phone_number` |
| `store` / `storeName` | `store` | - |
| `bookingNo` / `bookingNumber` | `bookingNo` | `booking_number` |
| `securityAmount` / `security` | `securityAmount` | `security_amount` |
| `enquiryDate` / `bookingDate` | `enquiryDate` | `enquiry_date` |
| `functionDate` / `eventDate` | `functionDate` | `function_date` |
| `remarks` / `notes` | `remarks` | - |

#### How to Run
```bash
# Run booking sync script
node sync/api/sync_booking.js

# Or run all syncs
node sync/runAll.js
```

#### UI Mapping
- **Page:** Booking Confirmation Page
- **GET Endpoint:** `/api/pages/booking-confirmation/:id`
- **Displays:** Lead name, phone, enquiry date, function date, booking number, security amount

---

### Rent-Out API Import

**Source:** External Rent-Out API  
**Destination:** Rent-Out Page  
**Lead Type:** `rentOutFeedback`

#### API Configuration
```env
RENTOUT_API_BASE_URL=https://rentalapi.rootments.live
RENTOUT_API_KEY=your-api-token
RENTOUT_DATE_FROM=  # Optional
RENTOUT_DATE_TO=    # Optional
RENTOUT_MONTHS=     # Optional
```

#### Data Mapping
| External API Field | Database Field | UI Field (GET) |
|-------------------|----------------|----------------|
| `name` / `customerName` | `name` | `lead_name` |
| `phone` / `mobile` | `phone` | `phone_number` |
| `bookingNo` / `bookingNumber` | `bookingNo` | `booking_number` |
| `returnDate` / `return_date` | `returnDate` | `return_date` |
| `securityAmount` / `security` | `securityAmount` | `security_amount` |
| `enquiryDate` / `rentDate` | `enquiryDate` | - |
| `functionDate` / `eventDate` | `functionDate` | - |
| `remarks` / `feedback` | `remarks` | - |

#### How to Run
```bash
# Run rent-out sync script
node sync/api/sync_rentout.js

# Or run all syncs
node sync/runAll.js
```

#### UI Mapping
- **Page:** Rent-Out Page
- **GET Endpoint:** `/api/pages/rent-out/:id`
- **Displays:** Lead name, phone, booking number, return date, attended by, security amount

---

### Store List API Import

**Source:** External Store List API  
**Destination:** Store Management  
**Model:** Store Collection

#### API Configuration
```env
API_BASE_URL=http://15.207.90.158:5000
STORE_API_KEY=your-api-token
STORE_USE_POST=false  # true for POST, false for GET
```

#### How to Run
```bash
# Run store list sync
node sync/api/sync_storelist.js
```

---

## 2. CSV File Imports

### Loss of Sale CSV Import

**Source:** CSV File  
**Destination:** Loss of Sale Page  
**Lead Type:** `lossOfSale`

#### CSV File Location
```env
LOSSOFSALE_CSV_PATH=data/lossofsale.csv
```

#### Expected CSV Format
| CSV Column | Database Field | UI Field (GET) |
|-----------|----------------|----------------|
| `name` / `Customer Name` | `name` | `lead_name` |
| `phone` / `Contact` | `phone` | `phone_number` |
| `store` / `StoreName` | `store` | - |
| `visitDate` / `Date` | `visitDate` | `visit_date` |
| `functionDate` / `Function Date` | `functionDate` | `function_date` |
| `reason` / `Reason` | `reason` | - |
| `reasonCollectedFromStore` | `reasonCollectedFromStore` | `reason_collected_from_store` (POST) |
| `closingStatus` / `Status` | `closingStatus` | - |
| `remarks` / `Remarks` | `remarks` | - |
| `attendedBy` / `Staff` | `attendedBy` | `attended_by` |

#### How to Run
```bash
# Run loss of sale CSV import
node sync/csv/import_lossofsale.js

# Or run all syncs
node sync/runAll.js
```

#### UI Mapping
- **Page:** Loss of Sale Page
- **GET Endpoint:** `/api/pages/loss-of-sale/:id`
- **Displays:** Lead name, phone, visit date, function date, attended by

---

### Walk-in CSV Import

**Source:** CSV File  
**Destination:** General Leads (can be filtered)  
**Lead Type:** `general`

#### CSV File Location
```env
WALKIN_CSV_PATH=data/walkin.csv
```

#### Expected CSV Format
| CSV Column | Database Field | UI Field (GET) |
|-----------|----------------|----------------|
| `Customer Name` / `name` | `name` | `lead_name` |
| `Contact` / `phone` | `phone` | `phone_number` |
| `Date` | `enquiryDate` | - |
| `Function Date` | `functionDate` | - |
| `Staff` | `attendedBy` | `attended_by` |
| `Status` | `closingStatus` | - |
| `Category` / `Sub Category` | `enquiryType` | - |
| `Remarks` | `remarks` | - |

#### How to Run
```bash
# Run walk-in CSV import
node sync/csv/import_walkin.js

# Or run all syncs
node sync/runAll.js
```

---

### CSV Upload via API

**Endpoint:** `POST /api/import/leads`  
**Access:** Admin and Team Lead only  
**Method:** Multipart form data with CSV file

#### Request
```bash
curl -X POST http://localhost:8800/api/import/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "csvFile=@path/to/file.csv"
```

#### Features
- Automatically detects CSV type (Loss of Sale or Walk-in)
- Validates phone numbers (must be 10 digits)
- Filters out header rows and invalid data
- Returns detailed import results

#### Response
```json
{
  "success": true,
  "message": "CSV import completed",
  "summary": {
    "totalRows": 100,
    "successful": 95,
    "failed": 5
  },
  "results": [...],
  "errors": [...]
}
```

---

## 3. Data Mapping Process

### Mapping Flow

```
External Data (API/CSV)
    ↓
Data Mapper (dataMapper.js)
    ├─→ Clean phone numbers (10 digits only)
    ├─→ Parse dates (multiple formats)
    ├─→ Map field names (handle variations)
    ├─→ Set leadType (based on source)
    └─→ Validate required fields
    ↓
Lead Model (MongoDB)
    ├─→ Store in database
    └─→ Index for fast queries
    ↓
API Endpoints
    ├─→ GET /api/pages/leads (list)
    └─→ GET /api/pages/{page-type}/:id (details)
    ↓
UI Pages
```

### Lead Type Mapping

| Source | Lead Type | UI Page |
|--------|-----------|---------|
| Booking API | `bookingConfirmation` | Booking Confirmation Page |
| Rent-Out API | `rentOutFeedback` | Rent-Out Page |
| Loss of Sale CSV | `lossOfSale` | Loss of Sale Page |
| Walk-in CSV | `general` | General Leads (filterable) |
| Just Dial | `justDial` | Just Dial Page |
| Manual Entry | `general` | Add Lead Page |

---

## 4. Running All Imports

### Master Sync Script

Run all imports at once:

```bash
node sync/runAll.js
```

This will:
1. Sync Booking data from API
2. Sync Rent-Out data from API
3. Sync Store List from API
4. Import Walk-in data from CSV
5. Import Loss of Sale data from CSV

### Individual Sync Scripts

```bash
# API Syncs
node sync/api/sync_booking.js
node sync/api/sync_rentout.js
node sync/api/sync_storelist.js

# CSV Imports
node sync/csv/import_walkin.js
node sync/csv/import_lossofsale.js
```

---

## 5. Environment Configuration

### Required Environment Variables

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/telecaller

# External APIs
API_BASE_URL=https://rentalapi.rootments.live
API_TOKEN=your-api-token

# Booking API (optional overrides)
BOOKING_API_BASE_URL=https://rentalapi.rootments.live
BOOKING_API_KEY=your-booking-token
BOOKING_DATE_FROM=
BOOKING_DATE_TO=
BOOKING_MONTHS=

# Rent-Out API (optional overrides)
RENTOUT_API_BASE_URL=https://rentalapi.rootments.live
RENTOUT_API_KEY=your-rentout-token
RENTOUT_DATE_FROM=
RENTOUT_DATE_TO=
RENTOUT_MONTHS=

# Store API
STORE_API_KEY=your-store-token
STORE_USE_POST=false

# CSV File Paths
LOSSOFSALE_CSV_PATH=data/lossofsale.csv
WALKIN_CSV_PATH=data/walkin.csv
```

---

## 6. Data Validation

### Phone Number Validation
- Must be exactly 10 digits
- Non-numeric characters are removed
- Invalid numbers are skipped

### Date Parsing
- Supports multiple formats:
  - ISO 8601: `2024-01-15T00:00:00.000Z`
  - DD-MM-YYYY: `15-01-2024`
  - Standard Date parsing

### Required Fields
- `name` - Customer name (required)
- `phone` - Phone number, 10 digits (required)
- `store` - Store location (required)

### Optional Fields
- All other fields are optional
- Missing fields are set to `null` or default values

---

## 7. UI Data Flow

### Fetching Leads for UI

**List Leads:**
```bash
GET /api/pages/leads?leadType=bookingConfirmation
GET /api/pages/leads?leadType=rentOutFeedback
GET /api/pages/leads?leadType=lossOfSale
GET /api/pages/leads?leadType=justDial
```

**Get Lead Details:**
```bash
GET /api/pages/booking-confirmation/:id
GET /api/pages/rent-out/:id
GET /api/pages/loss-of-sale/:id
GET /api/pages/just-dial/:id
```

### Data Display Mapping

| Page | GET Fields Displayed |
|------|---------------------|
| **Loss of Sale** | lead_name, phone_number, visit_date, function_date, attended_by |
| **Rent-Out** | lead_name, phone_number, booking_number, return_date, attended_by, security_amount |
| **Booking Confirmation** | lead_name, phone_number, enquiry_date, function_date, booking_number, security_amount |
| **Just Dial** | lead_name, phone_number, enquiry_date, function_date |

---

## 8. Troubleshooting

### Common Issues

**1. No data imported**
- Check CSV file paths in `.env`
- Verify API URLs and tokens
- Check MongoDB connection
- Review console logs for errors

**2. Phone numbers invalid**
- Ensure phone numbers are 10 digits
- Check CSV format matches expected columns
- Verify phone number cleaning logic

**3. Dates not parsing**
- Check date format in CSV/API
- Verify date parsing function handles your format
- Check timezone settings

**4. Missing fields**
- Verify CSV column names match expected names
- Check API response structure
- Review data mapper for field variations

### Debug Mode

Enable detailed logging:
```env
NODE_ENV=development
```

Check logs for:
- API responses
- CSV parsing results
- Data mapping details
- MongoDB save results

---

## 9. Best Practices

1. **Regular Syncs**
   - Set up cron jobs for automatic syncing
   - Run imports daily or as needed
   - Monitor sync logs for errors

2. **Data Quality**
   - Validate CSV files before import
   - Check API responses for errors
   - Review imported data regularly

3. **Error Handling**
   - Monitor failed imports
   - Review error logs
   - Fix data issues at source

4. **Backup**
   - Backup MongoDB before large imports
   - Keep CSV files as backup
   - Document import schedules

---

## 10. Summary

### Import Sources → UI Pages

| Source | Import Method | Lead Type | UI Page |
|--------|---------------|-----------|---------|
| Booking API | External API | `bookingConfirmation` | Booking Confirmation |
| Rent-Out API | External API | `rentOutFeedback` | Rent-Out |
| Loss of Sale CSV | CSV File | `lossOfSale` | Loss of Sale |
| Walk-in CSV | CSV File | `general` | General Leads |
| Manual Entry | API POST | `general` | Add Lead |

### Quick Start

1. Configure environment variables
2. Place CSV files in `data/` directory
3. Run sync scripts: `node sync/runAll.js`
4. Access data via API endpoints
5. Display in UI pages

---

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review data mapper for field mapping logic
- Verify API/CSV formats match expected structure
- Test with sample data first

